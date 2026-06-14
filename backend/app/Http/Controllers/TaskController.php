<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\User;
use App\Models\Task;
use App\Models\Group;
use App\Models\Answer;
use App\Models\Log as ActionLog; // Переименовываем импорт чтобы избежать конфликта

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class TaskController extends Controller
{
    private function logAction($action, $method, $userId, $ip, $details = null)
    {
        if (!$userId) {
            $user = Auth::user();
            $userId = $user ? $user->id : null;
        }
        
        return ActionLog::create([
            'action' => $action,
            'method' => $method,
            'user_id' => $userId,
            'ip' => $ip,
            'details' => $details ? json_encode($details, JSON_UNESCAPED_UNICODE) : null,
            'created_at' => now()
        ]);
    }

    public function createTask(Request $request){
        $data = $request->validate([
            'group_id' => 'required|integer|exists:groups,id',
            'task_id' => 'required|integer|exists:files,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'deadline' => 'nullable|string',
            'user_id' => 'required|exists:users,id'
        ]);

        $task = Task::create($data);

        // Логируем создание задания
        $this->logAction(
            'Создание задания',
            'POST',
            Auth::user()->id ?? $data['user_id'],
            $request->ip(),
            [
                'task_id' => $task->id,
                'task_title' => $data['title'],
                'group_id' => $data['group_id'],
                'file_id' => $data['task_id'],
                'deadline' => $data['deadline'],
                'description' => $data['description'] ?? null
            ]
        );

        if(!empty($task)){
            return response()->json([
                'message' => 'успех',
                'task_id' => $task->id
            ], 200, [], JSON_UNESCAPED_UNICODE);
        }
        
        return response()->json([
            'message' => 'Ошибка при создании задания'
        ], 500);
    }

    public function allTasks(){
        $tasks = Task::with('user', 'answers', 'group.students')->get();
        return response()->json([
            'data' => $tasks,
        ],200,[], JSON_UNESCAPED_UNICODE);
    }

    public function getAns($id){
        $answer = Answer::with(['user', 'task.group', 'task.file', 'file'])->findOrFail($id);
        return response()->json([
            'success' => true,
            'data' => $answer,
        ],200,[], JSON_UNESCAPED_UNICODE);
    }
    
    public function getTask($id){
        $task = Task::with(['user', 'answers.user', 'answers.file', 'group', 'file'])->findOrFail($id);
        $answers = Answer::with(['user'])->where('task_id', '=', $id)->get();
        return response()->json([
            'data' => $task,
            'ans' => $answers
        ]);
    }

    public function setAnswer(Request $request){
        $data = $request->validate([
            'task_id' => 'required|exists:tasks,id',
            'answer_id' => 'required|exists:files,id',
            'students_comment' => 'nullable|string',
            'user_id' => 'required|exists:users,id'
        ]);

        $answer = Answer::create($data);
        
        // Получаем информацию о задании для лога
        $task = Task::find($data['task_id']);

        // Логируем отправку ответа
        $this->logAction(
            'Отправка ответа на задание',
            'POST',
            $data['user_id'],
            $request->ip(),
            [
                'answer_id' => $answer->id,
                'task_id' => $data['task_id'],
                'task_title' => $task ? $task->title : null,
                'file_id' => $data['answer_id'],
                'student_comment' => $data['students_comment'] ?? null
            ]
        );

        if(!empty($answer)){
            return response()->json([
                'message' => 'успех',
                'answer_id' => $answer->id
            ], 200, [], JSON_UNESCAPED_UNICODE);
        }
        
        return response()->json([
            'message' => 'Ошибка при отправке ответа'
        ], 500);
    }

    public function allAnswers(){
        $answers = Answer::with(['user', 'task', 'task.group', 'file'])->get();
        return response()->json([
            'data' => $answers,
        ]);
    }

    public function gradeTask(Request $request){
        $validated = $request->validate([
            'answer_id' => 'required|integer|exists:answers,id',
            'teachers_comment' => 'nullable|string',
            'mark' => 'nullable|string|in:н/а,2,3,4,5',
        ]);
        
        $answer = Answer::findOrFail($request->answer_id);
        
        // Сохраняем старые данные для лога
        $oldData = [
            'mark' => $answer->mark,
            'teachers_comment' => $answer->teachers_comment
        ];
        
        $answer->update([
            'teachers_comment' => $request->teachers_comment,
            'mark' => $request->mark,
        ]);
        
        // Логируем выставление оценки
        $this->logAction(
            'Выставление оценки за задание',
            'PUT',
            Auth::user()->id,
            $request->ip(),
            [
                'answer_id' => $answer->id,
                'task_id' => $answer->task_id,
                'student_id' => $answer->user_id,
                'old_mark' => $oldData['mark'],
                'new_mark' => $request->mark,
                'old_comment' => $oldData['teachers_comment'],
                'new_comment' => $request->teachers_comment
            ]
        );
        
        return response()->json([
            'message' => 'Оценка успешно изменена, чтобы изменения отобразились корректно советуем обновить страницу'
        ]);
    }
    
    public function getPerformance() {
    set_time_limit(300); 
    
    // Загружаем все группы с учениками и учителями
    $groups = Group::with(['students.user', 'teacher'])->get();
    
    // Загружаем все задания с ответами (без ограничения по количеству)
    $tasks = Task::with(['answers' => function($query) {
        $query->select(['id', 'user_id', 'mark', 'task_id', 'answer_id', 'created_at', 'updated_at'])
            ->orderBy('created_at', 'desc');
    }, 'answers.user'])->get();
    
    return response()->json([
        'groups' => $groups,
        'info' => $tasks,
        'success' => true,
    ]);
}

public function getPerformanceStudent($id)
{
    try {
        // Находим ВСЕ группы, в которых состоит студент
        $studentGroups = DB::table('students')
            ->where('student_id', '=', $id)
            ->get();
        
        if ($studentGroups->isEmpty()) {
            return response()->json([
                'data' => [],
                'success' => true,
                'message' => 'Студент не состоит в группах'
            ]);
        }
        
        // Получаем ID всех групп студента
        $groupIds = $studentGroups->pluck('group_id')->toArray();
        
        // Получаем все задания из всех групп студента
        $allTasks = DB::table('tasks')
            ->join('groups', 'tasks.group_id', '=', 'groups.id')
            ->whereIn('tasks.group_id', $groupIds)
            ->select([
                'tasks.id as task_id',
                'tasks.title as task_title',
                'tasks.group_id',
                'groups.subject as subject',
                'tasks.user_id as task_creator_id',
                'tasks.created_at as task_created_at',
            ])
            ->orderBy('tasks.created_at', 'asc')
            ->get();
        
        // Получаем ответы студента
        $studentAnswers = DB::table('answers')
            ->where('user_id', '=', $id)
            ->get()
            ->keyBy('task_id');
        
            $data = $allTasks->map(function($task) use ($studentAnswers, $id) {
            $answer = $studentAnswers->get($task->task_id);
            
            return [
                'group_id' => $task->group_id,
                'task_creator_id' => $task->task_creator_id,
                'student_id' => (int)$id,
                'task_id' => $task->task_id,
                'task_title' => $task->task_title,
                'task_created_at' => $task->task_created_at,
                'answer_id' => $answer ? $answer->id : null,
                'mark' => $answer ? $answer->mark : null,
                'subject' => $task->subject,
            ];
        });
        
        return response()->json([
            'data' => $data,
            'success' => true,
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => $e->getMessage(),
        ], 500);
    }
}  
    /**
     * Обновление задания
     */
    public function updateTask($id, Request $request)
    {
        $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'deadline' => 'sometimes|string',
            'task_id' => 'sometimes|integer|exists:files,id'
        ]);
        
        $task = Task::findOrFail($id);
        
        // Сохраняем старые данные
        $oldData = [
            'title' => $task->title,
            'description' => $task->description,
            'deadline' => $task->deadline,
            'file_id' => $task->task_id
        ];
        
        $task->update($request->only(['title', 'description', 'deadline', 'task_id']));
        
        // Логируем обновление задания
        $this->logAction(
            'Обновление задания',
            'PUT',
            Auth::user()->id,
            $request->ip(),
            [
                'task_id' => $task->id,
                'old_data' => $oldData,
                'new_data' => [
                    'title' => $request->input('title', $oldData['title']),
                    'description' => $request->input('description', $oldData['description']),
                    'deadline' => $request->input('deadline', $oldData['deadline']),
                    'file_id' => $request->input('task_id', $oldData['file_id'])
                ]
            ]
        );
        
        return response()->json([
            'success' => true,
            'message' => 'Задание успешно обновлено',
            'data' => $task
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }
    
    /**
     * Удаление задания
     */
    public function deleteTask($id, Request $request)
    {
        $task = Task::findOrFail($id);
        
        // Сохраняем данные для лога
        $taskData = [
            'task_id' => $task->id,
            'title' => $task->title,
            'group_id' => $task->group_id,
            'answers_count' => $task->answers()->count()
        ];
        
        // Удаляем связанные ответы
        Answer::where('task_id', $id)->delete();
        
        $task->delete();
        
        // Логируем удаление задания
        $this->logAction(
            'Удаление задания',
            'DELETE',
            Auth::user()->id,
            $request->ip(),
            $taskData
        );
        
        return response()->json([
            'success' => true,
            'message' => 'Задание успешно удалено'
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }
    
    /**
     * Обновление ответа
     */
    public function updateAnswer($id, Request $request)
    {
        $request->validate([
            'answer_id' => 'sometimes|exists:files,id',
            'students_comment' => 'nullable|string'
        ]);
        
        $answer = Answer::findOrFail($id);
        
        // Сохраняем старые данные
        $oldData = [
            'file_id' => $answer->answer_id,
            'comment' => $answer->students_comment
        ];
        
        $answer->update($request->only(['answer_id', 'students_comment']));
        
        // Логируем обновление ответа
        $this->logAction(
            'Обновление ответа на задание',
            'PUT',
            Auth::user()->id,
            $request->ip(),
            [
                'answer_id' => $answer->id,
                'task_id' => $answer->task_id,
                'old_file_id' => $oldData['file_id'],
                'new_file_id' => $request->input('answer_id', $oldData['file_id']),
                'old_comment' => $oldData['comment'],
                'new_comment' => $request->input('students_comment', $oldData['comment'])
            ]
        );
        
        return response()->json([
            'success' => true,
            'message' => 'Ответ успешно обновлен',
            'data' => $answer
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }
}
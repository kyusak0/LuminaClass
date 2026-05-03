<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\User;
use App\Models\Task;
use App\Models\Group;
use App\Models\Answer;

use Illuminate\Support\Facades\DB;

class TaskController extends Controller
{
    public function createTask(Request $request){
        $data = $request->validate([
            'group_id' => 'required|integer|exists:groups,id',
            'task_id' => 'required|integer|exists:files,id',
            'title' => 'required|string|max:255',
            'description' => 'string',
            'deadline' => 'required|string',
            'user_id' => 'required|exists:users,id'
        ]);

        $task = Task::create($data);

        if(!empty($task)){
            return response()->json([
                'message' => 'успех'
            ]);
        }
    }

    public function allTasks(){
        $tasks = Task::with('user', 'answers', 'group.students')->get();
        return response()->json([
            'data' => $tasks,
        ],200,[], JSON_UNESCAPED_UNICODE);
    }

    public function getAns($id){
        $answer = Answer::with(['user', 'task', 'task.group', 'task.file', 'file'])->findOrFail($id);
        return response()->json([
            'data' => $answer,
        ],200,[], JSON_UNESCAPED_UNICODE);
    }
    
    public function getTask($id){
        $task = Task::with(['user', 'answers', 'group', 'file'])->findOrFail($id);
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

        if(!empty($answer)){
            return response()->json([
                'message' => 'успех'
            ]);
        }
    }

    public function allAnswers(){
        $answers = Answer::with(['user', 'task', 'task.group', 'file'])->get();
        return response()->json([
            'data' => $answers,
        ]);
    }

    public function gradeTask(Request $request){

        $validated = $request->validate([
            'id' => 'required|integer|exists:answers,id',
            'teachers_comment' => 'nullable|string',
            'mark' => 'nullable|string|in:н/а,2,3,4,5',
        ]);
        
        $answer = Answer::findOrFail($request->id);
        
        $answer->update([
            'teachers_comment' => $request->teachers_comment,
            'mark' => $request->mark,
        ]);
        
        return response()->json([
            'message' => 'Оценка успешно изменена, чтобы изменения отобрализь корректно советуем обновить страницу'
        ]);
    }
    
    public function getPerformance() {
        set_time_limit(300); 
        
        $tasksPerfomance = Task::with([
            'answers'
            => function($query) {
            
                $query->select(['id', 'user_id', 'mark', 'task_id', 'answer_id', 'created_at'])
                    ->latest()
                    ->limit(50);
            }
        ])->get();

        $data = Task::with(['answers'])->get();

        $groups = Group::with(['students','students.user'])->get(); 
        
        return response()->json([
            'groups' => $groups,
            'info' => $data,
            'success' => true,
        ]);
    }

    public function getPerformanceStudent($id)
    {
        try {
            $studentGroup = DB::table('students')
                ->where('student_id', '=', $id)
                ->first();
            
            if (!$studentGroup) {
                // Если студент не состоит ни в одной группе, возвращаем пустой массив
                return response()->json([
                    'data' => [],
                    'success' => true,
                    'message' => 'Студент не состоит в группе'
                ]);
            }
            
            // Получаем задания только для группы студента
            $allTasks = DB::table('tasks')
                ->join('groups', 'tasks.group_id', '=', 'groups.id')
                ->where('tasks.group_id', '=', $studentGroup->group_id)
                ->select([
                    'tasks.id as task_id',
                    'tasks.title as task_title',
                    'tasks.group_id',
                    'groups.subject as subject',
                    'tasks.user_id as task_creator_id',
                ])
                ->get();
            
            // Получаем ответы студента
            $studentAnswers = DB::table('answers')
                ->where('user_id', '=', $id)
                ->get()
                ->keyBy('task_id');
            
            // Объединяем данные
            $data = $allTasks->map(function($task) use ($studentAnswers, $id) {
                $answer = $studentAnswers->get($task->task_id);
                
                return [
                    'group_id' => $task->group_id,
                    'task_creator_id' => $task->task_creator_id,
                    'student_id' => (int)$id,
                    'task_id' => $task->task_id,
                    'task_title' => $task->task_title,
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
   
}

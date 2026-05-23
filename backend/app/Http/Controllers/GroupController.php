<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

use App\Models\Group;
use App\Models\Tutor;
use App\Models\Log as ActionLog; // Добавляем модель для логирования действий

class GroupController extends Controller
{
    private function logAction($action, $method, $userId, $ip, $details = null)
    {
        if (!$userId) {
            $userId = auth()->id();
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

    public function allGroups(){
        $groups = Group::with(['students', 'teacher'])->get();

        return response()->json([
            'data' => $groups,
        ],200,[], JSON_UNESCAPED_UNICODE);
    } 

    public function createGroup(Request $request){
        $data = $request->validate([
            'name' => 'required|string',
            'subject' => 'required|string',
            'desc' => 'nullable|string',
            'tutor_id' => 'required|exists:users,id',
        ]);

        $group = Group::create([
            'name' => $data['name'],
            'subject' => $data['subject'],
            'desc' => $data['desc']
        ]);
        
        $tutor = new Tutor();
        $tutor->tutor_id = $data['tutor_id'];
        $tutor->supervised_group_id = $group->id;
        $tutor->save();

        if($group) {
            // Логируем создание группы
            $this->logAction(
                'Создание новой группы',
                'POST',
                auth()->id(),
                $request->ip(),
                [
                    'group_id' => $group->id,
                    'group_name' => $data['name'],
                    'subject' => $data['subject'],
                    'tutor_id' => $data['tutor_id'],
                    'description' => $data['desc'] ?? null
                ]
            );

            return response()->json([
                'message' => 'успешно',
                'group_id' => $group->id
            ]);
        }

        return response()->json([
            'message' => 'Ошибка',
        ], 500);
    }

    public function getGroupInfo($id){
        $group = Group::with(['students', 'teacher', 'tasks', 'teacher.user', 'students.user'])->findOrFail($id);
        return response()->json([
            'data' => $group,
        ],200,[], JSON_UNESCAPED_UNICODE);
    }

    public function deleteGroup($id, Request $request){
        $group = Group::findOrFail($id);
        
        // Сохраняем данные группы для лога
        $groupData = [
            'group_id' => $group->id,
            'group_name' => $group->name,
            'subject' => $group->subject,
            'students_count' => $group->students()->count()
        ];
        
        // Получаем информацию о преподавателе группы
        $tutor = Tutor::where('supervised_group_id', $id)->first();
        if ($tutor) {
            $groupData['tutor_id'] = $tutor->tutor_id;
        }
        
        $group->delete();
        
        // Логируем удаление группы
        $this->logAction(
            'Удаление группы',
            'DELETE',
            auth()->id(),
            $request->ip(),
            $groupData
        );
        
        return response()->json([
            'message' => 'Группа успешно удалена',
        ]);
    }

    public function getUserGroups($id, Request $request)
    {
        try {
            $groups = DB::table('groups')
                ->join('students', 'groups.id', '=', 'students.group_id')
                ->where('students.student_id', '=', $id)
                ->select('groups.id', 'groups.name', 'groups.subject', 'students.student_id')
                ->get();
            
            return response()->json([
                'data' => $groups,
                'success' => true
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Получить группы, которые ведет учитель
     */
    public function getTeacherGroups($id, Request $request)
    {
        try {
            $groups = DB::table('groups')
                ->join('tutors', 'groups.id', '=', 'tutors.supervised_group_id')
                ->where('tutors.tutor_id', '=', $id)
                ->select('groups.id', 'groups.name', 'groups.subject')
                ->get();
            
            return response()->json([
                'data' => $groups,
                'success' => true
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Обновление информации о группе
     */
    public function updateGroup($id, Request $request)
    {
        $request->validate([
            'name' => 'sometimes|string',
            'subject' => 'sometimes|string',
            'desc' => 'nullable|string',
            'tutor_id' => 'sometimes|exists:users,id'
        ]);
        
        $group = Group::findOrFail($id);
        
        // Сохраняем старые данные
        $oldData = [
            'name' => $group->name,
            'subject' => $group->subject,
            'desc' => $group->desc
        ];
        
        // Обновляем группу
        $group->update($request->only(['name', 'subject', 'desc']));
        
        // Обновляем преподавателя если указан
        $tutorUpdated = false;
        if ($request->has('tutor_id')) {
            $tutor = Tutor::where('supervised_group_id', $id)->first();
            if ($tutor) {
                $oldTutorId = $tutor->tutor_id;
                $tutor->tutor_id = $request->tutor_id;
                $tutor->save();
                $tutorUpdated = true;
            } else {
                // Создаем новую запись tutor если её не было
                $newTutor = new Tutor();
                $newTutor->tutor_id = $request->tutor_id;
                $newTutor->supervised_group_id = $group->id;
                $newTutor->save();
                $tutorUpdated = true;
            }
        }
        
        // Логируем обновление
        $this->logAction(
            'Обновление информации о группе',
            'PUT',
            auth()->id(),
            $request->ip(),
            [
                'group_id' => $group->id,
                'group_name' => $group->name,
                'old_data' => $oldData,
                'new_data' => [
                    'name' => $request->input('name', $oldData['name']),
                    'subject' => $request->input('subject', $oldData['subject']),
                    'desc' => $request->input('desc', $oldData['desc'])
                ],
                'tutor_updated' => $tutorUpdated,
                'new_tutor_id' => $request->input('tutor_id', null)
            ]
        );
        
        return response()->json([
            'success' => true,
            'message' => 'Группа успешно обновлена',
            'data' => $group->load(['students', 'teacher'])
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }
    
    /**
     * Добавление студента в группу
     */
    public function addStudentToGroup($groupId, $studentId, Request $request)
    {
        $group = Group::findOrFail($groupId);
        
        // Проверяем, не состоит ли уже студент в этой группе
        $exists = DB::table('students')
            ->where('group_id', $groupId)
            ->where('student_id', $studentId)
            ->exists();
            
        if ($exists) {
            return response()->json([
                'success' => false,
                'message' => 'Студент уже состоит в этой группе'
            ], 400);
        }
        
        // Добавляем студента
        DB::table('students')->insert([
            'group_id' => $groupId,
            'student_id' => $studentId,
            'created_at' => now(),
            'updated_at' => now()
        ]);
        
        // Логируем добавление студента
        $this->logAction(
            'Добавление студента в группу',
            'POST',
            auth()->id(),
            $request->ip(),
            [
                'group_id' => $groupId,
                'group_name' => $group->name,
                'student_id' => $studentId
            ]
        );
        
        return response()->json([
            'success' => true,
            'message' => 'Студент успешно добавлен в группу'
        ]);
    }
    
    /**
     * Удаление студента из группы
     */
    public function removeStudentFromGroup($groupId, $studentId, Request $request)
    {
        $group = Group::findOrFail($groupId);
        
        $deleted = DB::table('students')
            ->where('group_id', $groupId)
            ->where('student_id', $studentId)
            ->delete();
            
        if (!$deleted) {
            return response()->json([
                'success' => false,
                'message' => 'Студент не найден в этой группе'
            ], 404);
        }
        
        // Логируем удаление студента из группы
        $this->logAction(
            'Удаление студента из группы',
            'DELETE',
            auth()->id(),
            $request->ip(),
            [
                'group_id' => $groupId,
                'group_name' => $group->name,
                'student_id' => $studentId
            ]
        );
        
        return response()->json([
            'success' => true,
            'message' => 'Студент успешно удален из группы'
        ]);
    }
}
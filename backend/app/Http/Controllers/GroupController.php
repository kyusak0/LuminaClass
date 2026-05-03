<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

use App\Models\Group;
use App\Models\Tutor;

class GroupController extends Controller
{
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

        $group = Group::create(['name' => $data['name'],
            'subject'  => $data['subject'],
            'desc'  => $data['desc']
        ]);
        
        $tutor = new Tutor();
        $tutor->tutor_id = $data['tutor_id'];
        $tutor->supervised_group_id = $group->id;
        $tutor->save();

        if($group) {
            return response()->json([
                'message' => 'успешно',
            ]);
        }

        return response()->json([
            'message' => 'Ошибка',
        ]);
    }

    public function getGroupInfo($id){
        $group = Group::with(['students', 'teacher', 'tasks', 'teacher.user', 'students.user'])->findOrFail($id);
        return response()->json([
            'data' => $group,
        ],200,[], JSON_UNESCAPED_UNICODE);
    }

    public function deleteGroup($id){
        $group = Group::findOrFail($id)->delete();
        return response()->json([
            'message' => '',
        ]);
    }

    public function getUserGroups($id)
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
    public function getTeacherGroups($id)
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
}

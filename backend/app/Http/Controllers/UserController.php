<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;

use App\Models\User;
use App\Models\Booking;
use App\Models\Group;
use App\Models\Student;
use App\Models\Guardian;
use App\Models\Tutor;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    public function checkUser(Request $request){
        if(Auth::user()) {
            $user = Auth::user();
            return response()->json([
                'user' => $user
            ]);
        } else {
            return response()->json([
                'user' => null
            ], 401);
        }
    }

    public function createUser(Request $request){
        $credentials = $request->validate([
            'name' => 'required|regex:/^[\p{Cyrillic}\s]+$/u',
            'login'	 => 'required|min:6|unique:users',
            'password' => 'required|min:8',
            'role' => 'required',
        ]);
        
        $user = User::create($credentials);

        if($request->is('api/*')){
            return response()->json([
                'message'=> 'пользователь '. $credentials['name'] .' добавлен',
                'id' => $user->id,
            ]);
        }

        return back()->with('success', 'пользователь успешно добавлен');
    }

    public function createBooking(Request $request){
        $data = $request->validate([
            'name'=> ['nullable', 'string', 'max:50', 'regex:/^[\p{Cyrillic}\s]+$/u'],
            'surname'=> ['nullable', 'string', 'max:50', 'regex:/^[\p{Cyrillic}\s]+$/u'],
            'email'=> ['nullable', 'string', 'email', 'max:255', 'unique:users,email'],
            'tel'=> ['nullable', 'string', 'regex:/^\+7\d{10}$/'],
            'target' => ['required', 'string'],
            'messanger'=> ['required', 'string'],
        ],[
            // написать перевод для всех сообщений
        ]);

        $booking = Booking::create($data);

        return response()->json([
            'message' => $booking->id
        ], 201);
    }

    public function EditUserData(Request $request, $id){
        $data = $request->validate([
            'login' => 'required',
            'password' => 'required'
        ]);

        $user = User::findOrFail($id);
        $user->update($data);

        return response()->json(['message' => 'user updated successfully', 'user' => $user]);
    }

    public function login(Request $request){
        $request->validate([
            'login' => 'required',
            'password' => 'required',
        ]);

        if (Auth::attempt($request->only('login', 'password'))) {
            $user = Auth::user();
            
            $token = $user->createToken('auth-token')->plainTextToken;
            
            return response()->json([
                'user' => $user,
                'token' => $token,
                'message' => 'Успешная авторизация'
            ]);
        }

        throw ValidationException::withMessages([
            'login' => ['Неверные учетные данные'],
        ]);
    }

    public function user(Request $request)
    {
        return response()->json($request->user());
    }

    public function setAvatar($id, Request $request)
    {
        User::findOrFail($id)->update([
            'avatar' => $request->avatar,
        ]);

        return response()->json($request->url);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        
        return response()->json(['message' => 'Успешный выход']);
    }

    public function users(){
        $users = User::all();
        return response()->json([
            'data' => $users,
        ]);
    }

    public function funcrole(Request $request){
        if($request->role == 'student'){
            $request->validate([
                'role' => 'required|string|max:10',
                'id_owner' => 'required|exists:users,id|unique:students,student_id',
                'id_knave' => 'required|exists:groups,id',
            ]);

            $student = new Student();
            $student->student_id = $request->id_owner;
            $student->group_id = $request->id_knave;
            $student->save();
        }if($request->role == 'teacher'){
            $request->validate([
                'role' => 'required|string|max:10',
                'id_owner' => 'required|exists:users,id|unique:tutors,tutor_id',
                'id_knave' => 'required|exists:groups,id',
            ]);

            $tutor = new Tutor();
            $tutor->tutor_id = $request->id_owner;
            $tutor->supervised_group_id = $request->id_knave;
            $tutor->save();
        }if($request->role == 'parent'){
            $request->validate([
                'role' => 'required|string|max:10',
                'id_owner' => 'required|exists:users,id',
                'id_knave' => 'required|exists:users,id',
            ]);

            $guardian = new Guardian();
            $guardian->parent_id = $request->id_owner;
            $guardian->child_id = $request->id_knave;
            $guardian->save();
        }

        return response()->json([
            'message' => 'Пользователь успешно добавлен',
        ]);
    }

    public function removeStudent(Request $request){
        $student = Student::where([
                ['student_id', '=' ,$request->student_id],
                ['group_id', '=' ,$request->group_id,]
            ])->first();

        $student->delete();

        return response()->json([
            'data' => $student,
        ]);
    }
    
    public function getUserInfo($id){
        $user = User::with(['files', 'groups', 'tasks', 'answers', 'tutors', 'guardianships'])->findOrFail($id);
        return response()->json([
            'message' => 'Пользователь получен',
            'data' => $user,
        ]);
    }
}

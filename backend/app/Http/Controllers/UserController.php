<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;

use App\Models\User;
use App\Models\Booking;
use App\Models\Group;
use App\Models\Student;
use App\Models\Guardian;
use App\Models\Tutor;
use App\Models\Log;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    public function checkUser(Request $request){
        if(Auth::user()) {
            $user = Auth::user();
            
            Log::create([
                'action' => 'checking user',
                'user_id' => $user->id,
                'ip' => $request->ip()
            ]);
            
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
        ], [
            'name.required' => 'Имя обязательно',
            'name.regex' => 'Имя должно содержать только кириллицу',
            'login.required' => 'Логин обязателен',
            'login.min' => 'Логин должен быть не менее 6 символов',
            'login.unique' => 'Логин уже занят',
            'password.required' => 'Пароль обязателен',
            'password.min' => 'Пароль должен быть не менее 8 символов',
            'role.required' => 'Роль обязательна',
        ]);
        
        $user = User::create($credentials);

        Log::create([
            'action' => 'creating User',
            'user_id' => Auth::user()->id,
            'ip' => $request->ip()
        ]);

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
        ], [
            'name.max' => 'Имя не более 50 символов',
            'name.regex' => 'Имя только кириллица',
            'surname.max' => 'Фамилия не более 50 символов',
            'surname.regex' => 'Фамилия только кириллица',
            'email.email' => 'Некорректный email',
            'email.unique' => 'Email уже используется',
            'tel.regex' => 'Телефон в формате +7XXXXXXXXXX',
            'target.required' => 'Цель обязательна',
            'messanger.required' => 'Мессенджер обязателен',
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
        ], [
            'login.required' => 'Логин обязателен',
            'password.required' => 'Пароль обязателен',
        ]);

        $user = User::findOrFail($id);
        $user->update($data);
        
        Log::create([
            'action' => 'editing User data',
            'user_id' => Auth::user()->id,
            'ip' => $request->ip()
        ]);

        return response()->json(['message' => 'user updated successfully', 'user' => $user]);
    }

    public function login(Request $request){
        $request->validate([
            'login' => 'required',
            'password' => 'required',
        ], [
            'login.required' => 'Логин обязателен',
            'password.required' => 'Пароль обязателен',
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

    public function users(Request $request){
        $users = User::all();
        
        return response()->json([
            'data' => $users,
        ]);
    }

    public function funcrole(Request $request){
        if($request->role == 'student'){
            $request->validate([
                'role' => 'required|string|max:10',
                'id_owner' => 'required|exists:users,id',
                'id_knave' => 'required|exists:groups,id',
            ], [
                'role.required' => 'Роль обязательна',
                'id_owner.required' => 'ID пользователя обязателен',
                'id_owner.exists' => 'Пользователь не найден',
                'id_knave.required' => 'ID группы обязателен',
                'id_knave.exists' => 'Группа не найдена',
            ]);

            $student = new Student();
            $student->student_id = $request->id_owner;
            $student->group_id = $request->id_knave;
            $student->save();
            
            Log::create([
                'action' => 'adding student role',
                'user_id' => Auth::user()->id,
                'ip' => $request->ip()
            ]);
        }
        
        if($request->role == 'teacher'){
            $request->validate([
                'role' => 'required|string|max:10',
                'id_owner' => 'required|exists:users,id',
                'id_knave' => 'required|exists:groups,id',
            ], [
                'role.required' => 'Роль обязательна',
                'id_owner.required' => 'ID пользователя обязателен',
                'id_owner.exists' => 'Пользователь не найден',
                'id_knave.required' => 'ID группы обязателен',
                'id_knave.exists' => 'Группа не найдена',
            ]);

            $tutor = new Tutor();
            $tutor->tutor_id = $request->id_owner;
            $tutor->supervised_group_id = $request->id_knave;
            $tutor->save();
            
            Log::create([
                'action' => 'adding teacher role',
                'user_id' => Auth::user()->id,
                'ip' => $request->ip()
            ]);
        }
        
        if($request->role == 'parent'){
            $request->validate([
                'role' => 'required|string|max:10',
                'id_owner' => 'required|exists:users,id',
                'id_knave' => 'required|exists:users,id',
            ], [
                'role.required' => 'Роль обязательна',
                'id_owner.required' => 'ID родителя обязателен',
                'id_owner.exists' => 'Родитель не найден',
                'id_knave.required' => 'ID ребенка обязателен',
                'id_knave.exists' => 'Ребенок не найден',
            ]);

            $guardian = new Guardian();
            $guardian->parent_id = $request->id_owner;
            $guardian->child_id = $request->id_knave;
            $guardian->save();
            
            Log::create([
                'action' => 'adding parent role',
                'user_id' => Auth::user()->id,
                'ip' => $request->ip()
            ]);
        }

        return response()->json([
            'message' => 'Пользователь успешно добавлен',
        ]);
    }

    public function removeStudent(Request $request){
        $request->validate([
            'student_id' => 'required|exists:users,id',
            'group_id' => 'required|exists:groups,id',
        ], [
            'student_id.required' => 'ID студента обязателен',
            'student_id.exists' => 'Студент не найден',
            'group_id.required' => 'ID группы обязателен',
            'group_id.exists' => 'Группа не найдена',
        ]);
        
        $student = Student::where([
                ['student_id', '=' ,$request->student_id],
                ['group_id', '=' ,$request->group_id,]
            ])->first();
            
        if(!$student) {
            return response()->json([
                'message' => 'Связь студента с группой не найдена'
            ], 404);
        }

        $student->delete();
        
        Log::create([
            'action' => 'removing student from group',
            'user_id' => Auth::user()->id,
            'ip' => $request->ip()
        ]);

        return response()->json([
            'data' => $student,
        ]);
    }
    
    public function getUserInfo($id, Request $request){
        $user = User::with(['files', 'groups', 'tasks', 'answers', 'tutors', 'guardianships'])->findOrFail($id);
        
        return response()->json([
            'message' => 'Пользователь получен',
            'data' => $user,
        ]);
    }
}
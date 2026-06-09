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
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{

    private function logAction($action, $method, $userId, $ip, $details = null)
    {
        return Log::create([
            'action' => $action,
            'method' => $method,
            'user_id' => $userId,
            'ip' => $ip,
            'details' => $details ? json_encode($details, JSON_UNESCAPED_UNICODE) : null,
            'created_at' => now()
        ]);
    }

    // Блокировка пользователя
    public function blockUser($id, Request $request)
    {
        try {
            $userToBlock = User::findOrFail($id);
            $currentUser = Auth::user();

            // Проверки безопасности
            if ($currentUser->role !== 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'У вас нет прав для блокировки пользователей'
                ], 403);
            }

            if ($userToBlock->role === 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Нельзя заблокировать администратора'
                ], 403);
            }

            if ($userToBlock->id === $currentUser->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Нельзя заблокировать самого себя'
                ], 403);
            }

            if ($userToBlock->isBlocked()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Пользователь уже заблокирован'
                ], 400);
            }

            // Блокируем пользователя
            $userToBlock->block();

            // Логируем действие
            $this->logAction(
                'Блокировка пользователя',
                'POST',
                $currentUser->id,
                $request->ip(),
                [
                    'blocked_user_id' => $userToBlock->id,
                    'blocked_user_name' => $userToBlock->name,
                    'blocked_user_role' => $userToBlock->role,
                    'blocked_at' => $userToBlock->blocked_at
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Пользователь успешно заблокирован',
                'user' => [
                    'id' => $userToBlock->id,
                    'name' => $userToBlock->name,
                    'is_blocked' => $userToBlock->is_blocked,
                    'blocked_at' => $userToBlock->blocked_at
                ]
            ], 200, [], JSON_UNESCAPED_UNICODE);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка при блокировке: ' . $e->getMessage()
            ], 500);
        }
    }

    // Разблокировка пользователя
    public function unblockUser($id, Request $request)
    {
        try {
            $userToUnblock = User::findOrFail($id);
            $currentUser = Auth::user();

            // Проверки безопасности
            if ($currentUser->role !== 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'У вас нет прав для разблокировки пользователей'
                ], 403);
            }

            if (!$userToUnblock->isBlocked()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Пользователь не заблокирован'
                ], 400);
            }

            // Разблокируем пользователя
            $userToUnblock->unblock();

            // Логируем действие
            $this->logAction(
                'Разблокировка пользователя',
                'POST',
                $currentUser->id,
                $request->ip(),
                [
                    'unblocked_user_id' => $userToUnblock->id,
                    'unblocked_user_name' => $userToUnblock->name,
                    'unblocked_at' => now()
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Пользователь успешно разблокирован',
                'user' => [
                    'id' => $userToUnblock->id,
                    'name' => $userToUnblock->name,
                    'is_blocked' => $userToUnblock->is_blocked,
                    'blocked_at' => null
                ]
            ], 200, [], JSON_UNESCAPED_UNICODE);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка при разблокировке: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function checkUser(Request $request){
        if(Auth::user()) {
            $user = Auth::user();
            
            $this->logAction(
                'Проверка пользователя',
                'GET',
                $user->id,
                $request->ip()
            );
            
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

        $this->logAction(
            'Создание пользователя',
            'POST',
            Auth::user()->id,
            $request->ip(),
            [
                'created_user_id' => $user->id,
                'created_user_name' => $user->name,
                'created_user_role' => $user->role
            ]
        );

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
            'email'=> ['sometimes', 'string', 'email', 'max:255'],
            'tel'=> ['sometimes', 'string', 'regex:/^\+7\d{10}$/'],
            'target' => ['required', 'string'],
            'messanger'=> ['required', 'string'],
        ], [
            'name.max' => 'Имя не более 50 символов',
            'name.regex' => 'Имя только кириллица',
            'surname.max' => 'Фамилия не более 50 символов',
            'surname.regex' => 'Фамилия только кириллица',
            'email.email' => 'Некорректный email',
            'tel.regex' => 'Телефон в формате +7XXXXXXXXXX',
            'target.required' => 'Цель обязательна',
            'messanger.required' => 'Мессенджер обязателен',
        ]);

        $booking = Booking::create($data);

        // Для бронирования логируем, если пользователь авторизован
        if (Auth::check()) {
            $this->logAction(
                'Создание заявки',
                'POST',
                Auth::user()->id,
                $request->ip(),
                [
                    'booking_id' => $booking->id,
                    'booking_data' => $data
                ]
            );
        }

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
        $oldData = [
            'old_login' => $user->login,
            'old_password_changed' => !empty($data['password'])
        ];
        
        $user->update($data);

        return response()->json(['message' => 'user updated successfully', 'user' => $user]);
    }

    public function login(Request $request){
        $request->validate([
            'login' => 'required|min:3',
            'password' => 'required',
        ], [
            'login.required' => 'Логин обязателен',
            'login.min' => '<3',
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
        
        if (Auth::check()) {
            $this->logAction(
                'Изменение аватара',
                'POST',
                Auth::user()->id,
                $request->ip(),
                [
                    'user_id' => $id,
                    'avatar_url' => $request->avatar
                ]
            );
        }

        return response()->json($request->url);
    }

    public function logout(Request $request)
    {   
        $user = $request->user();
        
        if ($user) {
            $user->currentAccessToken()->delete();
        }
        
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
            
            $this->logAction(
                'Добавление роли студента',
                'POST',
                Auth::user()->id,
                $request->ip(),
                [
                    'student_id' => $request->id_owner,
                    'group_id' => $request->id_knave
                ]
            );
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
            
            $this->logAction(
                'Добавление роли учителя',
                'POST',
                Auth::user()->id,
                $request->ip(),
                [
                    'teacher_id' => $request->id_owner,
                    'group_id' => $request->id_knave
                ]
            );
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
            
            $this->logAction(
                'Добавление роли родителя',
                'POST',
                Auth::user()->id,
                $request->ip(),
                [
                    'parent_id' => $request->id_owner,
                    'child_id' => $request->id_knave
                ]
            );
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
        
        $this->logAction(
            'Удаление студента из группы',
            'DELETE',
            Auth::user()->id,
            $request->ip(),
            [
                'student_id' => $request->student_id,
                'group_id' => $request->group_id,
                'deleted_relation_id' => $student->id
            ]
        );

        return response()->json([
            'data' => $student,
        ]);
    }
    
    public function getUserInfo($id, Request $request){
        $user = User::with(['files', 'groups', 'tasks', 'answers', 'tutors', 'guardianships'])->findOrFail($id);
        
        $this->logAction(
            'Получение информации о пользователе',
            'GET',
            Auth::check() ? Auth::user()->id : null,
            $request->ip(),
            [
                'requested_user_id' => $id,
                'requested_user_name' => $user->name
            ]
        );
        
        return response()->json([
            'message' => 'Пользователь получен',
            'data' => $user,
        ]);
    }

    public function getUsers(Request $request)
    {
        try {
            $users = User::query()
                ->select('id', 'name', 'login', 'role', 'is_blocked', 'blocked_at', 'created_at')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $users->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'login' => $user->login,
                        'role' => $user->role,
                        'is_blocked' => $user->is_blocked,
                        'blocked_at' => $user->blocked_at,
                        'status' => $user->is_blocked ? 'заблокирован' : 'активен',
                        'can_block' => $user->role !== 'admin' && $user->id !== Auth::id()
                    ];
                })
            ], 200, [], JSON_UNESCAPED_UNICODE);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // Получить только заблокированных пользователей
    public function getBlockedUsers(Request $request)
    {
        try {
            $blockedUsers = User::blocked()->get();
            
            return response()->json([
                'success' => true,
                'data' => $blockedUsers
            ], 200, [], JSON_UNESCAPED_UNICODE);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // Получить только активных пользователей
    public function getActiveUsers(Request $request)
    {
        try {
            $activeUsers = User::active()->get();
            
            return response()->json([
                'success' => true,
                'data' => $activeUsers
            ], 200, [], JSON_UNESCAPED_UNICODE);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Booking;
use App\Models\User;

class BookingController extends Controller
{
    public function getBookings(){
        $bookings = Booking::all();
        return response()->json([
            'data' => $bookings,
        ]);
    }

    public function getBookingInfo($id){
        $booking = Booking::findOrFail($id);
        return response()->json([
            'data' => $booking,
        ]);
    }
    
    public function editBooking(Request $request){
        $validated = $request->validate([
        'id' => 'required|integer|exists:bookings,id',
        'status' => 'required|string',
    ]);
    
    $updated = Booking::where('id', $validated['id'])
        ->update(['status' => $validated['status']]);
    
    if ($updated) {
        return response()->json([
            'success' => true,
            'message' => 'Статус заявки успешно изменен',
        ]);
    }
    
    return response()->json([
        'success' => false,
        'message' => 'Не удалось обновить заявку',
    ], 500);
    }

    public function resetPassword(Request $request) {
    try {
        // Валидация входных данных
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:6'
        ]);

        // Ищем пользователя по email (логин в вашем случае)
        $user = User::where('login', $request->email)->first();
        
        // Проверяем, найден ли пользователь
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Пользователь с таким email не найден'
            ], 404);
        }
        
        // Обновляем пароль
        $user->password = bcrypt($request->password);
        $user->save();
        
        return response()->json([
            'success' => true,
            'message' => 'Пароль успешно обновлен'
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Ошибка при обновлении пароля: ' . $e->getMessage()
        ], 500);
    }
}

    public function updateUser(Request $request) {
    try {
        // Валидация входных данных
        $validated = $request->validate([
            'email' => 'required|email',
            'login' => 'required|string',
            'password' => 'required|string|min:6',
            'role' => 'required|string'
        ]);
        
        // Ищем пользователя по email
        $user = User::where('login', $request->email)->first();
        
        // Проверяем, найден ли пользователь
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Пользователь с таким email не найден'
            ], 404);
        }
        
        // Обновляем данные пользователя
        $user->login = $request->login;
        $user->password = bcrypt($request->password);
        $user->role = $request->role;
        $user->save();
        
        return response()->json([
            'success' => true,
            'message' => 'Данные пользователя успешно обновлены',
            'user' => $user
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Ошибка при обновлении данных: ' . $e->getMessage()
        ], 500);
    }
}
}

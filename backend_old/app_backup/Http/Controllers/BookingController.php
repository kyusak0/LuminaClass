<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Booking;
use App\Models\User;
use App\Models\Log;

class BookingController extends Controller
{
    private function logAction($action, $method, $userId, $ip, $details = null)
    {
        return Log::create([
            'action' => $action,
            'method' => $method,
            'user_id' => $userId,
            'ip' => $ip,
            'details' => $details ? json_encode($details) : null,
            'created_at' => now()
        ]);
    }

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
        
        // Получаем старый статус до обновления
        $oldBooking = Booking::find($validated['id']);
        $oldStatus = $oldBooking ? $oldBooking->status : null;
        
        $updated = Booking::where('id', $validated['id'])
            ->update(['status' => $validated['status']]);
        
        if ($updated) {
            // Логируем успешное обновление
            $this->logAction(
                'Изменение статуса заявки',
                'PUT',
                auth()->id(),
                $request->ip(),
                [
                    'booking_id' => $validated['id'],
                    'old_status' => $oldStatus,
                    'new_status' => $validated['status']
                ]
            );
            
            return response()->json([
                'success' => true,
                'message' => 'Статус заявки успешно изменен',
            ]);
        }
        
        // Логируем ошибку
        $this->logAction(
            'Ошибка изменения статуса заявки',
            'PUT',
            auth()->id(),
            $request->ip(),
            [
                'booking_id' => $validated['id'],
                'status' => $validated['status'],
                'error' => 'Не удалось обновить заявку'
            ]
        );
        
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
                // Логируем неудачную попытку
                $this->logAction(
                    'Попытка сброса пароля (пользователь не найден)',
                    'POST',
                    auth()->id(),
                    $request->ip(),
                    ['email' => $request->email]
                );
                
                return response()->json([
                    'success' => false,
                    'message' => 'Пользователь с таким email не найден'
                ], 404);
            }
            
            // Обновляем пароль
            $user->password = bcrypt($request->password);
            $user->save();
            
            // Логируем успешный сброс пароля
            $this->logAction(
                'Сброс пароля пользователя',
                'POST',
                auth()->id(),
                $request->ip(),
                [
                    'target_user_id' => $user->id,
                    'target_user_login' => $user->login
                ]
            );
            
            return response()->json([
                'success' => true,
                'message' => 'Пароль успешно обновлен'
            ]);
            
        } catch (\Exception $e) {
            // Логируем ошибку
            $this->logAction(
                'Ошибка при сбросе пароля',
                'POST',
                auth()->id(),
                $request->ip(),
                [
                    'email' => $request->email,
                    'error' => $e->getMessage()
                ]
            );
            
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
                // Логируем неудачную попытку
                $this->logAction(
                    'Попытка обновления пользователя (не найден)',
                    'PUT',
                    auth()->id(),
                    $request->ip(),
                    ['email' => $request->email]
                );
                
                return response()->json([
                    'success' => false,
                    'message' => 'Пользователь с таким email не найден'
                ], 404);
            }
            
            // Сохраняем старые данные для лога
            $oldData = [
                'login' => $user->login,
                'role' => $user->role
            ];
            
            // Обновляем данные пользователя
            $user->login = $request->login;
            $user->password = bcrypt($request->password);
            $user->role = $request->role;
            $user->save();
            
            // Логируем успешное обновление
            $this->logAction(
                'Обновление данных пользователя',
                'PUT',
                auth()->id(),
                $request->ip(),
                [
                    'target_user_id' => $user->id,
                    'old_data' => $oldData,
                    'new_data' => [
                        'login' => $request->login,
                        'role' => $request->role
                    ]
                ]
            );
            
            return response()->json([
                'success' => true,
                'message' => 'Данные пользователя успешно обновлены',
                'user' => $user
            ]);
            
        } catch (\Exception $e) {
            // Логируем ошибку
            $this->logAction(
                'Ошибка при обновлении данных пользователя',
                'PUT',
                auth()->id(),
                $request->ip(),
                [
                    'email' => $request->email,
                    'error' => $e->getMessage()
                ]
            );
            
            return response()->json([
                'success' => false,
                'message' => 'Ошибка при обновлении данных: ' . $e->getMessage()
            ], 500);
        }
    }
}
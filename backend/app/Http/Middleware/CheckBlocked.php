<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CheckBlocked
{
    public function handle(Request $request, Closure $next)
    {
        $user = Auth::user();
        
        if ($user && $user->is_blocked) {
            // Возвращаем понятную ошибку, а не редирект
            return response()->json([
                'success' => false,
                'message' => 'Ваш аккаунт заблокирован. Обратитесь к администратору.',
                'blocked_at' => $user->blocked_at,
                'is_blocked' => true
            ], 403);
        }
        
        return $next($request);
    }
}
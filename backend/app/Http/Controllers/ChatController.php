<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Group;
use App\Models\GroupMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ChatController extends Controller
{
    // Простой общий чат
    public function send(Request $request)
    {
        $user = $request->user();
        
        $messageData = [
            'id' => uniqid(),
            'user_id' => $user->id,
            'user_name' => $user->name ?? $user->email,
            'message' => $request->input('message'),
            'channel' => $request->input('channel', 'general'),
            'created_at' => now()->toISOString(),
        ];
        
        return response()->json([
            'success' => true,
            'message' => $messageData
        ]);
    }

    public function historyChat($channel)
    {
        return response()->json([
            'success' => true,
            'messages' => []
        ]);
    }

    // Групповой чат
    public function groupChatSend($groupId, Request $request)
    {
        $user = $request->user();
        
        // Проверка доступа
        $group = Group::findOrFail($groupId);
        $isStudent = $group->students()->where('student_id', $user->id)->exists();
        $isTeacher = $group->teacher && $group->teacher->tutor_id === $user->id;
        
        if (!$isStudent && !$isTeacher && Auth::user()->role !== 'admin') {
            return response()->json([
                'success' => false,
                'error' => 'Access denied'
            ], 403);
        }
        
        $request->validate([
            'message' => 'required|string|max:1000'
        ]);
        
        // ✅ Сохраняем сообщение без broadcast
        $message = GroupMessage::create([
            'group_id' => $groupId,
            'user_id' => $user->id,
            'message' => $request->message
        ]);
        
        $message->load('user');
        
        return response()->json([
            'success' => true,
            'message' => [
                'id' => $message->id,
                'group_id' => $message->group_id,
                'user_id' => $message->user_id,
                'user_name' => $message->user->name ?? $message->user->email,
                'message' => $message->message,
                'created_at' => $message->created_at->toISOString(),
            ]
        ]);
    }

    public function showHistoryGroup($groupId, Request $request)
    {
        $user = $request->user();
        
        // Проверка доступа
        $group = Group::findOrFail($groupId);
        $isStudent = $group->students()->where('student_id', $user->id)->exists();
        $isTeacher = $group->teacher && $group->teacher->tutor_id === $user->id;
        
        if (!$isStudent && !$isTeacher && Auth::user()->role !== 'admin') {
            return response()->json([
                'success' => false,
                'error' => 'Access denied'
            ], 403);
        }
        
        $messages = GroupMessage::with('user')
            ->where('group_id', $groupId)
            ->orderBy('created_at', 'asc')
            ->limit(100)
            ->get()
            ->map(function ($message) {
                return [
                    'id' => $message->id,
                    'group_id' => $message->group_id,
                    'user_id' => $message->user_id,
                    'user_name' => $message->user->name ?? $message->user->email,
                    'message' => $message->message,
                    'created_at' => $message->created_at->toISOString(),
                ];
            });
        
        return response()->json([
            'success' => true,
            'messages' => $messages,
            'group' => [
                'id' => $group->id,
                'name' => $group->name,
                'subject' => $group->subject
            ]
        ]);
    }
}
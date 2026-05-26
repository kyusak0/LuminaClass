<?php

namespace App\Http\Controllers;

use App\Events\ChatMessageEvent;
use App\Events\GroupChatEvent;
use App\Http\Controllers\Controller;
use App\Models\Group;
use App\Models\GroupMessage;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function send (Request $request) {
        $user = $request->user();
        
        $messageData = [
            'id' => uniqid(),
            'user_id' => $user->id,
            'user_name' => $user->name ?? $user->email,
            'message' => $request->input('message'),
            'channel' => $request->input('channel', 'general'),
            'created_at' => now()->toISOString(),
        ];
        
        broadcast(new ChatMessageEvent($messageData['channel'], $messageData));
        
        return response()->json([
            'status' => 'sent',
            'message' => $messageData
        ]);
    }
    public function historyChat ($channel) {
    
        return response()->json([
            'messages' => [] 
        ]);
    
    }

    public function groupChatSend ($groupId, Request $request) {
        $user = $request->user();
        
        // Проверяем, имеет ли пользователь доступ к группе
        $group = Group::findOrFail($groupId);
        
        // Проверка: студент ли он в этой группе или преподаватель
        $isStudent = $group->students()->where('user_id', $user->id)->exists();
        $isTeacher = $group->teacher && $group->teacher->user_id === $user->id;
        
        if (!$isStudent && !$isTeacher) {
            return response()->json(['error' => 'Access denied'], 403);
        }
        
        $request->validate([
            'message' => 'required|string|max:1000'
        ]);
        
        // Сохраняем сообщение
        $message = GroupMessage::create([
            'group_id' => $groupId,
            'user_id' => $user->id,
            'message' => $request->message
        ]);
        
        $message->load('user');
        
        // Отправляем через WebSocket
        broadcast(new GroupChatEvent($message));
        
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

    public function showHistoryGroup ($groupId, Request $request) {
        $user = $request->user();
        
        // Проверка доступа
        $group = Group::findOrFail($groupId);
        $isStudent = $group->students()->where('user_id', $user->id)->exists();
        $isTeacher = $group->teacher && $group->teacher->user_id === $user->id;
        
        if (!$isStudent && !$isTeacher) {
            return response()->json(['error' => 'Access denied'], 403);
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

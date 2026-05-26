<?php

namespace App\Events;

use App\Models\GroupMessage;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class GroupChatEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $messageData;

    public function __construct(GroupMessage $message)
    {
        $this->messageData = [
            'id' => $message->id,
            'group_id' => $message->group_id,
            'user_id' => $message->user_id,
            'user_name' => $message->user->name ?? $message->user->email,
            'message' => $message->message,
            'created_at' => $message->created_at->toISOString(),
        ];
    }

    public function broadcastOn(): Channel
    {
        // Приватный канал для группы (только участники)
        return new Channel("group.{$this->messageData['group_id']}.chat");
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }
}
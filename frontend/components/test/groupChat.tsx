'use client';

import { useState, useRef, useEffect } from 'react';
import { useGroupChat } from '@/hooks/groupChatHook';
import { useAuth } from '@/context/authContext';

interface GroupChatProps {
    groupId: number;
    className?: string;
}

export default function GroupChat({ groupId, className = '' }: GroupChatProps) {
    const { messages, groupInfo, sendMessage, isConnected, isSending, isLoading } = useGroupChat(groupId);
    const { user } = useAuth() || {};
    const [inputMessage, setInputMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!inputMessage.trim() || isSending) return;
        
        const success = await sendMessage(inputMessage);
        if (success) {
            setInputMessage('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Loading group chat...</div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full bg-white rounded-lg shadow ${className}`}>
            {/* Header с информацией о группе */}
            <div className="flex items-center justify-between p-4 border-b">
                <div>
                    <h2 className="text-lg font-semibold">
                        {groupInfo?.name || 'Group Chat'}
                    </h2>
                    {groupInfo && (
                        <p className="text-sm text-gray-500">
                            Subject: {groupInfo.subject}
                        </p>
                    )}
                    <div className="flex items-center mt-1">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-xs text-gray-500 ml-2">
                            {isConnected ? 'Connected' : 'Disconnected'} | {messages.length} messages
                        </span>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10">
                        No messages yet. Start the conversation!
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[70%] rounded-lg p-3 ${
                                    msg.user_id === user?.id
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-800'
                                }`}
                            >
                                {msg.user_id !== user?.id && (
                                    <div className="text-xs font-bold mb-1">
                                        {msg.user_name}
                                    </div>
                                )}
                                <div className="break-words">{msg.message}</div>
                                <div className="text-xs opacity-75 mt-1">
                                    {new Date(msg.created_at).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t p-4">
                <div className="flex gap-2">
                    <textarea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        rows={1}
                        className="flex-1 p-2 border rounded-lg resize-none focus:outline-none focus:border-blue-500"
                        disabled={!isConnected || isSending}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!isConnected || !inputMessage.trim() || isSending}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    >
                        {isSending ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </div>
        </div>
    );
}
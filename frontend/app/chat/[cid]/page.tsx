'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, FormEvent } from 'react';
import { useAuth } from '@/context/authContext';
import MainLayout from '@/layouts/MainLayout';
import axiosInstance from '@/lib/axios.config';
import {
    ArrowLeft, Send, Loader2, MessageSquare,
    Clock, CheckCheck, BookOpen, ShieldAlert
} from 'lucide-react';
import Loader from '@/components/loader/Loader';

interface Message {
    id: number | string;
    group_id: number;
    user_id: number;
    user_name: string;
    message: string;
    created_at: string;
}

export default function GroupChatPage() {
    const { cid } = useParams();
    const router = useRouter();
    const auth = useAuth();
    const { user, token } = auth || {};
    const groupId = parseInt(cid as string) || 0;

    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [groupName, setGroupName] = useState('');
    const [lastMessageId, setLastMessageId] = useState<number>(0);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null); // ✅ Добавляем этот ref
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const blockedRef = useRef(false);

    // Загрузка истории
    useEffect(() => {
        if (user && groupId) {
            loadHistory();
            startPolling();
        }

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [groupId, user]);

    const loadHistory = async () => {
        if (blockedRef.current) return;

        setLoading(true);
        setError(null);

        try {
            const response = await axiosInstance.get(`/groups/${groupId}/chat/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                const msgs = response.data.messages || [];
                setMessages(msgs);
                setGroupName(response.data.group?.name || '');

                if (msgs.length > 0) {
                    const lastMsg = msgs[msgs.length - 1];
                    setLastMessageId(typeof lastMsg.id === 'number' ? lastMsg.id : 0);
                }

                setTimeout(scrollToBottom, 100);
            }
        } catch (err: any) {
            if (err.response?.status === 403) {
                setError('У вас нет доступа к этой группе');
                blockedRef.current = true;
                stopPolling();
            } else if (err.response?.status === 404) {
                setError('Группа не найдена');
                blockedRef.current = true;
                stopPolling();
            } else {
                setError('Не удалось загрузить сообщения');
            }
        } finally {
            setLoading(false);
        }
    };

    // ✅ Polling для новых сообщений
    const startPolling = () => {
        stopPolling();
        if (blockedRef.current) return;

        pollingRef.current = setInterval(async () => {
            if (blockedRef.current) return;

            try {
                const response = await axiosInstance.get(`/groups/${groupId}/chat/history`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.data.success) {
                    const newMessages = response.data.messages || [];

                    // Обновляем только если есть новые сообщения
                    if (newMessages.length > messages.length) {
                        setMessages(newMessages);

                        const lastMsg = newMessages[newMessages.length - 1];
                        if (typeof lastMsg.id === 'number') {
                            setLastMessageId(lastMsg.id);
                        }

                        // Прокручиваем если пользователь внизу
                        const container = messagesContainerRef.current;
                        if (container) {
                            const isNearBottom =
                                container.scrollHeight - container.scrollTop - container.clientHeight < 200;
                            if (isNearBottom) setTimeout(scrollToBottom, 100);
                        }
                    }
                }
            } catch (err: any) {
                if (err.response?.status === 403) {
                    blockedRef.current = true;
                    stopPolling();
                    setError('У вас нет доступа к этой группе');
                }
            }
        }, 5000);
    };

    const stopPolling = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };

    // Отправка сообщения
    const sendMessage = async (e: FormEvent) => {
        e.preventDefault();

        if (!newMessage.trim() || sending || !user || blockedRef.current) return;

        const messageText = newMessage.trim();
        setNewMessage('');
        setSending(true);

        // Оптимистичное сообщение
        const tempMessage: Message = {
            id: `temp_${Date.now()}`,
            group_id: groupId,
            user_id: user.id,
            user_name: user.name || 'Вы',
            message: messageText,
            created_at: new Date().toISOString(),
        };

        setMessages(prev => [...prev, tempMessage]);
        setTimeout(scrollToBottom, 100);

        try {
            const response = await axiosInstance.post(
                `/groups/${groupId}/chat/send`,
                { message: messageText },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (response.data.success) {
                // Заменяем временное сообщение
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === tempMessage.id ? response.data.message : msg
                    )
                );

                const realMsg = response.data.message;
                if (typeof realMsg.id === 'number') {
                    setLastMessageId(realMsg.id);
                }
            }
        } catch (err: any) {
            setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));

            if (err.response?.status === 403) {
                setError('Нет прав на отправку');
                blockedRef.current = true;
                stopPolling();
            } else {
                setNewMessage(messageText);
            }
        } finally {
            setSending(false);
        }
    };

    const handleRetry = () => {
        blockedRef.current = false;
        setError(null);
        setMessages([]);
        loadHistory();
        startPolling();
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    };

    if (!user) return null;

    if (loading) {
        return (
            <Loader />
        )
    }

    return (
        <MainLayout>
            {/* Header */}
            {!blockedRef.current && (
                <div className="bg-white border-b shadow-sm fixed w-full top-16">
                    <div className="w-full mx-auto px-4 py-3 lg:flex items-center gap-4">
                        <button onClick={() => router.push('/chat')} className="p-2 hover:bg-gray-100 rounded-lg">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="flex-1">
                            <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-5">
                                {loading ? 'Загрузка...' : groupName || `Группа ${groupId}`}
                            </h1>
                        </div>
                    </div>
                </div>
            )}

            {/* Сообщения */}
            <div 
                ref={messagesContainerRef} // ✅ Добавляем ref к контейнеру
                className="flex-1 overflow-y-auto px-4 py-6"
            >
                <div className="w-full pt-16">
                    {loading && (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 text-main animate-spin" />
                        </div>
                    )}

                    {!loading && error && blockedRef.current && (
                        <div className="flex flex-col items-center py-12">
                            <ShieldAlert className="w-16 h-16 text-red-400 mb-4" />
                            <h3 className="text-lg font-semibold text-red-600 mb-2">Доступ запрещен</h3>
                            <p className="text-red-500 mb-6">{error}</p>
                        </div>
                    )}

                    {!loading && !error && messages.length === 0 && (
                        <div className="flex flex-col items-center py-12 text-gray-400">
                            <MessageSquare className="w-16 h-16 mb-4" />
                            <p>Нет сообщений</p>
                        </div>
                    )}

                    {!loading && !error && messages.length > 0 && (
                        <div className="space-y-4 pb-16">
                            {messages.map(msg => {
                                const isMyMessage = msg.user_id === user.id;
                                const isTemp = typeof msg.id === 'string' && msg.id.startsWith('temp_');

                                return (
                                    <div key={msg.id} className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} w-full`}>
                                        <div className="lg:max-w-[70%]">
                                            {!isMyMessage && (
                                                <p className="text-xs text-gray-500 mb-1 ml-1">{msg.user_name}</p>
                                            )}
                                            <div className={`
                                                    rounded-2xl px-4 py-2.5 break-words shadow-sm
                                                    ${isMyMessage ? 'bg-main text-white rounded-br-md' : 'bg-white border text-gray-900 rounded-bl-md'}
                                                    ${isTemp ? 'opacity-70' : ''}
                                                `}>
                                                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                            </div>
                                            <p className={`text-xs text-gray-400 mt-1 flex items-center gap-1 ${isMyMessage ? 'justify-end mr-1' : 'ml-1'}`}>
                                                {formatTime(msg.created_at)}
                                                {isMyMessage && !isTemp && <CheckCheck className="w-3 h-3 text-blue-400" />}
                                                {isTemp && <Clock className="w-3 h-3 animate-pulse" />}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Форма */}
            {(!blockedRef.current && !loading) && (
                <div className="bg-white border-t shadow-sm fixed w-full bottom-0">
                    <div className="max-w-3xl mx-auto px-4 py-3">
                        <form onSubmit={sendMessage} className="flex items-end gap-2">
                            <textarea
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage(e);
                                    }
                                }}
                                placeholder="Введите сообщение..."
                                rows={1}
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-main focus:border-transparent outline-none text-sm"
                                style={{ maxHeight: '120px' }}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                                }}
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim() || sending}
                                className="px-4 py-3 bg-main text-white rounded-xl hover:bg-main-dark disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
                            >
                                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </MainLayout>
    );
}
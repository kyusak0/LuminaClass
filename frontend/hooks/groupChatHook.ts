'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useWebSocket } from './webSocketHook';
import axios from '@/lib/axios.config';

interface GroupMessage {
    id: number | string;
    group_id: number;
    user_id: number;
    user_name: string;
    message: string;
    created_at: string;
}

interface GroupInfo {
    id: number;
    name: string;
    subject?: string;
    teacher_name?: string;
    members_count?: number;
}

export function useGroupChat(groupId: number) {
    const { isConnected, subscribe } = useWebSocket();
    const [messages, setMessages] = useState<GroupMessage[]>([]);
    const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAccessDenied, setIsAccessDenied] = useState(false);
    
    // ✅ Refs для предотвращения повторных запросов
    const isLoadingRef = useRef(false);
    const accessDeniedRef = useRef(false);
    const mountedRef = useRef(true);

    // Загрузка истории
    const loadHistory = useCallback(async () => {
        // ✅ Проверяем что нет активной загрузки и доступ не запрещен
        if (!groupId || isLoadingRef.current || accessDeniedRef.current) {
            console.log('⏭️ Skipping loadHistory:', { 
                groupId, 
                isLoading: isLoadingRef.current, 
                accessDenied: accessDeniedRef.current 
            });
            return;
        }

        isLoadingRef.current = true;
        setIsLoading(true);
        setError(null);

        try {
            const response = await axios.get(`/groups/${groupId}/chat/history`);
            console.log('📥 History response:', response.data);
            
            if (response.data.success) {
                setMessages(response.data.messages || []);
                setGroupInfo(response.data.group || null);
                setIsAccessDenied(false);
                accessDeniedRef.current = false;
                console.log(`✅ Loaded ${response.data.messages?.length || 0} messages`);
            } else {
                setError(response.data.error || 'Не удалось загрузить историю');
            }
        } catch (error: any) {
            console.error('❌ Failed to load history:', error);
            
            // ✅ Проверяем на 403
            if (error.response?.status === 403) {
                const errorMessage = 'У вас нет доступа к этой группе';
                setError(errorMessage);
                setIsAccessDenied(true);
                accessDeniedRef.current = true; // ✅ Блокируем повторные запросы
                console.log('🚫 Access denied, blocking further requests');
            } else if (error.response?.status === 404) {
                setError('Группа не найдена');
                setIsAccessDenied(true);
                accessDeniedRef.current = true;
            } else {
                setError('Ошибка загрузки истории');
            }
        } finally {
            isLoadingRef.current = false;
            if (mountedRef.current) {
                setIsLoading(false);
            }
        }
    }, [groupId]);

    // Подписка на WebSocket
    useEffect(() => {
        // ✅ Не подписываемся если доступ запрещен
        if (!isConnected || !groupId || accessDeniedRef.current) {
            console.log('⏭️ Skipping WebSocket subscription:', { 
                isConnected, 
                groupId, 
                accessDenied: accessDeniedRef.current 
            });
            return;
        }

        const channelName = `group.${groupId}.chat`;
        console.log(`🔌 Subscribing to channel: ${channelName}`);
        
        const unsubscribe = subscribe(channelName, '.message.sent', (data: any) => {
            console.log('📨 New message received:', data);
            
            const messageData = data.messageData || data.message || data;
            
            setMessages(prev => {
                const exists = prev.some(msg => {
                    if (msg.id === messageData.id) return true;
                    if (typeof msg.id === 'string' && msg.id.startsWith('temp_')) {
                        return msg.user_id === messageData.user_id && 
                               msg.message === messageData.message;
                    }
                    return false;
                });
                
                if (!exists) {
                    return [...prev, messageData];
                }
                return prev;
            });
        });

        return () => {
            console.log(`🔌 Unsubscribing from channel: ${channelName}`);
            if (unsubscribe) unsubscribe();
        };
    }, [isConnected, subscribe, groupId]);

    // ✅ Загружаем историю ТОЛЬКО при изменении groupId и если доступ не запрещен
    useEffect(() => {
        if (groupId && !accessDeniedRef.current) {
            loadHistory();
        }
    }, [groupId]); // loadHistory убран из зависимостей чтобы избежать циклов

    // ✅ Очистка при размонтировании
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Отправка сообщения
    const sendMessage = useCallback(async (text: string): Promise<boolean> => {
        // ✅ Проверяем доступ перед отправкой
        if (!text.trim() || isSending || accessDeniedRef.current) {
            console.log('⏭️ Cannot send message:', { 
                hasText: !!text.trim(), 
                isSending, 
                accessDenied: accessDeniedRef.current 
            });
            return false;
        }

        setIsSending(true);
        
        const tempMessage: GroupMessage = {
            id: `temp_${Date.now()}_${Math.random()}`,
            group_id: groupId,
            user_id: 0,
            user_name: 'Вы',
            message: text.trim(),
            created_at: new Date().toISOString(),
        };
        
        setMessages(prev => [...prev, tempMessage]);

        try {
            const response = await axios.post(`/groups/${groupId}/chat/send`, {
                message: text.trim()
            });
            
            console.log('📤 Send response:', response.data);
            
            if (response.data.success) {
                setMessages(prev => 
                    prev.map(msg => 
                        msg.id === tempMessage.id ? response.data.message : msg
                    )
                );
                return true;
            } else {
                setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
                
                // ✅ Проверяем на 403
                if (response.data.error?.includes('Access denied') || 
                    response.data.error?.includes('доступ')) {
                    setError('У вас нет прав на отправку сообщений');
                    setIsAccessDenied(true);
                    accessDeniedRef.current = true;
                } else {
                    setError(response.data.error || 'Не удалось отправить сообщение');
                }
                return false;
            }
        } catch (error: any) {
            console.error('❌ Failed to send message:', error);
            
            setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
            
            // ✅ Проверяем на 403
            if (error.response?.status === 403) {
                setError('У вас нет прав на отправку сообщений');
                setIsAccessDenied(true);
                accessDeniedRef.current = true;
            } else {
                setError('Ошибка при отправке сообщения');
            }
            
            return false;
        } finally {
            setIsSending(false);
            setTimeout(() => {
                if (!accessDeniedRef.current) {
                    setError(null);
                }
            }, 3000);
        }
    }, [groupId, isSending]);

    // Сброс ошибки и повторная попытка
    const retry = useCallback(() => {
        console.log('🔄 Retrying...');
        setError(null);
        setIsAccessDenied(false);
        accessDeniedRef.current = false;
        isLoadingRef.current = false;
        loadHistory();
    }, [loadHistory]);

    // Очистка ошибки
    const clearError = useCallback(() => {
        if (!accessDeniedRef.current) {
            setError(null);
        }
    }, []);

    return {
        messages,
        groupInfo,
        sendMessage,
        isConnected,
        isSending,
        isLoading,
        error,
        isAccessDenied, // ✅ Экспортируем флаг
        clearError,
        retry, // ✅ Функция повторной попытки
        reloadHistory: retry
    };
}
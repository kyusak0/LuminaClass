import { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from './webSocketHook';
import axios from '@/lib/axios.config';

interface Message {
    id: string;
    user_id: string;
    user_name: string;
    message: string;
    channel: string;
    created_at: string;
}

export const useChat = (channelName: string = 'general') => {
    const { isConnected, subscribe } = useWebSocket();
    const [messages, setMessages] = useState<Message[]>([]);
    const [isSending, setIsSending] = useState(false);

    // Подписка на канал
    useEffect(() => {
        if (!isConnected) return;

        const unsubscribe = subscribe(channelName, '.message.sent', (data: Message) => {
            console.log('New message received:', data);
            setMessages(prev => [...prev, data]);
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [isConnected, subscribe, channelName]);

    // Отправка сообщения
    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim() || isSending) return false;

        setIsSending(true);
        try {
            const response = await axios.post('/chat/send', {
                message: text,
                channel: channelName
            });
            
            if (response.data.status === 'sent') {
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to send message:', error);
            return false;
        } finally {
            setIsSending(false);
        }
    }, [channelName, isSending]);

    // Загрузка истории
    const loadHistory = useCallback(async () => {
        try {
            const response = await axios.get(`/chat/history/${channelName}`);
            if (response.data.messages) {
                setMessages(response.data.messages);
            }
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    }, [channelName]);

    // Загружаем историю при монтировании
    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    return {
        messages,
        sendMessage,
        isConnected,
        isSending,
        channelName
    };
};
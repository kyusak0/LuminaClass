import { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from './webSocketHook';
import axios from '@/lib/axios.config';

interface GroupMessage {
    id: number;
    group_id: number;
    user_id: string;
    user_name: string;
    message: string;
    created_at: string;
}

interface GroupInfo {
    id: number;
    name: string;
    subject: string;
}

export const useGroupChat = (groupId: number) => {
    const { isConnected, subscribe } = useWebSocket();
    const [messages, setMessages] = useState<GroupMessage[]>([]);
    const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Загрузка истории
    const loadHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`/groups/${groupId}/chat/history`);
            if (response.data.success) {
                setMessages(response.data.messages);
                setGroupInfo(response.data.group);
                console.log(`Loaded ${response.data.messages.length} messages for group ${groupId}`);
            }
        } catch (error) {
            console.error('Failed to load group chat history:', error);
        } finally {
            setIsLoading(false);
        }
    }, [groupId]);

    // Подписка на WebSocket
    useEffect(() => {
        if (!isConnected) return;

        const channelName = `group.${groupId}.chat`;
        console.log(`Subscribing to group channel: ${channelName}`);
        
        const unsubscribe = subscribe(channelName, '.message.sent', (data: GroupMessage) => {
            console.log('New group message received:', data);
            setMessages(prev => {
                if (prev.some(msg => msg.id === data.id)) {
                    return prev;
                }
                return [...prev, data];
            });
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [isConnected, subscribe, groupId]);

    // Загружаем историю при монтировании
    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    // Отправка сообщения
    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim() || isSending) return false;

        setIsSending(true);
        try {
            const response = await axios.post(`/groups/${groupId}/chat/send`, {
                message: text
            });
            
            if (response.data.success) {
                console.log('Message sent to group:', response.data.message);
                return true;
            }
            return false;
        } catch (error: any) {
            console.error('Failed to send message:', error.response?.data || error);
            return false;
        } finally {
            setIsSending(false);
        }
    }, [groupId, isSending]);

    return {
        messages,
        groupInfo,
        sendMessage,
        isConnected,
        isSending,
        isLoading
    };
};
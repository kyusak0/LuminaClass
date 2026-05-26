import { useEffect, useState, useRef, useCallback } from 'react';
import { initEcho } from '@/lib/reverb.config';
import type Echo from 'laravel-echo';

type MessageHandler = (data: any) => void;

export const useWebSocket = () => {
    const [isConnected, setIsConnected] = useState(false);
    const echoRef = useRef<Echo<any> | null>(null);
    const subscriptionsRef = useRef<Map<string, any>>(new Map());

    // Инициализация Echo
    useEffect(() => {
        let mounted = true;
        
        const initializeEcho = async () => {
            try {
                const echoInstance = initEcho();
                
                if (!echoInstance) {
                    console.error('Failed to initialize Echo');
                    return;
                }

                // Ждем подключения WebSocket
                if (echoInstance.connector) {
                    if (mounted) {
                        echoRef.current = echoInstance;
                        setIsConnected(true);
                        console.log('WebSocket connected successfully');
                    }
                } else {
                    console.warn('WebSocket connector not available');
                    if (mounted) {
                        setIsConnected(false);
                    }
                }
            } catch (error) {
                console.error('Error initializing WebSocket:', error);
                if (mounted) {
                    setIsConnected(false);
                }
            }
        };

        initializeEcho();

        // Проверка соединения каждые 5 секунд
        const interval = setInterval(() => {
            if (echoRef.current?.connector?.socket?.readyState === 1) {
                if (!isConnected && mounted) {
                    setIsConnected(true);
                    console.log('WebSocket reconnected');
                }
            } else if (isConnected && mounted) {
                setIsConnected(false);
                console.log('WebSocket disconnected');
            }
        }, 5000);

        return () => {
            mounted = false;
            clearInterval(interval);
            
            // Отписываемся от всех каналов
            subscriptionsRef.current.forEach((_, key) => {
                const [channelName] = key.split('|');
                if (echoRef.current) {
                    try {
                        echoRef.current.leaveChannel(channelName);
                    } catch (error) {
                        console.error(`Error leaving channel ${channelName}:`, error);
                    }
                }
            });
            subscriptionsRef.current.clear();
        };
    }, []);

    // Функция подписки на канал
    const subscribe = useCallback((channelName: string, eventName: string, handler: MessageHandler): (() => void) | undefined => {
        const currentEcho = echoRef.current;
        
        if (!currentEcho) {
            console.error('Echo not initialized');
            return;
        }

        if (!currentEcho.connector) {
            console.error('Echo connector not available');
            return;
        }

        try {
            // Получаем канал
            const channel = currentEcho.channel(channelName);
            
            if (!channel) {
                console.error(`Channel ${channelName} not found or not accessible`);
                return;
            }

            // Подписываемся на событие
            channel.listen(eventName, handler);
            
            const subscriptionKey = `${channelName}|${eventName}`;
            subscriptionsRef.current.set(subscriptionKey, { channel, eventName, handler });
            
            console.log(`✅ Subscribed to ${channelName}.${eventName}`);

            // Возвращаем функцию отписки
            return () => {
                try {
                    const currentEchoUnsub = echoRef.current;
                    if (currentEchoUnsub && currentEchoUnsub.connector) {
                        const ch = currentEchoUnsub.channel(channelName);
                        if (ch) {
                            ch.stopListening(eventName);
                            console.log(`🔴 Unsubscribed from ${channelName}.${eventName}`);
                        }
                        subscriptionsRef.current.delete(subscriptionKey);
                    }
                } catch (error) {
                    console.error(`Error unsubscribing from ${channelName}:`, error);
                }
            };
        } catch (error) {
            console.error(`Error subscribing to channel ${channelName}:`, error);
            return;
        }
    }, []);

    // Приватный канал
    const privateSubscribe = useCallback((channelName: string, eventName: string, handler: MessageHandler): (() => void) | undefined => {
        const currentEcho = echoRef.current;
        
        if (!currentEcho || !currentEcho.connector) {
            console.error('Echo not initialized');
            return;
        }

        try {
            const channel = currentEcho.private(channelName);
            channel.listen(eventName, handler);
            console.log(`✅ Subscribed to private ${channelName}.${eventName}`);

            return () => {
                if (echoRef.current) {
                    channel.stopListening(eventName);
                    echoRef.current.leaveChannel(channelName);
                    console.log(`🔴 Unsubscribed from private ${channelName}`);
                }
            };
        } catch (error) {
            console.error(`Error subscribing to private channel ${channelName}:`, error);
            return;
        }
    }, []);

    // Presence канал
    const presenceSubscribe = useCallback((channelName: string, eventName: string, handler: MessageHandler): (() => void) | undefined => {
        const currentEcho = echoRef.current;
        
        if (!currentEcho || !currentEcho.connector) {
            console.error('Echo not initialized');
            return;
        }

        try {
            const channel = currentEcho.join(channelName);
            channel.listen(eventName, handler);
            console.log(`✅ Subscribed to presence ${channelName}.${eventName}`);

            return () => {
                if (echoRef.current) {
                    channel.stopListening(eventName);
                    echoRef.current.leaveChannel(channelName);
                    console.log(`🔴 Unsubscribed from presence ${channelName}`);
                }
            };
        } catch (error) {
            console.error(`Error subscribing to presence channel ${channelName}:`, error);
            return;
        }
    }, []);

    return { 
        isConnected, 
        subscribe, 
        privateSubscribe, 
        presenceSubscribe,
        echo: echoRef.current 
    };
};
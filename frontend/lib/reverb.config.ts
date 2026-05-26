import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

let echoInstance: Echo<any> | null = null;

declare global {
    interface Window {
        Pusher: any;
    }
}

export const initEcho = (): Echo<any> | null => {
    // Проверяем, что мы в браузере
    if (typeof window === 'undefined') {
        console.log('Not in browser, skipping Echo init');
        return null;
    }
    
    // Если уже инициализирован и есть коннектор, возвращаем
    if (echoInstance && echoInstance.connector) {
        console.log('Echo already initialized and connected');
        return echoInstance;
    }
    
    try {
        // Устанавливаем Pusher в глобальный объект
        window.Pusher = Pusher;
        
        // Создаем экземпляр Echo
        echoInstance = new Echo({
            broadcaster: 'reverb',
            key: process.env.NEXT_PUBLIC_REVERB_APP_KEY || 'local',
            wsHost: process.env.NEXT_PUBLIC_REVERB_HOST || 'localhost',
            wsPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT) || 8080,
            wssPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT) || 8080,
            forceTLS: false,
            encrypted: false,
            enabledTransports: ['ws', 'wss'],
            disableStats: true,
        });
        
        console.log('✅ Echo initialized successfully');
        
        // Проверяем коннектор через небольшую задержку
        setTimeout(() => {
            if (echoInstance && echoInstance.connector) {
                console.log('✅ Echo connector available');
                if (echoInstance.connector.socket) {
                    console.log('✅ WebSocket socket available');
                }
            } else {
                console.warn('⚠️ Echo connector not available after initialization');
            }
        }, 100);
        
        return echoInstance;
    } catch (error) {
        console.error('Failed to initialize Echo:', error);
        return null;
    }
};

// Функция для проверки статуса
export const getEchoStatus = () => {
    if (!echoInstance) return 'not_initialized';
    if (!echoInstance.connector) return 'no_connector';
    if (echoInstance.connector.socket?.readyState === 1) return 'connected';
    if (echoInstance.connector.socket?.readyState === 0) return 'connecting';
    return 'disconnected';
};

// Функция для принудительного переподключения
export const reconnectEcho = () => {
    if (echoInstance && echoInstance.connector) {
        echoInstance.connector.disconnect();
        echoInstance.connector.connect();
        console.log('🔌 Forced reconnection');
    }
};
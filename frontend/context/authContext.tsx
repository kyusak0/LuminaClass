'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import axios from '@/lib/axios.config';
import { useRouter } from 'next/navigation';

interface LoginData {
    login: string;
    password: string;
}

interface RegisterData {
    email: string;
    name: string;
    surname: string;
    target: string;
    tel: string;
    messanger: string;
}

interface AuthContextType {
    user: any | null;
    loading: boolean;
    register: (userData: RegisterData) => Promise<{ success: boolean; message?: string; data?: any }>;
    login: (credentials: LoginData) => Promise<{ success: boolean; message?: string; data?: any }>;
    logout: () => Promise<void>;
    checkUser: () => Promise<void>;
    post: (link: string, data: any, showSuccessMessage?: boolean) => Promise<any>;
    get: (link: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => useContext(AuthContext);

// Универсальная функция обработки ошибок Laravel
const parseLaravelError = (error: any): string => {
    // Если есть errors объект (валидация Laravel)
    if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        // Берем первую ошибку из первого поля
        const firstErrorKey = Object.keys(errors)[0];
        const firstError = errors[firstErrorKey];
        return Array.isArray(firstError) ? firstError[0] : firstError;
    }

    // Если есть message
    if (error.response?.data?.message) {
        return error.response.data.message;
    }

    // Если есть error
    if (error.response?.data?.error) {
        return error.response.data.error;
    }

    // Стандартное сообщение
    if (error.message) {
        return error.message;
    }

    return 'Произошла неизвестная ошибка';
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const response = await axios.get('/user');
                setUser(response.data);
            }
        } catch (error) {
            localStorage.removeItem('token');
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const register = async (userData: RegisterData) => {
        try {
            const response = await axios.post('/register', userData);
            const { token, user } = response.data;
            localStorage.setItem('token', token);
            setUser(user);
            router.push(`/users/${user.id}`);
            return { success: true, data: response.data };
        } catch (error: any) {
            return {
                success: false,
                message: parseLaravelError(error),
                data: error.response?.data
            };
        }
    };

    const login = async (credentials: LoginData) => {
        try {
            const response = await axios.post('/login', credentials);
            const { token, user } = response.data;
            localStorage.setItem('token', token);
            setUser(user);
            if (user.role == 'admin') {
                router.push(`/admin`);
            } else {
                router.push(`/users/${user.id}`);
            }
            return { success: true, data: response.data };
        } catch (error: any) {
            return {
                success: false,
                message: parseLaravelError(error),
                data: error.response?.data
            };
        }
    };

    const logout = async () => {
        try {
            await axios.post('/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('token');
            setUser(null);
            router.push('/login');
        }
    };

    const post = async (link: string, data: any, showSuccessMessage: boolean = false) => {
        try {
            // Определяем тип данных
            const isFormData = data instanceof FormData;

            const config: any = {
                headers: {
                    'Accept': 'application/json',
                }
            };

            // Для FormData НЕ устанавливаем Content-Type, axios сам установит правильный с boundary
            if (!isFormData) {
                config.headers['Content-Type'] = 'application/json';
            }

            const response = await axios.post(link, data, config);

            if (showSuccessMessage && response.data?.message) {
                console.log('Success:', response.data.message);
            }

            return {
                success: true,
                data: response.data,
                message: response.data?.message || 'Операция выполнена успешно'
            };
        } catch (error: any) {
            const errorMessage = parseLaravelError(error);

            return {
                success: false,
                message: errorMessage,
                data: error.response?.data,
                status: error.response?.status
            };
        }
    }

    const get = async (link: string) => {
        try {
            const response = await axios.get(link);
            return {
                success: true,
                data: response.data,
                message: response.data?.message || 'Данные получены успешно'
            };
        } catch (error: any) {
            const errorMessage = parseLaravelError(error);

            return {
                success: false,
                message: errorMessage,
                data: error.response?.data,
                status: error.response?.status
            };
        }
    };

    const value = {
        user,
        loading,
        register,
        login,
        logout,
        checkUser,
        post,
        get,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
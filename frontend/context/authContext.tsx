// @/context/authContext.tsx
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
    register: (userData: RegisterData) => Promise<{ success: boolean; message?: string }>;
    login: (credentials: LoginData) => Promise<{ success: boolean; message?: string }>;
    logout: () => Promise<void>;
    checkUser: () => Promise<void>;
    post: (link: string, data: any) => Promise<any>;
    get: (link: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => useContext(AuthContext);

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
            return { success: true };
        } catch (error: any) {
            return {
                success: false,
                message: error.message
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

            return { success: true };
        } catch (error: any) {
            return {
                success: false,
                message: error.message
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

    const post = async (link: string, data: any) => {
        try {
            let headers: any = {};

            // Если данные не FormData, отправляем как JSON
            if (!(data instanceof FormData)) {
                headers['Content-Type'] = 'application/json';
            } else {
                headers['Content-Type'] = 'multipart/form-data';
            }

            const response = await axios.post(link, data, { headers });
            return response.data;
        } catch (error: any) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    const get = async (link: string) => {
        try {
            const response = await axios.get(link);
            return response.data;
        } catch (error: any) {
            return {
                success: false,
                message: error.message
            };
        }
    }

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
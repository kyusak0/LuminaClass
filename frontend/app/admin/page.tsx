'use client'

import MainLayout from "@/layouts/MainLayout";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/authContext";

export default function UserPanel() {
    const router = useRouter();
    const auth = useAuth();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (auth) {
            checkAccess();
        }
    }, [auth]);

    const checkAccess = async () => {
        try {
            if (!auth?.user) {
                await auth?.checkUser();
            }
        } catch (error) {
            console.error('Ошибка загрузки пользователя:', error);
            router.push('/login');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <MainLayout>
                <div className="min-h-screen flex flex-col items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Загрузка...</p>
                    </div>
                </div>
            </MainLayout>
        )
    }

    if (!auth?.user || auth.user.role !== 'admin') {
        return notFound();
    }

    const menuItems = [
        {
            href: 'admin/register',
            icon: '📄',
            title: 'Заявки',
            description: 'Управление заявками на регистрацию',
        },
        {
            href: '/users',
            icon: '👤',
            title: 'Пользователи',
            description: 'Управление пользователями системы',
        },
        {
            href: '/groups',
            icon: '👥',
            title: 'Группы',
            description: 'Управление учебными группами',
        },
        {
            href: '/files',
            icon: '📑',
            title: 'Файлы',
            description: 'Управление файлами и документами',
        },
        {
            href: '/tasks',
            icon: '📝',
            title: 'Задания',
            description: 'Управление заданиями',
        },
        {
            href: '/marks',
            icon: '📊',
            title: 'Журнал',
            description: 'Управление оценками',
        }
    ];

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Приветствие */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        Панель администратора
                    </h1>
                    <p className="text-lg text-gray-600">
                        Добро пожаловать, {auth.user.name || auth.user.login}!
                    </p>
                </div>

                {/* Статистика (опционально) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Всего заявок</p>
                                <p className="text-2xl font-bold text-gray-900">-</p>
                            </div>
                            <div className="text-3xl text-blue-500">📋</div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Всего пользователей</p>
                                <p className="text-2xl font-bold text-gray-900">-</p>
                            </div>
                            <div className="text-3xl text-green-500">👥</div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Групп</p>
                                <p className="text-2xl font-bold text-gray-900">-</p>
                            </div>
                            <div className="text-3xl text-yellow-500">👥</div>
                        </div>
                    </div>
                </div>

                {/* Меню управления */}
                <div className="mb-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                        Управление системой
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {menuItems.map((item, index) => (
                            <Link
                                key={index}
                                href={item.href}
                                className={`border-main bg-foreground block p-6 rounded-lg border-2 transition-all duration-200 hover:shadow-lg transform hover:-translate-y-1`}
                            >
                                <div className="flex items-start space-x-4">
                                    <div className="text-3xl group-hover:scale-110 transition-transform duration-200">
                                        {item.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                            {item.title}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                        Быстрые действия
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={() => router.push('/admin/register')}
                            className="flex items-center justify-center px-4 py-3 bg-main text-white rounded-lg transition-colors duration-200"
                        >
                            <span className="mr-2">➕</span>
                            Новая заявка
                        </button>
                        <button
                            onClick={() => router.push('/users/create')}
                            className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                        >
                            <span className="mr-2">👤</span>
                            Добавить пользователя
                        </button>
                    </div>
                </div>

                {/* Полезные ссылки */}
                <div className="border-t border-gray-200 pt-6">
                    <Link
                        href='/docs/policy'
                        className="text-sm text-gray-500 hover:text-green-600 transition-colors duration-200 inline-flex items-center"
                    >
                        <span className="mr-1">📄</span>
                        Условия пользования
                    </Link>
                </div>
            </div>
        </MainLayout>
    )
}
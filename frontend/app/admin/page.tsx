// app/admin/page.tsx
'use client'

import AdminLayout from "@/layouts/AdminLayout";
import Link from "next/link";
import { useAuth } from "@/context/authContext";
import {
    Users,
    UserPlus,
    BookOpen,
    FileText,
    ClipboardCheck,
    Activity,
    Shield,
    TrendingUp,
    Calendar
} from "lucide-react";
import { useEffect, useState } from "react";
import AdminLoader from "@/components/adminLoader/AdminLoader";

export default function AdminPanel() {

    const auth = useAuth()
    if (!auth) return
    const { user, get, post, loading } = auth;

    const [stats, setStats] = useState({
        bookings: 0,
        users: 0,
        groups: 0,
        tasks: 0
    });

    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Получаем заявки на регистрацию (pending статус)
                const bookingsRes = await get("/get-bookings");
                const bookingsCount = bookingsRes?.data?.data?.length || 0;

                // Получаем всех пользователей
                const usersRes = await get("/get-users");
                const usersCount = usersRes?.data?.data?.length || 0;

                // Получаем все группы
                const groupsRes = await get("/get-groups");
                const groupsCount = groupsRes?.data?.data?.length || 0;

                // Получаем все задания
                const tasksRes = await get("/get-tasks");
                const tasksCount = tasksRes?.data?.data?.length || 0;

                setStats({
                    bookings: bookingsCount,
                    users: usersCount,
                    groups: groupsCount,
                    tasks: tasksCount
                });
            } catch (error) {
                console.error("Ошибка при загрузке статистики:", error);
            } finally {
                setStatsLoading(false);
            }
        };

        fetchStats();
    }, [get]);

    const menuItems = [
        {
            href: '/admin/register',
            icon: UserPlus,
            title: 'Заявки',
            description: 'Управление заявками на регистрацию',
            color: 'text-blue-500',
            bgColor: 'bg-blue-50'
        },
        {
            href: '/users',
            icon: Users,
            title: 'Пользователи',
            description: 'Управление пользователями системы',
            color: 'text-green-500',
            bgColor: 'bg-green-50'
        },
        {
            href: '/groups',
            icon: Users,
            title: 'Группы',
            description: 'Управление учебными группами',
            color: 'text-purple-500',
            bgColor: 'bg-purple-50'
        },
        {
            href: '/files',
            icon: FileText,
            title: 'Файлы',
            description: 'Управление файлами и документами',
            color: 'text-yellow-500',
            bgColor: 'bg-yellow-50'
        },
        {
            href: '/tasks',
            icon: BookOpen,
            title: 'Задания',
            description: 'Управление заданиями',
            color: 'text-orange-500',
            bgColor: 'bg-orange-50'
        },
        {
            href: '/marks',
            icon: ClipboardCheck,
            title: 'Журнал',
            description: 'Управление оценками',
            color: 'text-red-500',
            bgColor: 'bg-red-50'
        },
        {
            href: '/admin/logs',
            icon: Activity,
            title: 'Логи',
            description: 'Системные логи',
            color: 'text-indigo-500',
            bgColor: 'bg-indigo-50'
        },
    ];

    const statsCards = [
        {
            label: 'Всего заявок',
            value: stats.bookings.toString(),
            icon: UserPlus,
            trend: stats.bookings > 0 ? `+${stats.bookings}` : '0',
            color: 'text-blue-600',
            borderColor: 'border-blue-500',
            bgColor: 'bg-blue-50'
        },
        {
            label: 'Всего пользователей',
            value: stats.users.toString(),
            icon: Users,
            trend: stats.users > 0 ? `+${stats.users}` : '0',
            color: 'text-green-600',
            borderColor: 'border-green-500',
            bgColor: 'bg-green-50'
        },
        {
            label: 'Всего групп',
            value: stats.groups.toString(),
            icon: Users,
            trend: stats.groups > 0 ? `+${stats.groups}` : '0',
            color: 'text-purple-600',
            borderColor: 'border-purple-500',
            bgColor: 'bg-purple-50'
        },
        {
            label: 'Всего заданий',
            value: stats.tasks.toString(),
            icon: BookOpen,
            trend: stats.tasks > 0 ? `+${stats.tasks}` : '0',
            color: 'text-orange-600',
            borderColor: 'border-orange-500',
            bgColor: 'bg-orange-50'
        },
    ];

    if (statsLoading) {
        return (
            <AdminLoader />
        );
    }

    return (
        <AdminLayout
            title="Панель администратора"
            subtitle={`Добро пожаловать, ${user?.name || user?.login}!`}
        >
            {/* Статистика */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statsCards.map((card, index) => {
                    const Icon = card.icon;
                    return (
                        <div
                            key={index}
                            className={`bg-white rounded-xl shadow-sm border-l-4 ${card.borderColor} p-6 hover:shadow-md transition-shadow`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">{card.label}</p>
                                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                                    {card.trend && (
                                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" />
                                            {card.trend} всего
                                        </p>
                                    )}
                                </div>
                                <div className={`p-3 rounded-full ${card.bgColor}`}>
                                    <Icon className={`w-6 h-6 ${card.color}`} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Быстрые действия */}
            <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-main" />
                    Быстрые действия
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {menuItems.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={index}
                                href={item.href}
                                className="group block bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all duration-200 hover:shadow-lg hover:border-main"
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-xl ${item.bgColor} group-hover:scale-110 transition-transform`}>
                                        <Icon className={`w-6 h-6 ${item.color}`} />
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
                        );
                    })}
                </div>
            </div>

            {/* Дополнительная информация */}
            <div className="border-t border-gray-200 pt-6">
                <div className="flex justify-between items-center">
                    <Link
                        href='/docs/policy'
                        className="text-sm text-gray-500 hover:text-main transition-colors duration-200 inline-flex items-center gap-1"
                    >
                        <span>📄</span>
                        Условия пользования
                    </Link>
                    <div className="text-sm text-gray-400">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Версия 1.0.0
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
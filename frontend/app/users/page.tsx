'use client'

import { useAuth } from "@/context/authContext";
import AdminLayout from "@/layouts/AdminLayout";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import SearchTable, { SearchRecord } from "@/components/searchTable/SearchTable";
import { Lock, Unlock, Users, GraduationCap, User, Users2, Shield, UserX, Loader2 } from 'lucide-react';

interface AppUser {
    id: number;
    name: string;
    login: string;
    role: 'student' | 'teacher' | 'parent' | 'admin';
    is_blocked?: boolean;
    blocked_at?: string | null;
}

export default function UserPanel() {
    const router = useRouter();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterRole, setFilterRole] = useState<string>('');

    const auth = useAuth();

    if (!auth) {
        return null;
    }

    const { user, get, post } = auth;

    useEffect(() => {
        if (user) {
            loadUsers();
        }
    }, [user]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const response = await get('get-users');

            if (response && response.success === false) {
                throw new Error(response.message);
            }

            let usersData: AppUser[] = [];

            usersData = response.data.data;

            setUsers(usersData);
        } catch (error) {
            console.error('Ошибка загрузки пользователей:', error);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const toggleBlockUser = async (userId: number, isBlocked: boolean) => {
        try {
            const action = isBlocked ? 'unblock' : 'block';
            const response = await post(`users/${userId}/${action}`, {});

            if (response && response.success === false) {
                throw new Error(response.message);
            }

            await loadUsers();
            return true;
        } catch (error: any) {
            console.error('Ошибка при блокировке:', error);
            alert(error.message || 'Ошибка при выполнении операции');
            return false;
        }
    };

    const getRoleName = (role: string): string => {
        const roles: Record<string, string> = {
            'student': 'Ученик',
            'teacher': 'Учитель',
            'parent': 'Родитель',
            'admin': 'Администратор'
        };
        return roles[role] || role;
    };

    const getUserStatus = (user: AppUser): string => {
        if (user.is_blocked) {
            return 'Заблокирован';
        }
        return 'Активен';
    };

    const getStatusColor = (user: AppUser): string => {
        if (user.is_blocked) {
            return 'text-red-600 bg-red-50';
        }
        return 'text-main bg-main/10';
    };

    // Фильтруем пользователей по роли и статусу блокировки
    const filteredUsers = useMemo(() => {
        if (!Array.isArray(users)) {
            console.warn('users не является массивом:', users);
            return [];
        }

        let filtered = [...users];

        // Фильтрация по роли или статусу блокировки
        if (filterRole === 'blocked') {
            filtered = filtered.filter(u => u && u.is_blocked === true);
        } else if (filterRole) {
            filtered = filtered.filter(u => u && u.role === filterRole);
        }

        return filtered;
    }, [users, filterRole]);

    const searchTableData = useMemo<SearchRecord[]>(() => {
        if (!Array.isArray(filteredUsers)) {
            return [];
        }

        return filteredUsers.map(user => ({
            id: user.id,
            columns: [
                {
                    title: 'ФИО',
                    key: 'fullname',
                    data: {
                        value: `${user.name || ''}`,
                        size: 3,
                        isFilter: true,
                        tag: undefined,
                        isLink: undefined
                    }
                },
                {
                    title: 'Email',
                    key: 'email',
                    data: {
                        value: user.login || '',
                        size: 3,
                        isFilter: true
                    }
                },
                {
                    title: 'Роль',
                    key: 'role',
                    data: {
                        value: getRoleName(user.role || 'student'),
                        size: 2,
                        isFilter: true
                    }
                },
                {
                    title: 'Статус',
                    key: 'status',
                    data: {
                        value: getUserStatus(user),
                        size: 2,
                        isFilter: true,
                        add: `text-xs font-medium ${getStatusColor(user)}`
                    }
                },
                {
                    title: 'ID',
                    key: 'id',
                    data: {
                        value: user.id?.toString() || '',
                        size: 1,
                        isFilter: false
                    }
                }
            ]
        }));
    }, [filteredUsers]);

    const handleRowClick = useCallback((record: SearchRecord) => {
        router.push(`/users/${record.id}`);
    }, [router]);

    // Actions с иконками вместо смайликов
    const actions = useMemo(() => {
        const baseActions: any[] = [];

        if (user && user.role === 'admin') {
            baseActions.push({
                label: 'Заблокировать',
                icon: <Lock className="w-4 h-4" />,
                onClick: async (record: SearchRecord) => {
                    const targetUser = users.find(u => u && u.id === record.id);
                    if (!targetUser) return;

                    if (targetUser.role === 'admin') {
                        alert('Нельзя блокировать администратора');
                        return;
                    }
                    if (targetUser.id === user.id) {
                        alert('Нельзя заблокировать самого себя');
                        return;
                    }

                    const isBlocked = targetUser.is_blocked || false;
                    const actionText = isBlocked ? 'разблокировать' : 'заблокировать';
                    const confirmMessage = `Вы уверены, что хотите ${actionText} пользователя ${targetUser.name}?`;

                    if (confirm(confirmMessage)) {
                        await toggleBlockUser(record.id as number, isBlocked);
                    }
                },
                className: (record: SearchRecord) => {
                    const targetUser = users.find(u => u && u.id === record.id);
                    if (targetUser?.is_blocked) {
                        return 'text-green-600 hover:text-green-800';
                    }
                    return 'text-orange-600 hover:text-orange-800';
                },
                getLabel: (record: SearchRecord) => {
                    const targetUser = users.find(u => u && u.id === record.id);
                    return targetUser?.is_blocked ? 'Разблокировать' : 'Заблокировать';
                },
                getIcon: (record: SearchRecord) => {
                    const targetUser = users.find(u => u && u.id === record.id);
                    return targetUser?.is_blocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />;
                }
            });
        }

        return baseActions;
    }, [users, user]);

    const filterOptions = [
        { value: '', label: 'Все пользователи' },
        { value: 'student', label: 'Ученики' },
        { value: 'teacher', label: 'Учителя' },
        { value: 'parent', label: 'Родители' },
        { value: 'admin', label: 'Администраторы' },
        { value: 'blocked', label: 'Заблокированы' }
    ];

    const handleFilterChange = useCallback((value: string) => {
        setFilterRole(value);
    }, []);

    const stats = useMemo(() => {
        const usersArray = Array.isArray(users) ? users : [];

        return {
            total: usersArray.length,
            students: usersArray.filter(u => u && u.role === 'student').length,
            teachers: usersArray.filter(u => u && u.role === 'teacher').length,
            parents: usersArray.filter(u => u && u.role === 'parent').length,
            admins: usersArray.filter(u => u && u.role === 'admin').length,
            blocked: usersArray.filter(u => u && u.is_blocked).length,
            active: usersArray.filter(u => u && !u.is_blocked).length
        };
    }, [users]);

    if (loading) {
        return (
            <AdminLayout>
                <div className="h-170 flex flex-col items-center justify-center">
                    <Loader2 className="animate-spin h-10 w-10 text-green-600 mb-4" />
                    <p className="text-gray-600">Загрузка пользователей...</p>
                </div>
            </AdminLayout>
        );
    }

    if (user?.role !== 'admin') {
        return notFound();
    }

    return (
        <AdminLayout>
            <div className="mb-8">
                <h2 className="text-4xl font-bold">
                    <Link href='/admin' className="hover:text-green-600 transition-colors">
                        Панель Администратора
                    </Link>
                    <span className="mx-2">/</span>
                    <span>Управление Пользователями</span>
                </h2>
                <p className="text-gray-600 mt-2">
                    Всего пользователей: {stats.total}
                </p>
            </div>

            {/* Статистика - кликабельные кнопки фильтрации с иконками */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                <div
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${filterRole === '' ? 'bg-gray-200 border-gray-400' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                    onClick={() => handleFilterChange('')}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-5 h-5 text-gray-600" />
                        <div className="text-sm text-gray-600 font-semibold">Всего</div>
                    </div>
                    <div className="text-2xl font-bold text-gray-700">{stats.total}</div>
                </div>
                <div
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${filterRole === 'student' ? 'bg-blue-200 border-blue-400' : 'bg-blue-50 border-blue-200 hover:bg-blue-100'}`}
                    onClick={() => handleFilterChange('student')}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <GraduationCap className="w-5 h-5 text-blue-600" />
                        <div className="text-sm text-blue-600 font-semibold">Ученики</div>
                    </div>
                    <div className="text-2xl font-bold text-blue-700">{stats.students}</div>
                </div>
                <div
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${filterRole === 'teacher' ? 'bg-green-200 border-green-400' : 'bg-green-50 border-green-200 hover:bg-green-100'}`}
                    onClick={() => handleFilterChange('teacher')}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <User className="w-5 h-5 text-green-600" />
                        <div className="text-sm text-green-600 font-semibold">Учителя</div>
                    </div>
                    <div className="text-2xl font-bold text-green-700">{stats.teachers}</div>
                </div>
                <div
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${filterRole === 'parent' ? 'bg-purple-200 border-purple-400' : 'bg-purple-50 border-purple-200 hover:bg-purple-100'}`}
                    onClick={() => handleFilterChange('parent')}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Users2 className="w-5 h-5 text-purple-600" />
                        <div className="text-sm text-purple-600 font-semibold">Родители</div>
                    </div>
                    <div className="text-2xl font-bold text-purple-700">{stats.parents}</div>
                </div>
                <div
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${filterRole === 'admin' ? 'bg-gray-200 border-gray-400' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                    onClick={() => handleFilterChange('admin')}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-5 h-5 text-gray-600" />
                        <div className="text-sm text-gray-600 font-semibold">Администраторы</div>
                    </div>
                    <div className="text-2xl font-bold text-gray-700">{stats.admins}</div>
                </div>
                <div 
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${filterRole === 'blocked' ? 'bg-red-200 border-red-400' : 'bg-red-50 border-red-200 hover:bg-red-100'}`}
                    onClick={() => handleFilterChange('blocked')}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <UserX className="w-5 h-5 text-red-600" />
                        <div className="text-sm text-red-600 font-semibold">Заблокированы</div>
                    </div>
                    <div className="text-2xl font-bold text-red-700">{stats.blocked}</div>
                </div>
            </div>

            {/* Таблица с кликабельными строками */}
            <div className="bg-white rounded-lg shadow-sm">
                <SearchTable
                    searchProps={searchTableData}
                    actions={actions}
                    filterOptions={filterOptions}
                    filterField="role"
                    onFilterChange={handleFilterChange}
                    disableInternalFilter={true}
                    onRowClick={handleRowClick}
                />
            </div>

            <div className="mt-8 flex gap-4">
                <Link
                    href='/admin/register'
                    className="inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
                >
                    Посмотреть заявки
                </Link>
            </div>
        </AdminLayout>
    );
}
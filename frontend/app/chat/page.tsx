// app/chat/page.tsx
'use client';

import MainLayout from "@/layouts/MainLayout";
import { useAuth } from "@/context/authContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    MessageSquare,
    Users,
    Loader2,
    Search,
    Plus,
    BookOpen,
    Clock,
    ChevronRight,
    User,
    Hash,
    GraduationCap
} from 'lucide-react';
import Link from "next/link";

interface Group {
    id: number;
    name: string;
    description?: string;
    members_count?: number;
    last_message?: string;
    last_message_time?: string;
    created_at?: string;
    teacher_name?: string;
    subject?: string;
}

export default function ChatPage() {
    const router = useRouter();
    const auth = useAuth();
    const { get, user, loading: authLoading } = auth || {};

    const [groups, setGroups] = useState<Group[]>([]);
    const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && user) {
            loadGroups();
        } else if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, user]);

    const loadGroups = async () => {
        if (!get) return;
        
        setLoading(true);
        setError(null);

        try {
            const res = await get('/get-groups');
            console.log('Groups response:', res);

            const groupsData = res.data.data || res.data || [];

            setGroups(Array.isArray(groupsData) ? groupsData : []);
            setFilteredGroups(Array.isArray(groupsData) ? groupsData : []);
        } catch (error: any) {
            console.error('Error loading groups:', error);
            setError(error.message || 'Не удалось загрузить группы');
        } finally {
            setLoading(false);
        }
    };

    // Фильтрация групп при поиске
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredGroups(groups);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = groups.filter(group =>
                group.name?.toLowerCase().includes(query) ||
                group.description?.toLowerCase().includes(query) ||
                group.teacher_name?.toLowerCase().includes(query) ||
                group.subject?.toLowerCase().includes(query)
            );
            setFilteredGroups(filtered);
        }
    }, [searchQuery, groups]);

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        } else if (days === 1) {
            return 'Вчера';
        } else if (days < 7) {
            return `${days} дн. назад`;
        } else {
            return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        }
    };

    const getGroupIcon = (group: Group) => {
        if (group.subject) return <BookOpen className="w-5 h-5" />;
        if (group.teacher_name) return <GraduationCap className="w-5 h-5" />;
        return <Users className="w-5 h-5" />;
    };

    const getGroupColor = (index: number) => {
        const colors = [
            'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
            'bg-orange-500', 'bg-pink-500', 'bg-teal-500',
            'bg-indigo-500', 'bg-red-500'
        ];
        return colors[index % colors.length];
    };

    if (authLoading || loading) {
        return (
            <MainLayout>
                <div className="h-screen flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 text-main animate-spin mb-4" />
                    <div className="text-lg text-gray-500">Загрузка групп...</div>
                </div>
            </MainLayout>
        );
    }

    if (!user) return null;

    return (
        <MainLayout>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                            <MessageSquare className="w-8 h-8 text-blue-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Групповые чаты
                        </h1>
                        <p className="text-gray-500">
                            {user.role === 'teacher' 
                                ? 'Управляйте группами и общайтесь с учениками' 
                                : 'Общайтесь с одногруппниками и преподавателями'}
                        </p>
                    </div>

                    {/* Поиск */}
                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Поиск группы по названию, предмету или преподавателю..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-main focus:border-transparent outline-none transition"
                        />
                    </div>

                    {/* Список групп */}
                    {error ? (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                            <div className="text-red-500 text-lg mb-2">❌ {error}</div>
                            <button
                                onClick={loadGroups}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Попробовать снова
                            </button>
                        </div>
                    ) : filteredGroups.length > 0 ? (
                        <div className="space-y-3">
                            {filteredGroups.map((group, index) => (
                                <Link
                                    key={group.id}
                                    href={`/chat/${group.id}`}
                                    className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border border-gray-100 overflow-hidden group"
                                >
                                    <div className="p-4 sm:p-5 flex items-center gap-4">
                                        {/* Аватар группы */}
                                        <div className={`${getGroupColor(index)} w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-md`}>
                                            {getGroupIcon(group)}
                                        </div>

                                        {/* Информация */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-gray-900 text-base sm:text-lg truncate">
                                                    {group.name}
                                                </h3>
                                                {group.subject && (
                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full hidden sm:inline-block">
                                                        {group.subject}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                {group.teacher_name && (
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        {group.teacher_name}
                                                    </span>
                                                )}
                                                {group.members_count !== undefined && (
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-3 h-3" />
                                                        {group.members_count} участников
                                                    </span>
                                                )}
                                            </div>

                                            {group.last_message && (
                                                <p className="text-sm text-gray-400 mt-1 truncate max-w-md">
                                                    {group.last_message}
                                                </p>
                                            )}
                                        </div>

                                        {/* Время и стрелка */}
                                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                            {group.last_message_time && (
                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDate(group.last_message_time)}
                                                </span>
                                            )}
                                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-main transition-colors" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                            {searchQuery ? (
                                <>
                                    <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                                        Группы не найдены
                                    </h3>
                                    <p className="text-gray-500">
                                        По запросу "{searchQuery}" ничего не найдено
                                    </p>
                                </>
                            ) : (
                                <>
                                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                                        Нет доступных групп
                                    </h3>
                                    <p className="text-gray-500">
                                        {user.role === 'teacher'
                                            ? 'Создайте группу, чтобы начать общение с учениками'
                                            : 'Вы еще не состоите ни в одной группе'}
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {/* Информация */}
                    <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Hash className="w-5 h-5 text-main" />
                            О групповых чатах
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                <MessageSquare className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                <span>Общайтесь с участниками группы в реальном времени</span>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                <BookOpen className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                <span>Делитесь материалами и заданиями</span>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                <Users className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                                <span>Работайте вместе над проектами</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
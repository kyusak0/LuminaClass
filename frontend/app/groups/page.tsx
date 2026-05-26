'use client'

import SearchTable, { SearchRecord } from "@/components/searchTable/SearchTable";
import AdminLayout from "@/layouts/AdminLayout";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/authContext";
import { Filter, BookOpen, Users, Calendar, Info } from 'lucide-react';

export default function GroupsPage() {
    const router = useRouter();
    const { get, post, user } = useAuth() || {};
    const [formData, setFormData] = useState<{
        name: string,        // название группы
        desc: string,        // описание группы
        subject: string,     // предмет
        tutor_id: number,
        organization_id: number,
    }>({
        name: '',
        desc: '',
        subject: '',
        tutor_id: 0,
        organization_id: 1,
    });
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [alertMess, setAlertMess] = useState<{ content: any }>();
    const [searchProps, setSearchProps] = useState<SearchRecord[]>([]);
    const [allTeachers, setAllTeachers] = useState<{ id: number, name: string }[]>([]);
    const [filterSubject, setFilterSubject] = useState<string>('');

    // Опции для фильтрации по предмету
    const filterOptions:any = [];

    useEffect(() => {
        getTeachers();
        loadGroups();
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'tutor_id' ? Number(value) : value
        }));
    };

    const createGroup = async (e: FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setAlertMessage('Введите название группы');
            return;
        }

        if (!formData.subject.trim()) {
            setAlertMessage('Введите предмет');
            return;
        }

        if (!formData.tutor_id || formData.tutor_id === 0) {
            setAlertMessage('Выберите куратора');
            return;
        }

        if (!post) return;

        try {
            setCreating(true);

            const newData = {
                name: formData.name,
                desc: formData.desc,
                subject: formData.subject,
                tutor_id: Number(formData.tutor_id),
                organization_id: formData.organization_id,
            };

            const res = await post('/create-group', newData);

            if (res) {
                setAlertMessage(res.message || 'Группа успешно создана!');
                setFormData({
                    name: '',
                    desc: '',
                    subject: '',
                    tutor_id: 0,
                    organization_id: 1,
                });
                await loadGroups();
            } else {
                setAlertMessage('Ошибка при создании группы');
            }
        } catch (error: any) {
            setAlertMessage(error.message);
        } finally {
            setCreating(false);
        }
    };

    const setAlertMessage = (message: string) => {
        const alertContent = (
            <div>
                <div>Сообщение:</div>
                <div className="font-semibold my-1">{message}</div>
                <div className="text-xs text-gray-500">
                    в {new Date().toLocaleTimeString()}, {new Date().toLocaleDateString()}
                </div>
            </div>
        );
        setAlertMess({ content: alertContent });

        setTimeout(() => {
            setAlertMess({ content: undefined });
        }, 3000);
    };

    const loadGroups = async () => {
        if (!get) return;
        try {
            const res = await get('/get-groups');

            console.log(res)

            const groupsData = res.data.data;

            const uniqueSubjects = groupsData.map((item: any) => item.subject.toString());

            uniqueSubjects.forEach((subject: string) => {
                filterOptions.push({ value: subject, label: subject });
            });

            const newRecords = groupsData.map((item: any) => ({
                id: item.id?.toString(),
                title: `Группа ${item.name}`,
                task_id: item.id,
                columns: [
                    {
                        title: 'Название группы',
                        key: 'name',
                        data: {
                            value: item.name?.toString(),
                            size: 2,
                            isFilter: true
                        }
                    }, {
                        title: 'Предмет',
                        key: 'subject',
                        data: {
                            value: item.subject?.toString(),
                            size: 2,
                            isFilter: true
                        }
                    }, {
                        title: 'Описание',
                        key: 'desc',
                        data: {
                            value: item.desc?.toString() || '—',
                            size: 4,
                        }
                    }, {
                        title: 'Участников',
                        key: 'members',
                        data: {
                            value: item.students?.length || 0,
                            size: 2,
                        }
                    }, {
                        title: 'Создано',
                        key: 'created_at',
                        data: {
                            value: new Date(item.created_at).toLocaleDateString('ru-RU'),
                            size: 2,
                        }
                    },
                ]
            }));

            console.log(newRecords)
            setSearchProps(newRecords);
            setLoading(false)
        } catch (error: any) {
            setAlertMessage(error.message);
            setLoading(false);
        }
    };

    const getTeachers = async () => {
        if (!get) return;
        try {

            const res = await get('/get-users');
            const teacherList = res.data.data
                .filter((item: any) => item.role === 'teacher')
                .map((item: any) => ({ id: item.id, name: item.name }));

            setAllTeachers(teacherList);
        } catch (error) {
            console.error('Error loading teachers:', error);
        }
    };

    // Обработчик изменения фильтра
    const handleFilterChange = (value: string) => {
        setFilterSubject(value);
    };

    // Обработчик клика по строке таблицы
    const handleRowClick = (record: SearchRecord) => {
        if (record.id) {
            router.push(`/groups/${record.id}`);
        }
    };

    if (loading && !user) {
        return (
            <AdminLayout>
                <div className="h-170 flex flex-col items-center justify-center">
                    Загрузка...
                </div>
            </AdminLayout>
        );
    }

    if (user && user?.role != 'admin' && !loading) {
        return notFound();
    }

    return (
        <AdminLayout alertMess={alertMess?.content}>
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Header */}
                    <div className="mb-6">
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                            <Link href='/admin' className="hover:text-main transition-colors">
                                Панель Администратора
                            </Link>
                            <span className="mx-2">/</span>
                            <span>Управление группами</span>
                        </h2>
                        <p className="text-gray-500 text-sm sm:text-base mt-1">
                            Создание и управление учебными группами
                        </p>
                    </div>

                    {/* Форма создания группы */}
                    <form onSubmit={createGroup} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
                        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <div className="p-1.5 bg-main/10 rounded-lg">
                                <Info className="w-5 h-5 text-main" />
                            </div>
                            Создать новую группу
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Название группы <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-main focus:border-transparent transition"
                                    disabled={creating}
                                    placeholder="Введите название группы"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Предмет <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-main focus:border-transparent transition"
                                    disabled={creating}
                                    placeholder="Введите предмет"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Описание группы
                                </label>
                                <textarea
                                    name="desc"
                                    value={formData.desc}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-main focus:border-transparent transition"
                                    disabled={creating}
                                    placeholder="Введите описание группы (необязательно)"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Куратор группы <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="tutor_id"
                                    value={formData.tutor_id}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-main focus:border-transparent transition bg-white"
                                    disabled={creating}
                                >
                                    <option value={0}>Выберите куратора</option>
                                    {allTeachers.map((teacher) => (
                                        <option value={teacher.id} key={teacher.id}>
                                            {teacher.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mt-4">
                            <button
                                type="submit"
                                disabled={creating || !formData.name.trim() || !formData.subject.trim() || !formData.tutor_id}
                                className="px-6 py-2 bg-main text-white font-medium rounded-lg hover:bg-main-dark disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                            >
                                {creating ? 'Создание...' : 'Создать группу'}
                            </button>
                        </div>
                    </form>

                    {/* Таблица с фильтрацией */}
                    {loading ? (
                        <div className="text-center py-8 text-gray-500 border-2 border-main rounded-lg bg-white">
                            Загрузка данных...
                        </div>
                    ) : (
                        <SearchTable
                            searchProps={searchProps}
                            onRowClick={handleRowClick}
                            filterOptions={filterOptions}
                            filterField="subject"
                            onFilterChange={handleFilterChange}
                        />
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
'use client'

import { useAuth } from "@/context/authContext";
import AdminLayout from "@/layouts/AdminLayout";
import Link from "next/link";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { notFound, useRouter } from 'next/navigation';
import SearchTable, { SearchRecord } from "@/components/searchTable/SearchTable";
import Alert from "@/components/alert/Alert";
import AdminLoader from "@/components/adminLoader/AdminLoader";

interface Booking {
    id: number;
    name: string;
    surname: string;
    email: string;
    tel: string;
    target: string;
    status: 'waiting' | 'done' | 'canceled';
    group?: string;
    organization?: string;
    messanger?: string;
}

export default function BookingsPage() {
    const router = useRouter();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [alertMess, setAlertMess] = useState<{ content: any }>();

    const auth = useAuth();

    if (!auth) {
        return null;
    }

    const { user, get } = auth;

    useEffect(() => {
        if (user) {
            loadBookings();
        }
    }, [user]);

    const loadBookings = async () => {
        try {
            setLoading(true);
            const response = await get('get-bookings');

            if (response && response.success === false) {
                throw new Error(response.message);
            }

            const bookingsData = response?.data.data || response.data || [];
            setBookings(bookingsData);
        } catch (error) {
            console.error('Ошибка загрузки заявок:', error);
            showAlert('Ошибка загрузки заявок', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showAlert = (message: string, type: 'success' | 'error' = 'success') => {
        const alertContent = (
            <div>
                <div>{type === 'success' ? 'Сообщение:' : 'Ошибка:'}</div>
                <div className="font-semibold my-1">{message}</div>
                <div className="text-xs text-gray-500">
                    в {new Date().toLocaleTimeString()}, {new Date().toLocaleDateString()}
                </div>
            </div>
        );
        setAlertMess({ content: alertContent });

        setTimeout(() => {
            setAlertMess(undefined);
        }, 5000);
    };

    const getStatusText = (status: string): string => {
        const statuses: Record<string, string> = {
            'waiting': 'Ожидает',
            'done': 'Одобрена',
            'canceled': 'Отклонена'
        };
        return statuses[status] || status;
    };

    const getStatusColor = (status: string): string => {
        const colors: Record<string, string> = {
            'waiting': 'text-yellow-600 bg-yellow-50',
            'done': 'text-green-600 bg-green-50',
            'canceled': 'text-red-600 bg-red-50'
        };
        return colors[status] || 'text-gray-600 bg-gray-50';
    };

    // Фильтруем заявки по статусу
    const filteredBookings = useMemo(() => {
        if (!filterStatus) {
            return bookings;
        }
        return bookings.filter(b => b.status === filterStatus);
    }, [bookings, filterStatus]);

    // Преобразуем заявки в формат SearchTable
    const searchTableData = useMemo<SearchRecord[]>(() => {
        return filteredBookings.map(booking => ({
            id: booking.id,
            columns: [
                {
                    title: '№ заявки',
                    key: 'id',
                    data: {
                        value: booking.id.toString(),
                        size: 1,
                        isFilter: false
                    }
                },
                {
                    title: 'Отправитель',
                    key: 'fullname',
                    data: {
                        value: `${booking.surname} ${booking.name}`,
                        size: 2,
                        isFilter: true
                    }
                },
                {
                    title: 'Цель',
                    key: 'target',
                    data: {
                        value: booking.target,
                        size: 2,
                        isFilter: true
                    }
                },
                {
                    title: 'Обратная связь',
                    key: 'contacts',
                    data: {
                        value: booking.email || booking.tel,
                        size: 2,
                        isFilter: true
                    }
                },
                {
                    title: 'Статус',
                    key: 'status',
                    data: {
                        value: getStatusText(booking.status),
                        size: 1,
                        isFilter: true,
                        add: `w-full text-xs font-medium ${getStatusColor(booking.status)} inline-block`
                    }
                }
            ]
        }));
    }, [filteredBookings]);

    // Обработчик клика по строке - переход на страницу заявки
    const handleRowClick = useCallback((record: SearchRecord) => {
        router.push(`/admin/register/${record.id}`);
    }, [router]);

    // Обработчик фильтрации по статусу
    const handleStatusFilter = useCallback((status: string) => {
        setFilterStatus(status);
    }, []);

    // Статистика
    const stats = useMemo(() => {
        return {
            total: bookings.length,
            waiting: bookings.filter(b => b.status === 'waiting').length,
            done: bookings.filter(b => b.status === 'done').length,
            canceled: bookings.filter(b => b.status === 'canceled').length
        };
    }, [bookings]);

    const filterOptions = [
        { value: 'refresh', label: 'Забыли пароль' },
        { value: 'register', label: 'Регистрация' },
    ];

    if (loading) {
        return (
            <AdminLoader />
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
                    <span>Управление Заявками</span>
                </h2>
                <p className="text-gray-600 mt-2">
                    Всего заявок: {stats.total}
                </p>
            </div>

            {/* Кликабельные карточки статистики */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div
                    className={`p-4 rounded-lg border cursor-pointer transition-all transform hover:scale-105 ${filterStatus === ''
                        ? 'bg-gray-200 border-gray-400 shadow-md'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                    onClick={() => handleStatusFilter('')}
                >
                    <div className="text-sm text-gray-600 font-semibold">Всего заявок</div>
                    <div className="text-2xl font-bold text-gray-700">{stats.total}</div>
                    <div className="text-xs text-gray-500 mt-1">Все заявки</div>
                </div>

                <div
                    className={`p-4 rounded-lg border cursor-pointer transition-all transform hover:scale-105 ${filterStatus === 'waiting'
                        ? 'bg-yellow-200 border-yellow-400 shadow-md'
                        : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
                        }`}
                    onClick={() => handleStatusFilter('waiting')}
                >
                    <div className="text-sm text-yellow-600 font-semibold">Ожидают</div>
                    <div className="text-2xl font-bold text-yellow-700">{stats.waiting}</div>
                    <div className="text-xs text-yellow-600 mt-1">Требуют внимания</div>
                </div>

                <div
                    className={`p-4 rounded-lg border cursor-pointer transition-all transform hover:scale-105 ${filterStatus === 'done'
                        ? 'bg-green-200 border-green-400 shadow-md'
                        : 'bg-green-50 border-green-200 hover:bg-green-100'
                        }`}
                    onClick={() => handleStatusFilter('done')}
                >
                    <div className="text-sm text-green-600 font-semibold">Одобрены</div>
                    <div className="text-2xl font-bold text-green-700">{stats.done}</div>
                    <div className="text-xs text-green-600 mt-1">Успешно обработаны</div>
                </div>

                <div
                    className={`p-4 rounded-lg border cursor-pointer transition-all transform hover:scale-105 ${filterStatus === 'canceled'
                        ? 'bg-red-200 border-red-400 shadow-md'
                        : 'bg-red-50 border-red-200 hover:bg-red-100'
                        }`}
                    onClick={() => handleStatusFilter('canceled')}
                >
                    <div className="text-sm text-red-600 font-semibold">Отклонены</div>
                    <div className="text-2xl font-bold text-red-700">{stats.canceled}</div>
                    <div className="text-xs text-red-600 mt-1">Отклоненные заявки</div>
                </div>
            </div>

            {/* Таблица заявок */}
            <div className="bg-white rounded-lg shadow-sm">
                <SearchTable
                    searchProps={searchTableData}
                    actions={[]}
                    filterOptions={filterOptions}
                    filterField="target"
                    onFilterChange={handleStatusFilter}
                    onRowClick={handleRowClick}
                    disableInternalFilter={false}
                />
            </div>

            <Alert alert={alertMess?.content} />
        </AdminLayout>
    );
}
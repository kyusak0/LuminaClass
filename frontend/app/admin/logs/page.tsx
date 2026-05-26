'use client'

import Alert from "@/components/alert/Alert";
import Loader from "@/components/loader/Loader";
import SearchTable, { SearchRecord } from "@/components/searchTable/SearchTable";
import { useAuth } from "@/context/authContext";
import AdminLayout from "@/layouts/AdminLayout";
import { useEffect, useState } from "react";

interface LogItem {
    id: number;
    action: string;
    ip: string;
    user: {
        id: number;
        name: string;
    };
    created_at?: string;
    updated_at?: string;
}

export default function LogsPage() {
    const [loading, setLoading] = useState(true);
    const [searchTableData, setSearchTableData] = useState<SearchRecord[]>([]);
    const [filterOptions, setFilterOptions] = useState<{ value: string; label: string }[]>([]);
    const [alertMess, setAlertMess] = useState<{ content: any }>();
    const auth = useAuth();

    if (!auth) {
        return null;
    }

    const { get, loading: authLoading } = auth;

    const showAlert = (message: string, type: 'success' | 'error' = 'error') => {
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

    const getLogs = async () => {
        try {
            setLoading(true);
            const res = await get('/get-logs');
            
            if (!res || res.success === false) {
                throw new Error(res?.message || 'Ошибка загрузки логов');
            }

            // Предполагаем, что данные могут быть в res.data или просто res
            const logsData = res.data.data || res.data;

            // Формируем данные для таблицы
            const tableData: SearchRecord[] = logsData.map((item: LogItem) => ({
                id: item.id,
                columns: [
                    {
                        title: '№ лога',
                        key: 'id',
                        data: {
                            value: item.id.toString(),
                            size: 1,
                            isFilter: true
                        }
                    },
                    {
                        title: 'Событие',
                        key: 'action',
                        data: {
                            value: item.action,
                            size: 2,
                            isFilter: true
                        }
                    },
                    {
                        title: 'Пользователь',
                        key: 'user_name',
                        data: {
                            value: item.user?.name || 'Неизвестный пользователь',
                            size: 2,
                            isFilter: true
                        }
                    },
                    {
                        title: 'ip пользователя',
                        key: 'user_ip',
                        data: {
                            value: item.ip || '—',
                            size: 2,
                            isFilter: true
                        }
                    },
                    {
                        title: 'Дата и время',
                        key: 'created_at',
                        data: {
                            value: item.created_at 
                                ? new Date(item.created_at).toLocaleString('ru-RU')
                                : '—',
                            size: 2,
                            isFilter: false
                        }
                    }
                ]
            }));

            setSearchTableData(tableData);

            // Формируем опции фильтрации по событиям (уникальные действия)
            const uniqueActions = new Map<string, string>();
            logsData.forEach((item: LogItem) => {
                if (item.action && !uniqueActions.has(item.action)) {
                    uniqueActions.set(item.action, item.action);
                }
            });

            const filterOpts = Array.from(uniqueActions.entries()).map(([value, label]) => ({
                value: value,
                label: label
            }));

            setFilterOptions(filterOpts);

        } catch (error: any) {
            console.error('Error loading logs:', error);
            showAlert(error.message || 'Не удалось загрузить логи', 'error');
            setSearchTableData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusFilter = (value: string) => {
        // Фильтрация уже обрабатывается внутри SearchTable
        console.log('Filter changed:', value);
    };

    const handleRowClick = (record: SearchRecord) => {
        // Действие при клике на строку
        console.log('Clicked log:', record);
        // Можно открыть модальное окно с деталями лога
        const logId = record.id;
        const action = record.columns.find(col => col.key === 'action')?.data.value;
        const user = record.columns.find(col => col.key === 'user_name')?.data.value;
        
        showAlert(`Лог #${logId}: ${action} (${user})`, 'success');
    };

    useEffect(() => {
        getLogs();
    }, []);

    if (authLoading || loading) {
        return <Loader />;
    }

    return (
        <AdminLayout>
            <div className="container mx-auto px-4 py-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Журнал событий</h1>
                    <p className="text-gray-500 mt-1">Просмотр всех действий пользователей системы</p>
                </div>

                <SearchTable
                    searchProps={searchTableData}
                    actions={[]}
                    filterOptions={filterOptions}
                    filterField="action"
                    onFilterChange={handleStatusFilter}
                    onRowClick={handleRowClick}
                    disableInternalFilter={false}
                    hideSearch={false}
                    hideFilters={filterOptions.length === 0}
                />

                {searchTableData.length === 0 && !loading && (
                    <div className="text-center py-10 bg-gray-50 rounded-lg border">
                        <p className="text-gray-500">Логи не найдены</p>
                    </div>
                )}
            </div>
            
            <Alert alert={alertMess?.content} />
        </AdminLayout>
    );
}
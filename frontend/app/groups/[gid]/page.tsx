'use client'

import SearchTable, { SearchRecord } from "@/components/searchTable/SearchTable";
import MainLayout from "@/layouts/MainLayout";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/authContext";

export default function GroupPage() {
    const params = useParams();
    const { get, post, user } = useAuth() || {};

    const [group, setGroup] = useState<{ 
        id: number, 
        name: string, 
        desc: string,
        subject: string,
        teacher: string, 
        teacherId: number, 
        orgId: number, 
        orgName: string 
    }>();
    const [searchProps, setSearchProps] = useState<SearchRecord[]>([]);
    const [availableStudents, setAvailableStudents] = useState<{ id: number, name: string }[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [alertMess, setAlertMess] = useState<{ content: any }>();
    const [studentFilter, setStudentFilter] = useState(''); // Фильтр для поиска студентов

    // Создаем filterOptions для таблицы на основе студентов в группе
    const filterOptions = useMemo(() => {
        const options = searchProps.map(record => ({
            value: record.columns[1]?.data?.value?.toString() || '',
            label: record.columns[1]?.data?.value?.toString() || ''
        }));
        
        // Убираем дубликаты и пустые значения
        const uniqueOptions = Array.from(
            new Map(options.map(opt => [opt.value, opt])).values()
        ).filter(opt => opt.value && opt.value !== '');
        
        return uniqueOptions;
    }, [searchProps]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const groupData = await getGroupInfo(Number(params.gid));
        await loadAvailableStudents(groupData?.existingStudentIds || []);
    };

    const getGroupInfo = async (id: number) => {
        if (!get) return;
        try {
            const res = await get(`/get-group-info/${id}`);
            const data = res.data || res;
            console.log(data);

            // Получаем ID студентов, которые уже в группе
            const existingStudentIds = data.students?.map((item: any) => item?.user?.id) || [];

            setGroup({ 
                id: data?.id, 
                name: data?.name, 
                desc: data?.desc,
                subject: data?.subject,
                teacherId: data?.teacher?.tutor_id, 
                teacher: data?.teacher?.user?.name, 
                orgId: data?.organization?.id, 
                orgName: data?.organization?.name 
            });

            const newRecords = data.students?.map((item: any) => ({
                id: item.id?.toString(),
                title: `${item.user?.name}`,
                columns: [
                    {
                        title: 'ID студента',
                        key: 'user_id',
                        data: {
                            value: item?.user?.id,
                            size: 2,
                            isFilter: true
                        }
                    },{
                        title: 'Имя студента',
                        key: 'user_name',
                        data: {
                            value: item?.user?.name,
                            size: 6,
                            isFilter: true
                        }
                    },{
                        title: 'Присоединен',
                        key: 'created_at',
                        data: {
                            value: new Date(item?.created_at).toLocaleDateString(),
                            size: 4,
                            isFilter: true
                        }
                    },
                ]
            })) || [];

            setSearchProps(newRecords);
            setLoading(false);
            
            return { existingStudentIds };
        } catch (error: any) {
            setAlertMessage(error.message);
            setLoading(false);
            return { existingStudentIds: [] };
        }
    };

    const loadAvailableStudents = async (existingStudentIds: number[]) => {
        if (!get) return;
        try {
            const res = await get('/get-users');
            const data: any = res.data || res;

            const newItems = data
                .filter((item: any) => 
                    item.role === 'student' && 
                    !existingStudentIds.includes(item.id)
                )
                .map((item: any) => ({
                    id: item.id,
                    name: item.name
                }));
            setAvailableStudents(newItems);
        } catch (error) {
            console.error('Error loading students:', error);
        }
    };

    // Фильтрация доступных студентов
    const filteredAvailableStudents = availableStudents.filter(student =>
        student.name.toLowerCase().includes(studentFilter.toLowerCase())
    );

    const handleStudentSelect = (studentId: number) => {
        setSelectedStudents(prev => {
            if (prev.includes(studentId)) {
                return prev.filter(id => id !== studentId);
            } else {
                return [...prev, studentId];
            }
        });
    };

    const handleSelectAll = () => {
        if (selectedStudents.length === filteredAvailableStudents.length && filteredAvailableStudents.length > 0) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(filteredAvailableStudents.map(s => s.id));
        }
    };

    const addSelectedStudents = async () => {
        if (selectedStudents.length === 0) {
            setAlertMessage('Выберите хотя бы одного студента');
            return;
        }

        if (!post || !group?.id) return;

        setAdding(true);
        let successCount = 0;
        let errorCount = 0;

        try {
            // Добавляем студентов по одному
            for (const studentId of selectedStudents) {
                try {
                    const funcRole = {
                        role: 'student',
                        id_owner: studentId,
                        id_knave: group.id,
                    };

                    await post('/funcrole', funcRole);
                    successCount++;
                } catch (error) {
                    console.error(`Error adding student ${studentId}:`, error);
                    errorCount++;
                }
            }

            // Показываем результат
            if (successCount > 0) {
                setAlertMessage(`Успешно добавлено ${successCount} студент(ов)${errorCount > 0 ? `, ошибок: ${errorCount}` : ''}`);
                
                // Очищаем выбор и фильтр
                setSelectedStudents([]);
                setStudentFilter('');
                
                // Обновляем данные
                await loadData();
            } else if (errorCount > 0) {
                setAlertMessage(`Ошибка при добавлении студентов: ${errorCount} ошибок`);
            }
        } catch (error: any) {
            setAlertMessage(error.message);
        } finally {
            setAdding(false);
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

    const handleDelete = async (record: SearchRecord) => {
        const studentName = record.columns[1].data.value;
        const studentId = record.columns[0].data.value;
        
        if (!confirm(`Удалить студента "${studentName}" из группы?`)) {
            return;
        }
        
        if (!post || !group?.id) return;
        
        try {
            const funcRole = {
                student_id: studentId,
                group_id: group.id,
            };
            
            const res = await post('/remove-student', funcRole);
            
            setAlertMessage(res.message || `Студент "${studentName}" удален из группы`);
            
            // Обновляем данные
            await loadData();
            
        } catch (error: any) {
            setAlertMessage(error.message);
        }
    };

    // Обработчик клика по строке таблицы
    const handleRowClick = (record: SearchRecord) => {
        window.location.href = `/users/${record.columns[0].data.value}`;
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="h-170 flex flex-col items-center justify-center">
                    Загрузка...
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout alertMess={alertMess?.content}>
            <div className="mb-6">
                <div className="flex items-end gap-5 mb-4">
                    <h2 className="text-4xl font-bold">
                        {group?.name}
                    </h2>
                </div>
                
                {group?.desc && (
                    <div className="mb-3 text-gray-600">
                        <span className="font-semibold">Описание:</span> {group.desc}
                    </div>
                )}
                
                <div className="mb-2">
                    <span className="font-semibold">Предмет:</span> {group?.subject}
                </div>
                
                <div>
                    <span className="font-semibold">Куратор группы:</span>{' '}
                    <Link href={`/users/${group?.teacherId}`} className="text-main hover:underline">
                        {group?.teacher}
                    </Link>
                </div>
            </div>

            {/* Форма добавления студентов */}
            {availableStudents.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h3 className="text-xl font-semibold mb-4">Добавить учащихся</h3>
                    
                    {/* Поле поиска */}
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Поиск по имени..."
                            value={studentFilter}
                            onChange={(e) => setStudentFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-main focus:border-transparent"
                        />
                    </div>
                    
                    <div className="mb-4 max-h-64 overflow-y-auto border rounded-lg">
                        <table className="min-w-full">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selectedStudents.length === filteredAvailableStudents.length && filteredAvailableStudents.length > 0}
                                            onChange={handleSelectAll}
                                            className="w-4 h-4 text-main rounded"
                                        />
                                    </th>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">ID</th>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Имя студента</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredAvailableStudents.map((student) => (
                                    <tr key={student.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedStudents.includes(student.id)}
                                                onChange={() => handleStudentSelect(student.id)}
                                                className="w-4 h-4 text-main rounded"
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-900">{student.id}</td>
                                        <td className="px-4 py-2 text-sm text-gray-900">{student.name}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredAvailableStudents.length === 0 && (
                            <div className="text-center py-4 text-gray-500">
                                {studentFilter ? 'Студенты не найдены' : 'Нет доступных студентов'}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex gap-3">
                        <button
                            onClick={addSelectedStudents}
                            disabled={adding || selectedStudents.length === 0}
                            className="px-6 py-2 bg-main text-white font-medium rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            {adding ? 'Добавление...' : `Добавить выбранных (${selectedStudents.length})`}
                        </button>
                        {selectedStudents.length > 0 && (
                            <button
                                onClick={() => setSelectedStudents([])}
                                className="px-6 py-2 bg-gray-500 text-white font-medium rounded-md hover:bg-gray-600 transition-colors"
                            >
                                Очистить выбор
                            </button>
                        )}
                    </div>
                </div>
            )}

            {availableStudents.length === 0 && searchProps.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 mb-8 text-center text-gray-500">
                    Все студенты уже добавлены в группу
                </div>
            )}

            {/* Таблица студентов */}
            <h3 className="text-xl font-semibold mb-4">Список учащихся</h3>
            {searchProps.length > 0 ? (
                <SearchTable 
                    searchProps={searchProps} 
                    onRowClick={handleRowClick}
                    filterOptions={filterOptions}
                    filterField="user_name"
                    actions={[
                        {
                            label: '',
                            icon: '❌',
                            onClick: handleDelete,
                            className: 'text-red-600 hover:text-red-800 text-sm px-2 py-1'
                        }
                    ]} 
                />
            ) : (
                <div className="text-center py-8 text-gray-500 border rounded-lg">
                    В группе пока нет учащихся
                </div>
            )}
        </MainLayout>
    );
}
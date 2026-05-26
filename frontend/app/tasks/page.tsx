'use client'

import SearchTable, { SearchRecord } from "@/components/searchTable/SearchTable";
import MainLayout from "@/layouts/MainLayout";
import { useAuth } from "@/context/authContext";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import RequiredSymbol from "@/components/requiredSymbol/RequiredSymbol";
import JSZip from 'jszip';
import axios from '@/lib/axios.config';

export default function TaskPage() {
    const router = useRouter();
    const auth = useAuth()
    const { get, post, user, loading: authLoading } = auth || {};
    const [loading, setLoading] = useState(true);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [disabled, setDisabled] = useState(true);
    const [creating, setCreating] = useState(false);
    const [files, setFiles] = useState<{ id: number | string, name: string }[]>([]);
    const [groups, setGroups] = useState<{ id: number, name: string, subject: string }[]>([]);
    const [existFile, setExistFile] = useState(false);
    const [searchProps, setSearchProps] = useState<SearchRecord[]>([]);
    const [alertMess, setAlertMess] = useState<{ content: any }>();
    const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
    const [archiving, setArchiving] = useState(false);

    // Состояния для фильтров
    const [selectedTeacherFilter, setSelectedTeacherFilter] = useState('');
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('');

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            router.push('/login');
            return;
        }

        loadUser();
        getTasks();
        getGroups();
        getFiles();
    }, [user, authLoading]);

    const loadUser = async () => {
        try {
            setLoading(false);
        } catch (error) {
            console.error('Ошибка загрузки пользователя:', error);
            router.push('/login');
        }
    };

    const getFiles = async () => {
        if (!get) return;
        try {
            const res = await get('/get-files');
            setFiles([]);
            let records: Array<any> = [];

            // Проверяем структуру ответа
            const filesData = res.data || res;
            
            (Array.isArray(filesData) ? filesData : []).forEach((item: any) => {
                if (item.author_id == user?.id) {
                    records.push({ id: item.id, name: item.original_name });
                }
            });
            setFiles(prev => [...prev, ...records]);
        } catch (error) {
            console.error('Ошибка загрузки файлов:', error);
        }
    };

    const validateForm = (formData: any) => {
        const errors: { [key: string]: string } = {};

        if (!formData.title?.trim()) {
            errors.title = 'Название задания обязательно';
        }

        if (!formData.group || formData.group === '0') {
            errors.group = 'Выберите группу';
        }

        if (!existFile && selectedFiles.length === 0) {
            errors.file = 'Выберите хотя бы один файл';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const createZipArchive = async (files: File[]): Promise<File> => {
        setArchiving(true);
        const zip = new JSZip();

        for (const file of files) {
            const arrayBuffer = await file.arrayBuffer();
            zip.file(file.name, arrayBuffer);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipFileName = `task_files_${Date.now()}.zip`;
        const zipFile = new File([zipBlob], zipFileName, { type: 'application/zip' });

        setArchiving(false);
        return zipFile;
    };

    const uploadFile = async (file: File, customFileName?: string): Promise<number> => {
        const formData = new FormData();
        const fileName = customFileName || file.name;
        formData.append('file', file, fileName);
        formData.append('author_id', user?.id.toString() || '1');

        // Используем axios напрямую для загрузки файла
        const response = await axios.post('/save-file', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        
        return response.data.file_id;
    };

    const createTask = async (e: FormEvent) => {
        e.preventDefault();
        if (!post || !user) return;

        const form: any = e.target;

        if (!validateForm({
            title: form.title.value,
            group: form.group.value
        })) {
            return;
        }

        setCreating(true);

        try {
            let fileId = null;

            if (existFile) {
                fileId = form.file.value;
                if (!fileId || fileId === '') {
                    setFormErrors({ ...formErrors, file: 'Выберите файл' });
                    setCreating(false);
                    return;
                }
            } else if (selectedFiles.length > 0) {
                if (selectedFiles.length === 1) {
                    const fileName = prompt(`Название для файла \n по умолчанию: ${selectedFiles[0].name}`) || selectedFiles[0].name;
                    fileId = await uploadFile(selectedFiles[0], fileName);
                } else if (selectedFiles.length > 1) {
                    const zipFile = await createZipArchive(selectedFiles);
                    const fileName = prompt('Название для архива', zipFile.name) || zipFile.name;
                    fileId = await uploadFile(zipFile, fileName);
                }
            }

            const newData = {
                group_id: parseInt(form.group.value),
                task_id: fileId,
                title: form.title.value.trim(),
                description: form.desc.value?.trim() || 'без описания',
                deadline: form.deadline.value || null,
                user_id: user?.id || 0,
            };

            const res = await post('/create-task', newData);

            form.reset();
            setSelectedFiles([]);
            setExistFile(false);
            setFormErrors({});

            const filesCount = selectedFiles.length;
            const alertContent = (
                <div>
                    <div>✓ Задание успешно создано!</div>
                    <div className="font-semibold my-1">{res.message}</div>
                    {filesCount > 1 && (
                        <div className="text-sm text-main">
                            {filesCount} файлов упакованы в ZIP архив
                        </div>
                    )}
                    <div className="text-xs text-gray-500">
                        в {new Date().toLocaleTimeString()}, {new Date().toLocaleDateString()}
                    </div>
                </div>
            );
            setAlertMess({ content: alertContent });

            await getTasks();
        } catch (error: any) {
            console.error('Ошибка при создании задания:', error);
            const alertContent = (
                <div>
                    <div>❌ Ошибка при создании задания:</div>
                    <div className="font-semibold my-1">{error.response?.data?.message || error.message || 'Неизвестная ошибка'}</div>
                    <div className="text-xs text-gray-500">
                        в {new Date().toLocaleTimeString()}, {new Date().toLocaleDateString()}
                    </div>
                </div>
            );
            setAlertMess({ content: alertContent });
        } finally {
            setCreating(false);
        }
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const filesArray = Array.from(e.target.files);
            setSelectedFiles(filesArray);
            setDisabled(false);
            if (formErrors.file) {
                setFormErrors({ ...formErrors, file: '' });
            }
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        if (selectedFiles.length === 1) {
            setDisabled(true);
        }
    };

    const getTasks = async () => {
        if (!get) return;
        try {
            const res = await get('/get-tasks');
            let tasksData = res.data.data || [];

            let filteredData: any = [];
            
            if (user?.role === 'student' && user?.id) {
                tasksData.forEach((item: any) => {
                    const studentGroupIds = item.group.students?.map((student: any) => student.student_id) || [];
                    if (studentGroupIds.includes(user?.id)) {
                        filteredData.push(item);
                    }
                });
            } else {
                filteredData = tasksData;
            }

            const newRecords = filteredData.map((item: any) => ({
                id: item.id?.toString(),
                task_id: item.group?.id,
                title: item.title,
                columns: [
                    {
                        title: 'Задание',
                        key: 'title',
                        data: {
                            value: item.title,
                            size: 3,
                            isFilter: true
                        }
                    },
                    {
                        title: 'Учитель',
                        key: 'teacher',
                        data: {
                            value: item.user?.name || '—',
                            size: 2,
                            isFilter: true
                        }
                    },
                    {
                        title: 'Группа',
                        key: 'group',
                        data: {
                            value: item.group?.name || '—',
                            size: 2,
                            isFilter: true
                        }
                    },
                    {
                        title: 'Предмет',
                        key: 'subject',
                        data: {
                            value: item.group?.subject || '—',
                            size: 2,
                            isFilter: true
                        }
                    },
                    {
                        title: 'Срок сдачи',
                        key: 'deadline',
                        data: {
                            value: item.deadline,
                            size: 2,
                            add: `${Date.parse(item.deadline) <= Date.now() ? 'text-red-600' : ''}`
                        }
                    },
                    {
                        title: 'Ответы',
                        key: 'answers_count',
                        data: {
                            value: item.answers?.length || 0,
                            size: 1,
                            isFilter: true
                        }
                    },
                ]
            }));

            setSearchProps(newRecords);
        } catch (error) {
            console.error('Ошибка загрузки заданий:', error);
        }
    };

    const getGroups = async () => {
        try {
            if (!get) return;
            const res = await get('/get-groups');
            
            const groupRecords = res.data?.data?.filter((item: any) => {
                if (user?.role === 'admin') return true;
                if (user?.role === 'teacher') return item.teacher?.tutor_id === user.id;
                if (user?.role === 'student') {
                    // Для студентов показываем только их группы
                    return item.students?.some((student: any) => student.student_id === user.id);
                }
                return false;
            }).map((item: any) => ({
                id: item.id,
                name: item.name,
                subject: item.subject || '—',
                tutor_id: item.teacher?.tutor_id
            })) || [];

            setGroups(groupRecords);
        } catch (error) {
            console.log(error);
        }
    };

    // Получаем уникальных учителей для фильтрации
    const teacherFilterOptions = () => {
        const uniqueTeachers = new Map();

        searchProps.forEach(record => {
            const teacherColumn = record.columns.find(col => col.key === 'teacher');
            const teacherName = teacherColumn?.data.value;
            if (teacherName && teacherName !== '' && teacherName !== '—') {
                uniqueTeachers.set(teacherName, teacherName);
            }
        });

        const options = Array.from(uniqueTeachers.keys()).map(teacher => ({
            value: teacher,
            label: teacher
        }));

        return [
            { value: '', label: 'Все учителя' },
            ...options
        ];
    };

    // Получаем уникальные предметы для фильтрации
    const subjectFilterOptions = () => {
        const uniqueSubjects = new Map();

        searchProps.forEach(record => {
            const subjectColumn = record.columns.find(col => col.key === 'subject');
            const subject = subjectColumn?.data.value;
            if (subject && subject !== '' && subject !== '—') {
                uniqueSubjects.set(subject, subject);
            }
        });

        const options = Array.from(uniqueSubjects.keys()).map(subject => ({
            value: subject,
            label: subject
        }));

        return [
            { value: '', label: 'Все предметы' },
            ...options
        ];
    };

    // Фильтрация данных по учителю и предмету
    const getFilteredData = () => {
        let filtered = searchProps;

        // Фильтр по учителю
        if (selectedTeacherFilter) {
            filtered = filtered.filter(record => {
                const teacherColumn = record.columns.find(col => col.key === 'teacher');
                return teacherColumn?.data.value === selectedTeacherFilter;
            });
        }

        // Фильтр по предмету
        if (selectedSubjectFilter) {
            filtered = filtered.filter(record => {
                const subjectColumn = record.columns.find(col => col.key === 'subject');
                return subjectColumn?.data.value === selectedSubjectFilter;
            });
        }

        return filtered;
    };

    // Обработчик клика по строке таблицы
    const handleRowClick = (record: SearchRecord) => {
        if (record.id) {
            router.push(`/tasks/${record.id}`);
        }
    };

    if (authLoading || (loading && !user)) {
        return (
            <div className="h-170 flex flex-col items-center justify-center">
                <div className="text-lg">Загрузка...</div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <MainLayout alertMess={alertMess?.content}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-4xl font-bold mb-8">
                    Задания —
                    {user?.role === 'admin' ? (
                        <span className="text-green-600"> Администратор</span>
                    ) : user?.role === 'teacher' ? (
                        <span className="text-main"> Учитель</span>
                    ) : user?.role === 'student' ? (
                        <span className="text-purple-600"> Ученик</span>
                    ) : user?.role === 'parent' ? (
                        <span className="text-orange-600"> Родитель</span>
                    ) : (
                        <span> без роли</span>
                    )}
                </h2>

                {(user?.role === 'admin' || user?.role === 'teacher') && (
                    <div className="mb-10 bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
                            <h3 className="text-xl font-semibold text-white">Создать новое задание</h3>
                        </div>

                        <form className="p-6" onSubmit={createTask}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Название задания */}
                                <div className="col-span-1 md:col-span-2">
                                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                                        Название задания <RequiredSymbol />
                                    </label>
                                    <input
                                        id="title"
                                        name="title"
                                        type="text"
                                        required
                                        placeholder="Введите название задания"
                                        className={`w-full px-4 py-2 border ${formErrors.title ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition`}
                                    />
                                    {formErrors.title && (
                                        <p className="mt-1 text-sm text-red-500">{formErrors.title}</p>
                                    )}
                                </div>

                                {/* Группа */}
                                <div>
                                    <label htmlFor="group" className="block text-sm font-medium text-gray-700 mb-2">
                                        Группа <RequiredSymbol />
                                    </label>
                                    <select
                                        name="group"
                                        id="group"
                                        className={`w-full px-4 py-2 border ${formErrors.group ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition bg-white`}
                                    >
                                        <option value="0">Выберите группу</option>
                                        {groups.map((group: any) => (
                                            <option value={group.id?.toString()} key={group.id}>
                                                {group.name} {group.subject && `(${group.subject})`}
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors.group && (
                                        <p className="mt-1 text-sm text-red-500">{formErrors.group}</p>
                                    )}
                                </div>

                                {/* Срок сдачи */}
                                <div>
                                    <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-2">
                                        Срок сдачи
                                    </label>
                                    <input
                                        id="deadline"
                                        name="deadline"
                                        type="date"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Необязательное поле</p>
                                </div>

                                {/* Описание */}
                                <div className="col-span-1 md:col-span-2">
                                    <label htmlFor="desc" className="block text-sm font-medium text-gray-700 mb-2">
                                        Описание
                                    </label>
                                    <textarea
                                        id="desc"
                                        name="desc"
                                        rows={3}
                                        placeholder="Введите описание задания"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition resize-y"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Необязательное поле</p>
                                </div>

                                {/* Файл */}
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Файл <RequiredSymbol />
                                    </label>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                name="exists-file"
                                                id="exists-file"
                                                checked={existFile}
                                                onChange={(e) => {
                                                    setExistFile(e.target.checked);
                                                    if (e.target.checked && files.length === 0) {
                                                        getFiles();
                                                    }
                                                    if (formErrors.file) {
                                                        setFormErrors({ ...formErrors, file: '' });
                                                    }
                                                }}
                                                className="w-4 h-4 text-green-600 focus:ring-green-500"
                                            />
                                            <label htmlFor="exists-file" className="text-sm text-gray-700">
                                                Использовать существующий файл
                                            </label>
                                        </div>

                                        {existFile ? (
                                            <select
                                                name="file"
                                                id="file"
                                                className={`w-full px-4 py-2 border ${formErrors.file ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition bg-white`}
                                            >
                                                <option value="">Выберите файл</option>
                                                {files.map((item: any) => (
                                                    <option value={item.id} key={item.id}>
                                                        {item.name}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div>
                                                <input
                                                    type="file"
                                                    name="file"
                                                    multiple
                                                    className={`w-full px-4 py-2 border ${formErrors.file ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition`}
                                                    onChange={handleFileChange}
                                                />

                                                {selectedFiles.length > 0 && (
                                                    <div className="mt-3 space-y-2">
                                                        <p className="text-sm font-medium text-gray-700">
                                                            Выбрано файлов: {selectedFiles.length}
                                                            {selectedFiles.length > 1 && (
                                                                <span className="ml-2 text-main">
                                                                    (будут упакованы в ZIP архив)
                                                                </span>
                                                            )}
                                                        </p>
                                                        <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                                                            {selectedFiles.map((file, index) => (
                                                                <div key={index} className="flex items-center justify-between py-1 px-2 hover:bg-gray-50 rounded">
                                                                    <span className="text-sm text-gray-600 truncate flex-1">
                                                                        {file.name} ({(file.size / 1024).toFixed(2)} KB)
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeFile(index)}
                                                                        className="text-red-500 hover:text-red-700 text-xs ml-2"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {formErrors.file && (
                                                    <p className="mt-2 text-sm text-red-500">{formErrors.file}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={creating || archiving}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {creating ? (
                                        'Создание...'
                                    ) : archiving ? (
                                        'Архивация файлов...'
                                    ) : (
                                        'Создать задание'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Панель фильтров */}
                <div className="mb-6 flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Фильтр по учителю
                        </label>
                        <select
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition bg-white"
                            value={selectedTeacherFilter}
                            onChange={(e) => setSelectedTeacherFilter(e.target.value)}
                        >
                            {teacherFilterOptions().map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Фильтр по предмету
                        </label>
                        <select
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition bg-white"
                            value={selectedSubjectFilter}
                            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                        >
                            {subjectFilterOptions().map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => {
                            setSelectedTeacherFilter('');
                            setSelectedSubjectFilter('');
                        }}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                        Сбросить фильтры
                    </button>

                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        Обновить
                    </button>
                </div>

                {/* Таблица с отфильтрованными данными */}
                <SearchTable
                    searchProps={getFilteredData()}
                    hideSearch={false}
                    hideFilters={true}
                    onRowClick={handleRowClick}
                />
            </div>
        </MainLayout>
    );
}
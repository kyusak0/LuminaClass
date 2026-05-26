'use client'

import AdminLayout from "@/layouts/AdminLayout";
import SearchTable, { SearchRecord } from "@/components/searchTable/SearchTable";
import { notFound, useRouter } from "next/navigation";
import { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import { useAuth } from "@/context/authContext";
import axios from "axios";
import axiosInstance from "@/lib/axios.config";

interface UploadedFile {
    id: number;
    original_name: string;
    path: string;
    mime_type: string;
    size: number;
    author_id: number;
    slug: string | null;
    created_at: string;
    updated_at: string;
}

export default function FilesCatalog() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [disabled, setDisabled] = useState(true);
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [allFiles, setAllFiles] = useState<UploadedFile[]>([]);

    const auth = useAuth();

    useEffect(() => {
        if (auth) {
            loadData();
        }
    }, [auth]);

    const loadData = async () => {
        setLoading(true);
        try {
            await getFiles();
        } finally {
            setLoading(false);
        }
    };

    if (!auth) {
        return (
            <AdminLayout>
                <div className="min-h-screen flex flex-col items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Загрузка...</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    const { get, post, user } = auth;

    const getFiles = async () => {
        try {
            const response = await get('/get-files');

            // Проверяем успешность ответа
            if (!response.success) {
                console.error('Ошибка загрузки файлов:', response.message);
                setFiles([]);
                setAllFiles([]);
                return;
            }

            const allFilesData = response.data.data || [];
            setAllFiles(allFilesData);

            // Фильтруем файлы в зависимости от роли пользователя
            if (user?.role === 'admin') {
                // Админ видит все файлы
                setFiles(allFilesData);
            } else {
                // Обычный пользователь видит только свои файлы
                const userFiles = allFilesData.filter((file: UploadedFile) => file.author_id === user?.id);
                setFiles(userFiles);
            }
        } catch (error) {
            console.error('Ошибка загрузки файлов:', error);
            setFiles([]);
            setAllFiles([]);
        }
    };

    if (!loading && user && user?.role !== 'admin') {
        return notFound();
    }

    if (loading) {
        return (
            <AdminLayout>
                <div className="min-h-screen flex flex-col items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Загрузка файлов...</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    const saveFile = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
        alert('Пожалуйста, выберите файл');
        return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('author_id', user.id.toString());

    // Отладка: проверяем содержимое FormData
    console.log('FormData contents:');
    for (let pair of formData.entries()) {
        console.log(pair[0], pair[1]);
    }
    
    // Отладка: читаем данные как объект
    const dataForDebug = {
        file: formData.get('file'),
        author_id: formData.get('author_id'),
    };
    console.log('Data for debug:', dataForDebug);
    console.log('File instance:', dataForDebug.file instanceof File); // Должно быть true

    try {
        // Используем axios напрямую
        const response = await axiosInstance.post('/save-file', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        
        console.log('Upload success:', response.data);
        alert(response.data.message || 'Файл успешно загружен');
        await getFiles();
        setSelectedFile(null);
        setDisabled(true);
        
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
    } catch (error: any) {
        console.error('Ошибка загрузки файла:', error);
        
        // Подробная информация об ошибке
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
            
            const errorMessage = error.response.data?.message || 
                               error.response.data?.errors?.file?.[0] || 
                               'Ошибка при загрузке файла';
            alert(errorMessage);
        } else if (error.request) {
            console.error('No response received:', error.request);
            alert('Сервер не отвечает. Проверьте подключение.');
        } else {
            console.error('Error setting up request:', error.message);
            alert('Ошибка при отправке запроса: ' + error.message);
        }
    } finally {
        setUploading(false);
    }
};

    const getFileIcon = (mimeType: string) => {
        if (mimeType.includes('pdf')) return '📄';
        if (mimeType.includes('image')) return '🖼️';
        if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
        if (mimeType.includes('zip') || mimeType.includes('compressed')) return '📦';
        if (mimeType.includes('text') || mimeType.includes('plain')) return '📃';
        if (mimeType.includes('video')) return '🎬';
        if (mimeType.includes('audio')) return '🎵';
        return '📎';
    };

    const formatFileSize = (bytes: number | string) => {
        if (typeof bytes === 'string') {
            bytes = Number(bytes);
        }
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileTypeValue = (mimeType: string) => {
        if (mimeType.includes('image')) return 'image';
        if (mimeType.includes('pdf')) return 'pdf';
        if (mimeType.includes('word')) return 'word';
        if (mimeType.includes('excel')) return 'excel';
        if (mimeType.includes('text')) return 'text';
        return 'other';
    };

    const searchRecords: SearchRecord[] = files.map(file => ({
        id: file.id,
        columns: [
            {
                title: 'ID',
                key: 'id',
                data: {
                    value: file.id.toString(),
                    size: 1,
                    isFilter: true
                }
            },
            {
                title: 'Название',
                key: 'name',
                data: {
                    value: getFileIcon(file.mime_type) + ' ' + file.original_name,
                    size: 3,
                    isFilter: true
                }
            },
            {
                title: 'Тип',
                key: 'type',
                data: {
                    value: getFileTypeValue(file.mime_type),
                    displayValue: file.mime_type.split('/')[1]?.toUpperCase() || file.mime_type,
                    size: 2,
                    isFilter: true
                }
            },
            {
                title: 'Размер',
                key: 'size',
                data: {
                    value: formatFileSize(file.size),
                    size: 2,
                    isFilter: false
                }
            },
            {
                title: 'Автор',
                key: 'author',
                data: {
                    value: `ID: ${file.author_id}`,
                    size: 2,
                    isFilter: false
                }
            },
            {
                title: 'Дата',
                key: 'date',
                data: {
                    value: new Date(file.created_at).toLocaleDateString(),
                    size: 2,
                    isFilter: false
                }
            }
        ]
    }));

    const filterOptions = [
        { value: '', label: 'Все типы' },
        { value: 'image', label: 'Изображения' },
        { value: 'pdf', label: 'PDF' },
        { value: 'word', label: 'Word' },
        { value: 'excel', label: 'Excel' },
        { value: 'text', label: 'Текст' }
    ];

    // Статистика файлов
    const totalSize = files.reduce((sum, file) => sum + (typeof file.size === 'number' ? file.size : Number(file.size)), 0);
    const fileCount = files.length;

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        Файловое хранилище
                    </h1>
                    <p className="text-lg text-gray-600">
                        Управление файлами и документами
                    </p>
                    {user?.role !== 'admin' && (
                        <div className="mt-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg inline-block">
                            Показаны только ваши файлы
                        </div>
                    )}
                </div>

                {/* Статистика */}
                {files.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="text-sm text-gray-500">Всего файлов</div>
                            <div className="text-2xl font-bold text-gray-900">{fileCount}</div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="text-sm text-gray-500">Общий размер</div>
                            <div className="text-2xl font-bold text-gray-900">{formatFileSize(totalSize)}</div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="text-sm text-gray-500">Ваш ID</div>
                            <div className="text-2xl font-bold text-gray-900">{user?.id}</div>
                        </div>
                    </div>
                )}

                {files.length === 0 ? (
                    <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📁</div>
                            <p className="text-gray-500 text-lg">Файлов пока нет</p>
                            <p className="text-gray-400 text-sm mt-2">
                                Загрузите первый файл с помощью формы ниже
                            </p>
                        </div>
                    </div>
                ) : (
                    <SearchTable
                        searchProps={searchRecords}
                        actions={[]}
                        filterOptions={filterOptions}
                        filterField="type"
                        onRowClick={(record) => router.push(`/files/${record.id}`)}
                    />
                )}

                <div className="bg-white rounded-lg shadow p-6 mt-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        Загрузить новый файл
                    </h2>
                    <form onSubmit={saveFile} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Выберите файл
                            </label>
                            <input
                                id="file-input"
                                type="file"
                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                    if (e.target.files && e.target.files[0]) {
                                        setSelectedFile(e.target.files[0]);
                                        setDisabled(false);
                                    }
                                }}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={disabled || uploading}
                            className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 transition-colors duration-200"
                        >
                            {uploading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                    Загрузка...
                                </>
                            ) : (
                                'Загрузить файл на сервер'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
}
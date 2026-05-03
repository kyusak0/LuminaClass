'use client'

import { type Files } from "@/api";
import MainLayout from "@/layouts/MainLayout";
import SearchTable, { SearchRecord } from "@/components/searchTable/SearchTable";
import { notFound, useRouter } from "next/navigation";
import { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import { useAuth } from "@/context/authContext";

export default function FilesCatalog() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [disabled, setDisabled] = useState(true);
    const [files, setFiles] = useState<Files[]>([]);
    const [uploading, setUploading] = useState(false);

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
            <MainLayout>
                <div className="min-h-screen flex flex-col items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Загрузка...</p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    const { get, post, user } = auth;

    const getFiles = async () => {
        try {
            const data = await get('/get-files');
            setFiles(data.data || []);
        } catch (error) {
            console.error('Ошибка загрузки файлов:', error);
            setFiles([]);
        }
    };

    if (!loading && user && user?.role !== 'admin') {
        return notFound();
    }

    if (loading) {
        return (
            <MainLayout>
                <div className="min-h-screen flex flex-col items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Загрузка файлов...</p>
                    </div>
                </div>
            </MainLayout>
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
        const customFileName = prompt(`Название для файла \n по умолчанию: ${selectedFile.name}`) || selectedFile.name;
        formData.append('file', selectedFile, customFileName);
        formData.append('author_id', user.id.toString());

        try {
            const response = await post('/save-file', formData);
            alert(response.message || 'Файл успешно загружен');
            await getFiles();
            setSelectedFile(null);
            setDisabled(true);
            const fileInput = document.getElementById('file-input') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        } catch (error: any) {
            console.error('Ошибка загрузки файла:', error);
            alert(error.message || 'Ошибка при загрузке файла');
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
                    value: getFileIcon(file.mime_type) + file.original_name,
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

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        Файловое хранилище
                    </h1>
                    <p className="text-lg text-gray-600">
                        Управление файлами и документами
                    </p>
                </div>

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

                <div className="bg-white rounded-lg shadow p-6">
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
        </MainLayout>
    );
}
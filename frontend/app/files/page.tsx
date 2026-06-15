'use client'

import AdminLayout from "@/layouts/AdminLayout";
import SearchTable, { SearchRecord } from "@/components/searchTable/SearchTable";
import { notFound, useRouter } from "next/navigation";
import { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import { useAuth } from "@/context/authContext";
import axiosInstance from "@/lib/axios.config";
import AdminLoader from "@/components/adminLoader/AdminLoader";
import {
    FileText,
    FileImage,
    FileArchive,
    File,
    Upload,
    HardDrive,
    User,
    Calendar,
    CheckCircle,
    XCircle,
    AlertCircle,
    Loader2,
    FolderOpen,
    Database
} from 'lucide-react';

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
    const [alertMess, setAlertMess] = useState<{ content: any } | null>(null);

    const auth = useAuth();

    const showAlert = (message: string, isError: boolean = false) => {
        const alertContent = (
            <div className="p-3">
                <div className="flex items-center gap-2 font-semibold mb-2">
                    {isError ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                    ) : (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    <span>{isError ? 'Ошибка' : 'Успешно'}</span>
                </div>
                <div className="text-sm">{message}</div>
                <div className="text-xs text-gray-500 mt-2">
                    {new Date().toLocaleString()}
                </div>
            </div>
        );
        setAlertMess({ content: alertContent });

        setTimeout(() => {
            setAlertMess(null);
        }, 5000);
    };

    useEffect(() => {
        if (auth) {
            loadData();
        }
    }, [auth]);

    const loadData = async () => {
        setLoading(true);
        try {
            await getFiles();
        } catch (error) {
            showAlert('Ошибка загрузки данных', true);
        } finally {
            setLoading(false);
        }
    };

    if (!auth) {
        return (
            <AdminLoader />
        );
    }

    const { get, post, user } = auth;

    const getFiles = async () => {
        try {
            const response = await get('/get-files');

            if (!response.success) {
                console.error('Ошибка загрузки файлов:', response.message);
                showAlert(response.message || 'Ошибка загрузки файлов', true);
                setFiles([]);
                setAllFiles([]);
                return;
            }

            const allFilesData = response.data.data || [];
            setAllFiles(allFilesData);

            if (user?.role === 'admin') {
                setFiles(allFilesData);
            } else {
                const userFiles = allFilesData.filter((file: UploadedFile) => file.author_id === user?.id);
                setFiles(userFiles);
            }
        } catch (error) {
            console.error('Ошибка загрузки файлов:', error);
            showAlert('Ошибка загрузки файлов', true);
            setFiles([]);
            setAllFiles([]);
        }
    };

    if (!loading && user && user?.role !== 'admin') {
        return notFound();
    }

    if (loading) {
        return (
            <AdminLoader />
        );
    }

    const saveFile = async (e: FormEvent) => {
        e.preventDefault();

        if (!selectedFile) {
            showAlert('Пожалуйста, выберите файл', true);
            return;
        }

        const maxSize = 10 * 1024 * 1024;
        if (selectedFile.size > maxSize) {
            showAlert('Файл слишком большой. Максимальный размер: 10MB', true);
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('author_id', user.id.toString());

        try {
            const response = await axiosInstance.post('/save-file', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            showAlert(response.data.message || 'Файл успешно загружен');
            await getFiles();
            setSelectedFile(null);
            setDisabled(true);

            const fileInput = document.getElementById('file-input') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

        } catch (error: any) {
            console.error('Ошибка загрузки файла:', error);

            if (error.response) {
                const errorMessage = error.response.data?.message ||
                    error.response.data?.errors?.file?.[0] ||
                    'Ошибка при загрузке файла';
                showAlert(errorMessage, true);
            } else if (error.request) {
                showAlert('Сервер не отвечает. Проверьте подключение.', true);
            } else {
                showAlert('Ошибка при отправке запроса: ' + error.message, true);
            }
        } finally {
            setUploading(false);
        }
    };

    const getFileIcon = (mimeType: string, size: 'small' | 'large' = 'small') => {
        const iconClass = size === 'large' ? 'w-12 h-12' : 'w-4 h-4 inline mr-1';

        if (mimeType.includes('pdf')) return <FileText className={`${iconClass} text-red-500`} />;
        if (mimeType.includes('image')) return <FileImage className={`${iconClass} text-purple-500`} />;
        if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className={`${iconClass} text-blue-500`} />;
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileText className={`${iconClass} text-green-500`} />;
        if (mimeType.includes('zip') || mimeType.includes('compressed')) return <FileArchive className={`${iconClass} text-yellow-500`} />;
        if (mimeType.includes('text') || mimeType.includes('plain')) return <FileText className={`${iconClass} text-gray-500`} />;
        if (mimeType.includes('video')) return <File className={`${iconClass} text-blue-400`} />;
        if (mimeType.includes('audio')) return <File className={`${iconClass} text-green-400`} />;
        return <File className={`${iconClass} text-gray-400`} />;
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
        if (mimeType.includes('image')) return 'Изображение';
        if (mimeType.includes('pdf')) return 'Документ pdf';
        if (mimeType.includes('word')) return 'Документ Word';
        if (mimeType.includes('excel')) return 'Таблица Excel';
        if (mimeType.includes('text')) return 'Текст';
        if (mimeType.includes('presentation')) return 'Презентация';
        if (mimeType.includes('zip')) return 'Архив';
        return 'Неопр.';
    };

    const getFileTypeDisplay = (mimeType: string) => {
        const type = mimeType.split('/')[1]?.toUpperCase() || mimeType;
        if (type.includes('JPEG') || type.includes('JPG')) return 'JPEG';
        if (type.includes('PNG')) return 'PNG';
        if (type.includes('GIF')) return 'GIF';
        if (type.includes('WEBP')) return 'WEBP';
        return type;
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
                    value: file.original_name,
                    displayValue: (
                        <div className="flex items-center gap-2">
                            {getFileIcon(file.mime_type, 'small')}
                            <span className="truncate">{file.original_name}</span>
                        </div>
                    ),
                    size: 3,
                    isFilter: true
                }
            },
            {
                title: 'Тип',
                key: 'type',
                data: {
                    value: getFileTypeValue(file.mime_type),
                    displayValue: getFileTypeDisplay(file.mime_type),
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

    const totalSize = files.reduce((sum, file) => sum + (typeof file.size === 'number' ? file.size : Number(file.size)), 0);
    const fileCount = files.length;

    return (
        <AdminLayout alertMess={alertMess?.content}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <FolderOpen className="w-8 h-8 text-main" />
                        <h1 className="text-4xl font-bold text-gray-900">
                            Файловое хранилище
                        </h1>
                    </div>
                    <p className="text-lg text-gray-600">
                        Управление файлами и документами
                    </p>
                    {user?.role !== 'admin' && (
                        <div className="mt-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg inline-flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Показаны только ваши файлы
                        </div>
                    )}
                </div>

                {files.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
                            <Database className="w-8 h-8 text-main" />
                            <div>
                                <div className="text-sm text-gray-500">Всего файлов</div>
                                <div className="text-2xl font-bold text-gray-900">{fileCount}</div>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
                            <HardDrive className="w-8 h-8 text-main" />
                            <div>
                                <div className="text-sm text-gray-500">Общий размер</div>
                                <div className="text-2xl font-bold text-gray-900">{formatFileSize(totalSize)}</div>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
                            <User className="w-8 h-8 text-main" />
                            <div>
                                <div className="text-sm text-gray-500">Ваш ID</div>
                                <div className="text-2xl font-bold text-gray-900">{user?.id}</div>
                            </div>
                        </div>
                    </div>
                )}

                {files.length === 0 ? (
                    <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                        <div className="text-center py-12">
                            <div className="flex justify-center mb-4">
                                <FolderOpen className="w-20 h-20 text-gray-300" />
                            </div>
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
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Upload className="w-5 h-5 text-main" />
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
                                        const file = e.target.files[0];
                                        const maxSize = 10 * 1024 * 1024;

                                        if (file.size > maxSize) {
                                            showAlert('Файл слишком большой. Максимальный размер: 10MB', true);
                                            e.target.value = '';
                                            return;
                                        }

                                        setSelectedFile(file);
                                        setDisabled(false);
                                    }
                                }}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Максимальный размер файла: 10MB
                            </p>
                        </div>
                        <button
                            type="submit"
                            disabled={disabled || uploading}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Загрузка...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-5 h-5" />
                                    Загрузить файл на сервер
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
}
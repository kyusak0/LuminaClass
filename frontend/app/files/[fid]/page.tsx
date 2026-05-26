'use client'

import AdminLayout from "@/layouts/AdminLayout";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/authContext";
import { NEXT_PUBLIC_API_URL } from "@/lib/axios.config";

// Импорты иконок из lucide-react
import {
    ArrowLeft,
    Download,
    FileArchive,
    FileImage,
    FileText,
    FileIcon,
    File,
    Trash2,
    User,
    Calendar,
    HardDrive,
    FileType,
    FileCheck,
    Loader2,
    Eye
} from 'lucide-react';

interface FileData {
    id: number;
    original_name: string;
    mime_type: string;
    size: number;
    path: string;
    created_at: string;
    user: any;
}

export default function FilePage() {
    const params = useParams();
    const router = useRouter();
    const auth = useAuth();
    const [file, setFile] = useState<FileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        const fileId = Number(params.fid);
        
        if (isNaN(fileId) || fileId === 0) {
            router.push('/files');
            return;
        }

        if (auth) {
            loadFile();
        }
    }, [params.fid, auth]);

    const loadFile = async () => {
        setLoading(true);
        setError(null);
        try {
            await getFile();
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            setError('Не удалось загрузить файл');
        } finally {
            setLoading(false);
        }
    };

    const { get, post, user } = auth || {};

    const getFile = async () => {
        if (!get) return;

        try {
            const response = await get(`/get-file/${params.fid}`);
            
            if (response.data) {
                setFile(response.data.data);
            } else {
                setError('Файл не найден');
            }
        } catch (error) {
            console.error('Ошибка загрузки файла:', error);
            setError('Ошибка при загрузке файла');
        }
    };

    const getFileIcon = (mimeType: string, size: 'large' | 'small' = 'large') => {
        const iconSize = size === 'large' ? 'w-20 h-20' : 'w-5 h-5';
        
        if (mimeType.includes('pdf')) return <File className={`${iconSize} text-red-500`} />;
        if (mimeType.includes('image')) return <FileImage className={`${iconSize} text-purple-500`} />;
        if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className={`${iconSize} text-blue-500`} />;
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileText className={`${iconSize} text-green-500`} />;
        if (mimeType.includes('zip') || mimeType.includes('compressed')) return <FileArchive className={`${iconSize} text-yellow-500`} />;
        if (mimeType.includes('text') || mimeType.includes('plain')) return <FileText className={`${iconSize} text-gray-500`} />;
        if (mimeType.includes('video')) return <File className={`${iconSize} text-blue-400`} />;
        if (mimeType.includes('audio')) return <File className={`${iconSize} text-green-400`} />;
        return <FileIcon className={`${iconSize} text-gray-400`} />;
    };

    const getFileUrl = (filePath: string) => {
        return `${NEXT_PUBLIC_API_URL}/storage/${filePath}`;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const downloadFile = async () => {
        if (!file || !post || downloading) return;

        const customName = prompt(`Под каким именем сохранить? \n по умолчанию: ${file.original_name}`, file.original_name);
        
        if (customName === null || customName.trim() === '') {
            return;
        }

        setDownloading(true);
        try {
            const response = await post(`/files/download/${file.id}`, {});
            const blob = response instanceof Blob ? response : new Blob([response]);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = customName.trim();
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading file:', error);
            alert('Ошибка при скачивании файла');
        } finally {
            setDownloading(false);
        }
    };

    const deleteFile = async () => {
        if (!file || !post) return;

        if (user?.role !== 'admin' && user?.id !== file.user.id) {
            alert('У Вас недостаточно прав для этого');
            return;
        }

        if (confirm(`Вы уверены что хотите удалить файл: \n ${file.original_name} ?`)) {
            try {
                await post(`/files/delete/${file.id}`, {});
                alert('Файл успешно удален');
                router.push('/files');
            } catch (error) {
                console.error('Ошибка удаления файла:', error);
                alert('Ошибка при удалении файла');
            }
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 text-main animate-spin mx-auto mb-4" />
                        <p className="text-gray-600">Загрузка файла...</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    if (error || !file) {
        return (
            <AdminLayout>
                <div className="min-h-screen bg-gray-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <div className="text-center py-16">
                                <div className="text-6xl mb-4">📁</div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    {error || 'Файл не найден'}
                                </h3>
                                <p className="text-gray-500 mb-6">
                                    Запрошенный файл не существует или был удален
                                </p>
                                <button
                                    onClick={() => router.push('/files')}
                                    className="px-6 py-2 bg-main text-white rounded-lg hover:bg-main-dark transition-colors"
                                >
                                    Вернуться к списку файлов
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    const canDelete = user?.role === 'admin' || user?.id === file?.user.id;
    const isPreviewable = file.mime_type.startsWith('image/') || 
                         file.mime_type === 'application/pdf' || 
                         file.mime_type.startsWith('text/');

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Header с кнопкой назад */}
                    <div className="flex items-center gap-4 mb-6">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6 text-gray-600" />
                        </button>
                        <div>
                            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                                Просмотр файла
                            </h2>
                            <p className="text-gray-500 text-sm sm:text-base mt-1">
                                Детальная информация о файле
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Левая колонка - просмотр файла */}
                        <div className="flex-1 min-w-0">
                            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                                <div className="bg-main px-4 sm:px-6 py-3 sm:py-4">
                                    <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
                                        <Eye className="w-5 h-5" />
                                        Просмотр
                                    </h3>
                                </div>
                                <div className="min-h-[400px] sm:min-h-[500px] bg-gray-50">
                                    {isPreviewable ? (
                                        <>
                                            {file.mime_type.startsWith('image/') && (
                                                <div className="flex items-center justify-center min-h-[400px] sm:min-h-[500px] p-4 sm:p-8">
                                                    <img
                                                        src={getFileUrl(file.path)}
                                                        alt={file.original_name}
                                                        className="max-w-full max-h-full object-contain rounded-lg"
                                                    />
                                                </div>
                                            )}
                                            {file.mime_type === 'application/pdf' && (
                                                <iframe
                                                    src={getFileUrl(file.path)}
                                                    className="w-full min-h-[400px] sm:min-h-[500px] border-0 rounded-b-lg"
                                                    title={file.original_name}
                                                />
                                            )}
                                            {file.mime_type.startsWith('text/') && (
                                                <div className="w-full min-h-[400px] sm:min-h-[500px] p-4">
                                                    <iframe
                                                        src={getFileUrl(file.path)}
                                                        className="w-full min-h-[500px] border rounded-lg bg-white"
                                                        title={file.original_name}
                                                    />
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center min-h-[400px] sm:min-h-[500px] text-center p-6 sm:p-8">
                                            {getFileIcon(file.mime_type, 'large')}
                                            <h3 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3 mt-4 text-gray-900">
                                                {file.original_name}
                                            </h3>
                                            <p className="text-gray-500 mb-6 text-sm sm:text-base">
                                                Предварительный просмотр недоступен для этого типа файла
                                            </p>
                                            <button
                                                onClick={downloadFile}
                                                disabled={downloading}
                                                className="px-4 sm:px-6 py-2 sm:py-3 bg-main text-white rounded-lg hover:bg-main-dark transition-colors disabled:opacity-50 flex items-center gap-2 text-sm sm:text-base"
                                            >
                                                {downloading ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Скачивание...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download className="w-4 h-4" />
                                                        Скачать файл
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Правая колонка - информация о файле */}
                        <div className="lg:w-80 xl:w-96 flex-shrink-0">
                            <div className="sticky top-4">
                                <div className="bg-white rounded-xl shadow-lg border border-gray-100">
                                    <div className="bg-main px-4 sm:px-6 py-3 sm:py-4 rounded-t-xl">
                                        <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
                                            <FileCheck className="w-5 h-5" />
                                            Информация
                                        </h3>
                                    </div>

                                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                                        {/* Детали файла */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                                <div className="flex-shrink-0">
                                                    {getFileIcon(file.mime_type, 'small')}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs text-gray-500">Название</p>
                                                    <p className="text-gray-900 font-medium text-sm break-words">
                                                        {file.original_name}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                                <FileType className="w-5 h-5 text-main flex-shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs text-gray-500">Тип файла</p>
                                                    <p className="text-gray-900 text-sm break-words">
                                                        {file.mime_type}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                                <HardDrive className="w-5 h-5 text-main flex-shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs text-gray-500">Размер</p>
                                                    <p className="text-gray-900 font-medium text-sm">
                                                        {formatFileSize(file.size)}
                                                    </p>
                                                    <p className="text-gray-400 text-xs mt-0.5">
                                                        ({file.size.toLocaleString()} байт)
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                                <User className="w-5 h-5 text-main flex-shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs text-gray-500">Автор</p>
                                                    <Link 
                                                        href={`/users/${file.user.id}`}
                                                        className="text-main hover:text-main-dark font-medium text-sm truncate block"
                                                    >
                                                        {file.user.name || `Пользователь ${file.user.id}`}
                                                    </Link>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                                <Calendar className="w-5 h-5 text-main flex-shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs text-gray-500">Создан</p>
                                                    <p className="text-gray-900 text-sm">
                                                        {new Date(file.created_at).toLocaleDateString('ru-RU', {
                                                            day: 'numeric',
                                                            month: 'long',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Действия */}
                                        <div className="space-y-3 pt-4 border-t border-gray-200">
                                            <button
                                                onClick={downloadFile}
                                                disabled={downloading}
                                                className="w-full px-4 py-3 bg-main text-white rounded-lg hover:bg-main-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                                            >
                                                {downloading ? (
                                                    <>
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                        Скачивание...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download className="w-5 h-5" />
                                                        Скачать файл
                                                    </>
                                                )}
                                            </button>
                                            
                                            {canDelete && (
                                                <button
                                                    onClick={deleteFile}
                                                    className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                    Удалить файл
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
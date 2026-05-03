'use client'

import MainLayout from "@/layouts/MainLayout";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/authContext";

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
                setFile(response.data);
            } else {
                setError('Файл не найден');
            }
        } catch (error) {
            console.error('Ошибка загрузки файла:', error);
            setError('Ошибка при загрузке файла');
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

    const getFileUrl = (filePath: string) => {
        return `http://localhost:8001/storage/${filePath}`;
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

        // Запрашиваем имя файла
        const customName = prompt(`Под каким именем сохранить? \n по умолчанию: ${file.original_name}`, file.original_name);
        
        // Если пользователь нажал "Отмена" или ввел пустое имя, отменяем скачивание
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
            <MainLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Загрузка файла...</p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (error || !file) {
        return (
            <MainLayout>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="bg-white rounded-lg shadow overflow-hidden">
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
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                Вернуться к списку файлов
                            </button>
                        </div>
                    </div>
                </div>
            </MainLayout>
        );
    }

    const canDelete = user?.role === 'admin' || user?.id === file?.user.id;

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Навигация */}
                <div className="mb-6">
                    <Link 
                        href="/files" 
                        className="text-green-600 hover:text-green-700 inline-flex items-center gap-2"
                    >
                        ← Назад к списку файлов
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Просмотр файла */}
                    <div className="bg-white rounded-lg col-span-2 shadow-lg overflow-hidden">
                        <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
                            <h2 className="text-xl font-semibold text-gray-900">Просмотр файла</h2>
                        </div>
                        <div className="p-6">
                            {file.mime_type.startsWith('image/') ? (
                                <div className="flex items-center justify-center min-h-[400px] bg-gray-100 rounded-lg">
                                    <img
                                        src={getFileUrl(file.path)}
                                        alt={file.original_name}
                                        className="max-w-full max-h-[500px] object-contain"
                                    />
                                </div>
                            ) : file.mime_type === 'application/pdf' ? (
                                <iframe
                                    src={getFileUrl(file.path)}
                                    className="w-full h-[600px] border-0 rounded-lg"
                                    title={file.original_name}
                                />
                            ) : file.mime_type.startsWith('text/') ? (
                                <iframe
                                    src={getFileUrl(file.path)}
                                    className="w-full h-[600px] border rounded-lg"
                                    title={file.original_name}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-gray-50 rounded-lg">
                                    <div className="text-8xl mb-4">
                                        {getFileIcon(file.mime_type)}
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                        {file.original_name}
                                    </h3>
                                    <p className="text-gray-500 mb-6">
                                        Предварительный просмотр недоступен для этого типа файла
                                    </p>
                                    <button
                                        onClick={downloadFile}
                                        disabled={downloading}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {downloading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                Скачивание...
                                            </>
                                        ) : (
                                            <>
                                                <span>📥</span>
                                                Скачать файл
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Информация о файле */}
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
                            <h2 className="text-xl font-semibold text-gray-900">Информация о файле</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-start">
                                <span className="w-1/3 text-sm font-medium text-gray-500">ID:</span>
                                <span className="w-2/3 text-sm text-gray-900">{file.id}</span>
                            </div>
                            <div className="flex items-start">
                                <span className="w-1/3 text-sm font-medium text-gray-500">Название:</span>
                                <span className="w-2/3 text-sm text-gray-900 break-words">{file.original_name}</span>
                            </div>
                            <div className="flex items-start">
                                <span className="w-1/3 text-sm font-medium text-gray-500">Тип:</span>
                                <span className="w-2/3 text-sm text-gray-900">
                                    <span className="mr-1">{getFileIcon(file.mime_type)}</span>
                                    {file.mime_type}
                                </span>
                            </div>
                            <div className="flex items-start">
                                <span className="w-1/3 text-sm font-medium text-gray-500">Размер:</span>
                                <span className="w-2/3 text-sm text-gray-900">
                                    {formatFileSize(file.size)}
                                    <span className="text-gray-400 text-xs ml-1">
                                        ({file.size.toLocaleString()} байт)
                                    </span>
                                </span>
                            </div>
                            <div className="flex items-start">
                                <span className="w-1/3 text-sm font-medium text-gray-500">Автор:</span>
                                <span className="w-2/3 text-sm text-gray-900">
                                    {file.user.name ? (
                                        <Link 
                                            href={`/users/${file.user.id}`}
                                            className="text-green-600 hover:text-green-700 hover:underline"
                                        >
                                            {file.user.name}
                                        </Link>
                                    ) : (
                                        <Link 
                                            href={`/users/${file.user.id}`}
                                            className="text-green-600 hover:text-green-700 hover:underline"
                                        >
                                            Пользователь {file.user.id}
                                        </Link>
                                    )}
                                </span>
                            </div>
                            <div className="flex items-start">
                                <span className="w-1/3 text-sm font-medium text-gray-500">Создан:</span>
                                <span className="w-2/3 text-sm text-gray-900">
                                    {new Date(file.created_at).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Действия */}
                        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                            <div className="flex gap-3">
                                <button
                                    onClick={downloadFile}
                                    disabled={downloading}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                >
                                    {downloading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            Скачивание...
                                        </>
                                    ) : (
                                        <>
                                            <span>📥</span>
                                            Скачать файл
                                        </>
                                    )}
                                </button>
                                
                                {canDelete && (
                                    <button
                                        onClick={deleteFile}
                                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                        <span>🗑️</span>
                                        Удалить файл
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
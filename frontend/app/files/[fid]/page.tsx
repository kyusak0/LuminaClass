'use client'

import AdminLayout from "@/layouts/AdminLayout";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/authContext";
import { NEXT_PUBLIC_API_URL } from "@/lib/axios.config";
import FileViewer from "@/components/files/FileViewer";
import Loader from "@/components/loader/Loader";

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
    Eye,
    CheckCircle,
    XCircle,
    AlertCircle
} from 'lucide-react';
import AdminLoader from "@/components/adminLoader/AdminLoader";

interface FileData {
    id: number;
    original_name: string;
    mime_type: string;
    size: number;
    path: string;
    created_at: string;
    user: any;
    file_type?: string;
    serve_url?: string;
}

export default function FilePage() {
    const params = useParams();
    const router = useRouter();
    const auth = useAuth();
    const [file, setFile] = useState<FileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [showFileViewer, setShowFileViewer] = useState(false);
    const [fileViewerData, setFileViewerData] = useState<any>(null);
    const [currentViewerKey, setCurrentViewerKey] = useState(0);
    const [alertMess, setAlertMess] = useState<{ content: any } | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{
        show: boolean;
        message: string;
        onConfirm: () => void;
        onCancel: () => void;
    } | null>(null);

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

    const showConfirm = (message: string, onConfirm: () => void) => {
        setConfirmDialog({
            show: true,
            message,
            onConfirm: () => {
                setConfirmDialog(null);
                onConfirm();
            },
            onCancel: () => {
                setConfirmDialog(null);
            }
        });
    };

    const loadFile = async () => {
        setLoading(true);
        setError(null);
        try {
            await getFile();
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            setError('Не удалось загрузить файл');
            showAlert('Не удалось загрузить файл', true);
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
                const fileData = response.data.data;

                const viewerData = {
                    id: fileData.id,
                    original_name: fileData.original_name,
                    mime_type: fileData.mime_type,
                    size: fileData.size,
                    serve_url: `${NEXT_PUBLIC_API_URL}/api/files/serve/${fileData.id}`,
                    url: `${NEXT_PUBLIC_API_URL}/api/files/download/${fileData.id}`,
                    file_type: getFileTypeFromMime(fileData.mime_type, fileData.original_name),
                    created_at: fileData.created_at,
                    user: fileData.user
                };

                setFile(fileData);
                setFileViewerData(viewerData);
            } else {
                setError('Файл не найден');
                showAlert('Файл не найден', true);
            }
        } catch (error) {
            console.error('Ошибка загрузки файла:', error);
            setError('Ошибка при загрузке файла');
            showAlert('Ошибка при загрузке файла', true);
        }
    };

    const getFileTypeFromMime = (mimeType: string, fileName: string): string => {
        const ext = fileName.split('.').pop()?.toLowerCase() || '';

        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
        if (['doc', 'docx'].includes(ext)) return 'word';
        if (['xls', 'xlsx'].includes(ext)) return 'excel';
        if (['ppt', 'pptx'].includes(ext)) return 'presentation';
        if (['pdf'].includes(ext)) return 'pdf';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
        if (['mp4', 'avi', 'mov', 'mkv'].includes(ext)) return 'video';
        if (['mp3', 'wav', 'ogg'].includes(ext)) return 'audio';
        if (['txt', 'csv', 'json', 'xml', 'html', 'css', 'js', 'md'].includes(ext)) return 'text';

        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        if (mimeType === 'application/pdf') return 'pdf';
        if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'word';
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'excel';
        if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'presentation';
        if (mimeType.startsWith('text/')) return 'text';

        return 'other';
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
            showAlert(`Файл "${customName.trim()}" успешно скачан`);
        } catch (error) {
            console.error('Error downloading file:', error);
            showAlert('Ошибка при скачивании файла', true);
        } finally {
            setDownloading(false);
        }
    };

    const deleteFile = async () => {
        if (!file || !post) return;

        if (user?.role !== 'admin' && user?.id !== file.user.id) {
            showAlert('У Вас недостаточно прав для этого', true);
            return;
        }

        showConfirm(
            `Вы уверены что хотите удалить файл: ${file.original_name}?`,
            async () => {
                try {
                    await post(`/files/delete/${file.id}`, {});
                    showAlert('Файл успешно удален');
                    router.push('/files');
                } catch (error) {
                    console.error('Ошибка удаления файла:', error);
                    showAlert('Ошибка при удалении файла', true);
                }
            }
        );
    };

    const handleOpenViewer = () => {
        if (file) {
            const viewerData = {
                id: file.id,
                original_name: file.original_name,
                mime_type: file.mime_type,
                size: file.size,
                serve_url: `${NEXT_PUBLIC_API_URL}/api/files/serve/${file.id}`,
                url: `${NEXT_PUBLIC_API_URL}/api/files/download/${file.id}`,
                file_type: getFileTypeFromMime(file.mime_type, file.original_name),
                created_at: file.created_at,
                user: file.user
            };
            setFileViewerData(viewerData);
        }
        setCurrentViewerKey(prev => prev + 1);
        setShowFileViewer(true);
    };

    const handleCloseViewer = () => {
        setShowFileViewer(false);
    };

    const handleFileFromArchive = useCallback((fileFromArchive: any) => {
        console.log('📦 Открываем файл из архива:', fileFromArchive);
        setFileViewerData(fileFromArchive);
        setCurrentViewerKey(prev => prev + 1);
        setShowFileViewer(true);
    }, []);

    if (loading) {
        return (
            <AdminLoader />
        );
    }

    if (error || !file) {
        return (
            <AdminLayout alertMess={alertMess?.content}>
                <div className="min-h-screen bg-gray-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <div className="text-center py-16">
                                <div className="text-6xl mb-4 flex justify-center">
                                    <FileIcon className="w-20 h-20 text-gray-400" />
                                </div>
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

    return (
        <AdminLayout alertMess={alertMess?.content}>
            {/* Кастомный диалог подтверждения */}
            {confirmDialog?.show && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <AlertCircle className="w-6 h-6 text-orange-500" />
                                <h3 className="text-lg font-semibold text-gray-900">Подтверждение действия</h3>
                            </div>
                            <p className="text-gray-600 mb-6">{confirmDialog.message}</p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={confirmDialog.onCancel}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={confirmDialog.onConfirm}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                                >
                                    Удалить
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно с FileViewer */}
            {showFileViewer && fileViewerData && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
                    <div className="relative w-full h-full max-w-7xl max-h-[90vh] bg-gray-100 rounded-xl shadow-2xl overflow-auto">
                        <FileViewer
                            key={currentViewerKey}
                            fileData={fileViewerData}
                            onClose={handleCloseViewer}
                            onFileOpen={handleFileFromArchive}
                        />
                    </div>
                </div>
            )}

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
                                    <div className="flex flex-col items-center justify-center min-h-[400px] sm:min-h-[500px] text-center p-6 sm:p-8">
                                        {getFileIcon(file.mime_type, 'large')}
                                        <h3 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3 mt-4 text-gray-900">
                                            {file.original_name}
                                        </h3>
                                        <p className="text-gray-500 mb-6 text-sm sm:text-base">
                                            {formatFileSize(file.size)}
                                        </p>
                                        <div className="flex gap-3 flex-wrap justify-center">
                                            <button
                                                onClick={handleOpenViewer}
                                                className="px-4 sm:px-6 py-2 sm:py-3 bg-main text-white rounded-lg hover:bg-main-dark transition-colors flex items-center gap-2 text-sm sm:text-base"
                                            >
                                                <Eye className="w-5 h-5" />
                                                Открыть в просмотрщике
                                            </button>
                                            <button
                                                onClick={downloadFile}
                                                disabled={downloading}
                                                className="px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm sm:text-base"
                                            >
                                                {downloading ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Скачивание...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download className="w-4 h-4" />
                                                        Скачать
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Правая колонка - информация о файле */}
                        <div className="lg:w-80 xl:w-96 flex-shrink-0">
                            <div className="sticky top-24">
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
                                                onClick={handleOpenViewer}
                                                className="w-full px-4 py-3 bg-main text-white rounded-lg hover:bg-main-dark transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                                            >
                                                <Eye className="w-5 h-5" />
                                                Открыть в просмотрщике
                                            </button>

                                            <button
                                                onClick={downloadFile}
                                                disabled={downloading}
                                                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
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
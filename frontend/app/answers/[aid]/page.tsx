'use client'

import MainLayout from "@/layouts/MainLayout";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import JSZip from 'jszip';
import { NEXT_PUBLIC_API_URL } from "@/lib/axios.config";
import { useAuth } from "@/context/authContext";

// Импорты иконок из lucide-react
import {
    ArrowLeft,
    Download,
    Eye,
    FileArchive,
    FileImage,
    FileText,
    FileIcon,
    File,
    FolderArchive,
    X,
    MessageSquare,
    Calendar,
    User,
    BookOpen,
    CheckCircle,
    AlertCircle,
    Loader2,
    Star,
    StarOff,
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    FileCheck,
    GraduationCap,
    Clock,
    FolderOpen
} from 'lucide-react';

// Компонент слайдера
const FileSlider = ({ files, onClose }: { files: Array<{ name: string, url: string, type: string }>, onClose: () => void }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isZoomed, setIsZoomed] = useState(false);

    const currentFile = files[currentIndex];

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % files.length);
        setIsZoomed(false);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + files.length) % files.length);
        setIsZoomed(false);
    };

    const getFileIcon = (mimeType: string) => {
        if (mimeType.includes('pdf')) return <File className="w-16 h-16 text-red-500" />;
        if (mimeType.includes('image')) return <FileImage className="w-16 h-16 text-purple-500" />;
        if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="w-16 h-16 text-blue-500" />;
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileText className="w-16 h-16 text-green-500" />;
        if (mimeType.includes('text')) return <FileText className="w-16 h-16 text-gray-500" />;
        return <FileIcon className="w-16 h-16 text-gray-400" />;
    };

    const renderFileContent = () => {
        if (currentFile.type.startsWith('image/')) {
            return (
                <div className="relative">
                    <img
                        src={currentFile.url}
                        alt={currentFile.name}
                        className={`max-w-full max-h-[80vh] object-contain transition-transform duration-300 ${isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'}`}
                        onClick={() => setIsZoomed(!isZoomed)}
                    />
                    <button
                        onClick={() => setIsZoomed(!isZoomed)}
                        className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm p-2 rounded-full text-white hover:bg-black/70 transition-colors"
                    >
                        {isZoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
                    </button>
                </div>
            );
        } else if (currentFile.type === 'application/pdf') {
            return (
                <iframe
                    src={currentFile.url}
                    className="w-full h-[80vh] border-0 bg-white rounded-lg"
                    title={currentFile.name}
                />
            );
        } else if (currentFile.type.startsWith('text/')) {
            return (
                <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
                    <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                        <span className="text-sm text-gray-600 font-medium">{currentFile.name}</span>
                        <span className="text-xs text-gray-500">Текстовый файл</span>
                    </div>
                    <iframe
                        src={currentFile.url}
                        className="w-full h-[70vh] bg-white"
                        title={currentFile.name}
                        style={{ border: 'none' }}
                    />
                </div>
            );
        } else {
            return (
                <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-lg shadow-xl max-w-2xl mx-auto">
                    {getFileIcon(currentFile.type)}
                    <h3 className="text-2xl font-semibold mb-3 mt-4 text-gray-900">
                        {currentFile.name}
                    </h3>
                    <p className="text-gray-600 mb-6">
                        Этот тип файла нельзя просмотреть в браузере
                    </p>
                    <a
                        href={currentFile.url}
                        download={currentFile.name}
                        className="px-6 py-3 bg-main text-white rounded-lg hover:bg-main-dark transition-colors flex items-center gap-2"
                    >
                        <Download className="w-5 h-5" />
                        Скачать файл
                    </a>
                </div>
            );
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="relative w-full h-full flex flex-col">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10 bg-black/50 rounded-full w-10 h-10 flex items-center justify-center backdrop-blur-sm"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg z-10">
                    <div className="text-white text-sm">{currentIndex + 1} / {files.length}</div>
                    <div className="text-white text-sm font-medium max-w-md truncate">{currentFile.name}</div>
                </div>

                <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
                    {renderFileContent()}
                </div>

                {files.length > 1 && (
                    <>
                        <button
                            onClick={prevSlide}
                            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10 bg-black/50 rounded-full w-12 h-12 flex items-center justify-center backdrop-blur-sm"
                        >
                            <ChevronLeft className="w-8 h-8" />
                        </button>
                        <button
                            onClick={nextSlide}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10 bg-black/50 rounded-full w-12 h-12 flex items-center justify-center backdrop-blur-sm"
                        >
                            <ChevronRight className="w-8 h-8" />
                        </button>

                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 overflow-x-auto px-4 pb-2">
                            {files.map((file, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        setCurrentIndex(index);
                                        setIsZoomed(false);
                                    }}
                                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${index === currentIndex
                                        ? 'border-main scale-110'
                                        : 'border-white/50 opacity-60 hover:opacity-100'
                                        }`}
                                >
                                    {file.type.startsWith('image/') ? (
                                        <img
                                            src={file.url}
                                            alt={file.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-700 text-white">
                                            {file.type.includes('pdf') && <File className="w-6 h-6" />}
                                            {file.type.includes('image') && <FileImage className="w-6 h-6" />}
                                            {file.type.includes('text') && <FileText className="w-6 h-6" />}
                                            {!file.type.includes('pdf') && !file.type.includes('image') && !file.type.includes('text') && <FileIcon className="w-6 h-6" />}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default function AnswerPage() {
    const params = useParams();
    const router = useRouter();
    const auth = useAuth();
    if (!auth) return null;
    const { user, loading: authLoading, get, post } = auth;
    const [pageLoading, setPageLoading] = useState(true);

    const [zipFiles, setZipFiles] = useState<Array<{ name: string, url: string, type: string }>>([]);
    const [showSlider, setShowSlider] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [alertMess, setAlertMess] = useState<{ content: any }>();
    const [submitting, setSubmitting] = useState(false);
    const [task, setTask] = useState<{
        id: number,
        student: string,
        studentId: string,
        deadline: string,
        teacher_comment: string,
        students_comment: string,
        mark: string,
        fileId: number,
        fileUrl: string,
        fileType: string,
        fileName: string,
    }>();

    useEffect(() => {
        if (!authLoading && user) {
            getTaskInfo((params?.aid)?.toString() || '');
        } else if (!authLoading && !user) {
            router.push('/login');
        }

        return () => {
            zipFiles.forEach(file => {
                if (file.url && file.url.startsWith('blob:')) {
                    URL.revokeObjectURL(file.url);
                }
            });
        };
    }, [authLoading, user, params?.aid]);

    const extractZipFile = async (fileId: number) => {
        setIsExtracting(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/files/download/${fileId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Ошибка загрузки ZIP файла');
            }

            const blob = await response.blob();
            const zip = new JSZip();
            const zipContent = await zip.loadAsync(blob);

            const extractedFiles: Array<{ name: string, url: string, type: string }> = [];

            for (const [path, file] of Object.entries(zipContent.files)) {
                if (!file.dir) {
                    const fileBlob = await file.async('blob');
                    const fileUrl = URL.createObjectURL(fileBlob);
                    const fileName = path.split('/').pop() || path;

                    const extension = fileName.split('.').pop()?.toLowerCase();
                    let mimeType = '';

                    if (extension === 'pdf') mimeType = 'application/pdf';
                    else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) mimeType = `image/${extension}`;
                    else if (extension === 'txt') mimeType = 'text/plain';
                    else if (extension === 'html') mimeType = 'text/html';
                    else if (extension === 'css') mimeType = 'text/css';
                    else if (extension === 'js') mimeType = 'application/javascript';
                    else mimeType = 'application/octet-stream';

                    extractedFiles.push({
                        name: fileName,
                        url: fileUrl,
                        type: mimeType
                    });
                }
            }

            setZipFiles(extractedFiles);

            if (extractedFiles.length > 0) {
                setShowSlider(true);
            }

            showAlert('ZIP архив распакован!', `Найдено файлов: ${extractedFiles.length}`, 'success');
        } catch (error) {
            console.error('Ошибка распаковки ZIP:', error);
            showAlert('Ошибка распаковки ZIP', 'Файл может быть поврежден или защищен паролем', 'error');
        } finally {
            setIsExtracting(false);
        }
    };

    const getTaskInfo = async (id: string) => {
        setPageLoading(true);
        try {
            const response = await get(`/get-answers/${id}`);
            const answerData = response.data.data || response.data;

            setTask({
                id: answerData.id,
                student: answerData.user?.name || answerData.student_name || 'Неизвестно',
                studentId: answerData.user?.id || answerData.student_id,
                mark: answerData.mark || 'н/а',
                deadline: answerData.task?.deadline || answerData.deadline,
                teacher_comment: answerData.teacher_comment || '',
                students_comment: answerData.students_comment || '',
                fileId: answerData.file?.id || 0,
                fileUrl: answerData.file?.path || '',
                fileType: answerData.file?.mime_type || '',
                fileName: answerData.file?.original_name || '',
            });

            if (answerData.file && (answerData.file.mime_type === 'application/zip' || answerData.file.original_name?.endsWith('.zip'))) {
                await extractZipFile(answerData.file.id);
            }
        } catch (error: any) {
            console.error('Ошибка загрузки ответа:', error);
            showAlert('Ошибка', error.message || 'Не удалось загрузить информацию об ответе', 'error');
        } finally {
            setPageLoading(false);
        }
    };

    const showAlert = (title: string, message: string, type: 'success' | 'error' = 'success') => {
        const alertContent = (
            <div>
                <div className="flex items-center gap-2">
                    {type === 'success' ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
                    <span className="font-semibold">{title}</span>
                </div>
                <div className="font-semibold my-1">{message}</div>
                <div className="text-xs text-gray-500">
                    в {new Date().toLocaleTimeString()}, {new Date().toLocaleDateString()}
                </div>
            </div>
        );
        setAlertMess({ content: alertContent });
    };

    const setAnswer = async (event: FormEvent) => {
        event.preventDefault();
        setSubmitting(true);

        const form: any = event.target;
        const newData = {
            id: task?.id,
            mark: form.mark.value,
            teachers_comment: form.teachers_comment.value
        };

        try {
            const response = await post('/grade-task', newData);
            showAlert('Оценка выставлена!', response.message || 'Оценка успешно сохранена', 'success');
            getTaskInfo((params?.aid)?.toString() || '');
        } catch (error: any) {
            showAlert('Ошибка', error.message || 'Не удалось сохранить оценку', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const getFileIcon = (mimeType: string) => {
        if (mimeType.includes('pdf')) return <File className="w-20 h-20 text-red-500" />;
        if (mimeType.includes('image')) return <FileImage className="w-20 h-20 text-purple-500" />;
        if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="w-20 h-20 text-blue-500" />;
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileText className="w-20 h-20 text-green-500" />;
        if (mimeType.includes('zip') || mimeType.includes('compressed')) return <FileArchive className="w-20 h-20 text-yellow-500" />;
        if (mimeType.includes('text') || mimeType.includes('plain')) return <FileText className="w-20 h-20 text-gray-500" />;
        return <FileIcon className="w-20 h-20 text-gray-400" />;
    };

    const getSmallFileIcon = (mimeType: string) => {
        if (mimeType.includes('pdf')) return <File className="w-5 h-5 text-red-500" />;
        if (mimeType.includes('image')) return <FileImage className="w-5 h-5 text-purple-500" />;
        if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="w-5 h-5 text-blue-500" />;
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileText className="w-5 h-5 text-green-500" />;
        if (mimeType.includes('zip') || mimeType.includes('compressed')) return <FileArchive className="w-5 h-5 text-yellow-500" />;
        if (mimeType.includes('text') || mimeType.includes('plain')) return <FileText className="w-5 h-5 text-gray-500" />;
        return <FileIcon className="w-5 h-5 text-gray-400" />;
    };

    const getFileUrl = (filePath: string) => {
        return `${NEXT_PUBLIC_API_URL}/storage/${filePath}`;
    };

    const downloadFile = async (fileId: number, fileName: string) => {
        const newFileName = prompt(`Под каким именем сохранить? \n по умолчанию: (${fileName})`) || fileName;

        try {
            const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/files/download/${fileId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (!response.ok) {
                throw new Error('Ошибка загрузки файла');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = newFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            showAlert('Файл успешно сохранен!', `Файл сохранен под именем: ${newFileName}`, 'success');
        } catch (error: any) {
            console.error('Error downloading file:', error);
            showAlert('Ошибка', error.message, 'error');
        }
    };

    const handleViewArchive = () => {
        if (zipFiles.length > 0) {
            setShowSlider(true);
        } else if (task?.fileId) {
            extractZipFile(task.fileId);
        }
    };

    if (authLoading || pageLoading) {
        return (
            <MainLayout>
                <div className="h-screen flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 text-main animate-spin mb-4" />
                    <div className="text-lg text-gray-500">Загрузка...</div>
                </div>
            </MainLayout>
        );
    }

    if (!user || !task) {
        return null;
    }

    const isZipFile = task?.fileType === 'application/zip' || task?.fileName?.endsWith('.zip');
    const getMarkColor = () => {
        const mark = parseInt(task?.mark);
        if (isNaN(mark)) return 'text-gray-600';
        if (mark >= 4) return 'text-green-600';
        if (mark >= 3) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <MainLayout alertMess={alertMess?.content}>
            {showSlider && (
                <FileSlider
                    files={zipFiles}
                    onClose={() => setShowSlider(false)}
                />
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
                                Ответ ученика
                            </h2>
                            <p className="text-gray-500 text-sm sm:text-base mt-1">
                                Просмотр и оценивание работы
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Левая колонка - содержимое ответа */}
                        <div className="flex-1 min-w-0">
                            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                                <div className="bg-main px-4 sm:px-6 py-3 sm:py-4">
                                    <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
                                        <FolderOpen className="w-5 h-5" />
                                        Содержимое ответа
                                    </h3>
                                </div>
                                <div className="min-h-[400px] sm:min-h-[500px] bg-gray-50">
                                    {isZipFile ? (
                                        <div className="flex flex-col items-center justify-center min-h-[400px] sm:min-h-[500px] text-center p-6 sm:p-8">
                                            <FolderArchive className="w-20 h-20 sm:w-24 sm:h-24 text-yellow-500 mb-4 sm:mb-6" />
                                            <h3 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3 text-gray-900">ZIP архив</h3>
                                            <p className="text-gray-600 mb-2 text-sm sm:text-base">{task?.fileName}</p>
                                            <p className="text-gray-500 mb-6 text-xs sm:text-sm">Этот архив содержит вложенные файлы</p>
                                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                                <button
                                                    onClick={handleViewArchive}
                                                    disabled={isExtracting}
                                                    className="px-4 sm:px-6 py-2 sm:py-3 bg-main text-white rounded-lg hover:bg-main-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                                                >
                                                    {isExtracting ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            Распаковка...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FolderOpen className="w-4 h-4" />
                                                            {zipFiles.length > 0 ? 'Просмотр архива' : 'Распаковать архив'}
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => downloadFile(task?.fileId || 0, task?.fileName || '')}
                                                    className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                                                >
                                                    <Download className="w-4 h-4" />
                                                    Скачать архив
                                                </button>
                                            </div>
                                            {zipFiles.length > 0 && (
                                                <div className="mt-4 text-xs sm:text-sm text-gray-500 flex items-center gap-2">
                                                    <FileCheck className="w-4 h-4" />
                                                    Найдено файлов: {zipFiles.length}
                                                </div>
                                            )}
                                        </div>
                                    ) : task?.fileType?.startsWith('image/') ? (
                                        <div
                                            className="flex items-center justify-center min-h-[400px] sm:min-h-[500px] p-4 sm:p-8 cursor-pointer hover:bg-gray-100 transition-colors"
                                            onClick={() => {
                                                setZipFiles([{
                                                    name: task.fileName,
                                                    url: getFileUrl(task.fileUrl),
                                                    type: task.fileType
                                                }]);
                                                setShowSlider(true);
                                            }}
                                        >
                                            <img
                                                src={getFileUrl(task?.fileUrl || '')}
                                                alt={task?.fileName}
                                                className="max-w-full max-h-full object-contain rounded-lg"
                                            />
                                        </div>
                                    ) : task?.fileType === 'application/pdf' ? (
                                        <iframe
                                            src={getFileUrl(task?.fileUrl || '')}
                                            className="w-full min-h-[400px] sm:min-h-[500px] border-0 rounded-b-lg"
                                            title={task?.fileName}
                                        />
                                    ) : task?.fileType?.startsWith('text/') ? (
                                        <div className="w-full min-h-[400px] sm:min-h-[500px] p-4">
                                            <iframe
                                                src={getFileUrl(task?.fileUrl || '')}
                                                className="w-full h-[500px] border rounded-lg bg-white"
                                                title={task?.fileName}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center min-h-[400px] sm:min-h-[500px] text-center p-6 sm:p-8">
                                            {getFileIcon(task?.fileType?.toString() || '')}
                                            <h3 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3 mt-4 text-gray-900">
                                                {task?.fileName}
                                            </h3>
                                            <p className="text-gray-500 mb-6 text-sm sm:text-base">
                                                Этот тип файла нельзя просмотреть на сайте
                                            </p>
                                            <button
                                                onClick={() => downloadFile(task?.fileId || 0, task?.fileName || '')}
                                                className="px-4 sm:px-6 py-2 sm:py-3 bg-main text-white rounded-lg hover:bg-main-dark transition-colors flex items-center gap-2 text-sm sm:text-base"
                                            >
                                                <Download className="w-4 h-4" />
                                                Скачать файл
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Правая колонка - информация и форма оценивания */}
                        <div className="lg:w-80 xl:w-96 flex-shrink-0">
                            <div className="sticky top-4">
                                <div className="bg-white rounded-xl shadow-lg border border-gray-100">
                                    <div className="bg-main px-4 sm:px-6 py-3 sm:py-4 rounded-t-xl">
                                        <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
                                            <GraduationCap className="w-5 h-5" />
                                            Информация
                                        </h3>
                                    </div>

                                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                                        {/* Информация об ученике */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                                <User className="w-5 h-5 text-main flex-shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs text-gray-500">Ученик</p>
                                                    <Link
                                                        href={`/users/${task?.studentId}`}
                                                        className="text-main hover:text-main-dark font-medium truncate block"
                                                    >
                                                        {task?.student}
                                                    </Link>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                                <Calendar className="w-5 h-5 text-main flex-shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs text-gray-500">Срок сдачи</p>
                                                    <p className="text-gray-900 font-medium text-sm break-words">
                                                        {task?.deadline ? new Date(task.deadline).toLocaleDateString('ru-RU', {
                                                            day: 'numeric',
                                                            month: 'long',
                                                            year: 'numeric'
                                                        }) : 'Не указан'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                                <MessageSquare className="w-5 h-5 text-main flex-shrink-0 mt-0.5" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-500 mb-1">Комментарий ученика</p>
                                                    <p className="text-gray-700 text-sm break-words">
                                                        {task?.students_comment || 'Нет комментария'}
                                                    </p>
                                                </div>
                                            </div>

                                            {task?.mark && task.mark !== 'н/а' && (
                                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                                    <Star className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                                                    <div>
                                                        <p className="text-xs text-gray-500">Текущая оценка</p>
                                                        <p className={`text-2xl font-bold ${getMarkColor()}`}>
                                                            {task?.mark}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Кнопка скачивания */}
                                        <button
                                            onClick={() => downloadFile(task?.fileId || 0, task?.fileName || '')}
                                            className="w-full px-4 py-3 bg-main text-white rounded-lg hover:bg-main-dark transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                                        >
                                            <Download className="w-5 h-5" />
                                            Скачать ответ
                                        </button>

                                        {/* Кнопка просмотра архива для ZIP */}
                                        {isZipFile && zipFiles.length > 0 && (
                                            <button
                                                onClick={handleViewArchive}
                                                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                                            >
                                                <FolderOpen className="w-5 h-5" />
                                                Просмотреть архив ({zipFiles.length} файлов)
                                            </button>
                                        )}

                                        {/* Форма оценивания для учителя */}
                                        {user.role === 'teacher' && (
                                            <form className="space-y-4 pt-4 border-t border-gray-200" onSubmit={setAnswer}>
                                                <div>
                                                    <label htmlFor="teachers_comment" className="block text-sm font-medium text-gray-700 mb-2">
                                                        Комментарий учителя
                                                    </label>
                                                    <textarea
                                                        id="teachers_comment"
                                                        name="teachers_comment"
                                                        rows={3}
                                                        placeholder="Введите комментарий..."
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-main focus:border-transparent outline-none transition resize-none text-sm"
                                                        defaultValue={task?.teacher_comment || ''}
                                                    />
                                                </div>

                                                <div>
                                                    <label htmlFor="mark" className="block text-sm font-medium text-gray-700 mb-2">
                                                        Оценка
                                                    </label>
                                                    <select
                                                        name="mark"
                                                        id="mark"
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-main focus:border-transparent outline-none transition bg-white text-sm"
                                                        defaultValue={task?.mark || 'н/а'}
                                                    >
                                                        <option value="н/а">— Не оценено —</option>
                                                        <option value="2">2</option>
                                                        <option value="3">3</option>
                                                        <option value="4">4</option>
                                                        <option value="5">5</option>
                                                    </select>
                                                </div>

                                                <button
                                                    type="submit"
                                                    disabled={submitting}
                                                    className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                                                >
                                                    {submitting ? (
                                                        <>
                                                            <Loader2 className="w-5 h-5 animate-spin" />
                                                            Сохранение...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Star className="w-5 h-5" />
                                                            Поставить оценку
                                                        </>
                                                    )}
                                                </button>
                                            </form>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
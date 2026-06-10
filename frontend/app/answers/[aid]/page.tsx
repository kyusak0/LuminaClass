// app/answers/[aid]/page.tsx
'use client';

import MainLayout from "@/layouts/MainLayout";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, JSX, useEffect, useState } from "react";
import { NEXT_PUBLIC_API_URL } from "@/lib/axios.config";
import { useAuth } from "@/context/authContext";
import FileViewer from "@/components/files/FileViewer";
import ArchiveViewer from "@/components/files/ArchiveViewer";
import JSZip from 'jszip';
import axios from '@/lib/axios.config';

import {
    ArrowLeft,
    Download,
    FolderOpen,
    MessageSquare,
    Calendar,
    User,
    Star,
    CheckCircle,
    AlertCircle,
    Loader2,
    GraduationCap,
    FileCheck,
    Eye,
    FileArchive,
    Image as ImageIcon,
    FileText,
    FileIcon,
    File,
    FileCode,
    FileSpreadsheet,
    FileAudio,
    FileVideo,
    FileQuestion,
    FolderArchive,
    X,
    RefreshCw,
    Upload,
    Trash2,
    Send,
    Link2,
    ExternalLink
} from 'lucide-react';
import Loader from "@/components/loader/Loader";

// Вспомогательные функции для работы с файлами
const getCorrectMimeType = (mimeType: string, fileName: string): string => {
    const extension = fileName?.split('.').pop()?.toLowerCase() || '';

    if (extension === 'zip') return 'application/zip';
    if (extension === 'rar') return 'application/x-rar-compressed';

    const mimeMap: Record<string, string> = {
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc': 'application/msword',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xls': 'application/vnd.ms-excel',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'ppt': 'application/vnd.ms-powerpoint',
        'pdf': 'application/pdf',
        'txt': 'text/plain',
        'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
        'png': 'image/png', 'gif': 'image/gif',
        'webp': 'image/webp',
        'mp4': 'video/mp4', 'mp3': 'audio/mpeg',
    };

    return mimeMap[extension] || mimeType;
};

const getFileTypeByExtension = (fileName: string, mimeType: string): string => {
    const extension = fileName?.split('.').pop()?.toLowerCase() || '';

    // Проверяем архивы в первую очередь
    if (extension === 'zip' || extension === 'rar' || mimeType?.includes('zip') || mimeType?.includes('rar')) {
        return 'archive';
    }
    
    if (['doc', 'docx'].includes(extension)) return 'word';
    if (['xls', 'xlsx'].includes(extension)) return 'excel';
    if (['ppt', 'pptx'].includes(extension)) return 'presentation';
    if (['pdf'].includes(extension)) return 'pdf';
    if (['txt', 'csv', 'json', 'xml', 'html', 'css', 'js', 'md', 'log'].includes(extension)) return 'text';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension)) return 'image';
    if (['mp4', 'avi', 'mov', 'mkv'].includes(extension)) return 'video';
    if (['mp3', 'wav', 'ogg', 'flac'].includes(extension)) return 'audio';

    if (mimeType?.startsWith('text/')) return 'text';
    if (mimeType?.startsWith('image/')) return 'image';
    if (mimeType?.startsWith('video/')) return 'video';
    if (mimeType?.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'pdf';

    return 'other';
};

export default function AnswerPage() {
    const params = useParams();
    const router = useRouter();
    const auth = useAuth();
    if (!auth) return null;
    const { user, loading: authLoading, get, post } = auth;
    const [pageLoading, setPageLoading] = useState(true);

    const [fileData, setFileData] = useState<any>(null);
    const [showViewer, setShowViewer] = useState(false);
    const [showArchiveViewer, setShowArchiveViewer] = useState(false);
    const [archiveFileData, setArchiveFileData] = useState<any>(null);
    const [alertMess, setAlertMess] = useState<{ content: any }>();
    const [submitting, setSubmitting] = useState(false);
    const [task, setTask] = useState<{
        id: number;
        student: string;
        studentId: string;
        deadline: string;
        teacher_comment: string;
        students_comment: string;
        mark: string;
        fileId: number;
        fileUrl: string;
        fileType: string;
        fileName: string;
        task_title?: string;
        task_description?: string;
        task_file?: {
            id: number;
            original_name: string;
            path: string;
            mime_type: string;
            size: number;
        };
    }>();

    // Состояния для редактирования ответа (для ученика)
    const [editing, setEditing] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [newComment, setNewComment] = useState('');
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (!authLoading && user) {
            getTaskInfo((params?.aid)?.toString() || '');
        } else if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, user, params?.aid]);

    const getTaskInfo = async (id: string) => {
        setPageLoading(true);
        try {
            const response = await get(`/get-answers/${id}`);
            const answerData = response.data.data || response.data;

            const taskData = {
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
                task_title: answerData.task?.title || '',
                task_description: answerData.task?.description || '',
                task_file: answerData.task?.file,
            };

            setTask(taskData);
            setNewComment(answerData.students_comment || '');

            // Подготавливаем данные для FileViewer
            if (answerData.file) {
                const isArchive = answerData.file.original_name?.endsWith('.zip') || 
                                 answerData.file.original_name?.endsWith('.rar') ||
                                 answerData.file.mime_type?.includes('zip') ||
                                 answerData.file.mime_type?.includes('rar');
                
                const fileViewerData = {
                    id: answerData.file.id,
                    original_name: answerData.file.original_name,
                    mime_type: getCorrectMimeType(answerData.file.mime_type, answerData.file.original_name),
                    size: answerData.file.size || 0,
                    url: `${NEXT_PUBLIC_API_URL}/storage/${answerData.file.path}`,
                    serve_url: `${NEXT_PUBLIC_API_URL}/api/files/${answerData.file.id}/serve`,
                    file_type: getFileTypeByExtension(answerData.file.original_name, answerData.file.mime_type),
                    is_archive: isArchive,
                };
                setFileData(fileViewerData);

                // Если ZIP архив - подготавливаем данные для ArchiveViewer
                if (isArchive) {
                    setArchiveFileData({
                        id: answerData.file.id,
                        original_name: answerData.file.original_name,
                        mime_type: answerData.file.mime_type || 'application/zip',
                        size: answerData.file.size || 0,
                        url: `${NEXT_PUBLIC_API_URL}/storage/${answerData.file.path}`,
                        serve_url: `${NEXT_PUBLIC_API_URL}/api/files/serve/${answerData.file.id}`,
                    });
                }
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

        setTimeout(() => setAlertMess(undefined), 5000);
    };

    // Загрузка файла
    const uploadFile = async (file: File, customFileName?: string): Promise<number> => {
        const formData = new FormData();
        formData.append('file', file, customFileName || file.name);
        formData.append('author_id', user?.id.toString() || '1');

        const response = await axios.post('/save-file', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        return response.data.file_id;
    };

    // Обновление ответа (для ученика)
    const updateAnswer = async (event: FormEvent) => {
        event.preventDefault();
        if (!post || !task || updating) return;

        setUpdating(true);

        try {
            let fileId = task.fileId;

            // Если есть новые файлы, загружаем их
            if (selectedFiles.length > 0) {
                if (selectedFiles.length === 1) {
                    const fileName = prompt(`Название для файла \n по умолчанию: ${selectedFiles[0].name}`) || selectedFiles[0].name;
                    fileId = await uploadFile(selectedFiles[0], fileName);
                } else if (selectedFiles.length > 1) {
                    const zip = new JSZip();
                    for (const file of selectedFiles) {
                        const arrayBuffer = await file.arrayBuffer();
                        zip.file(file.name, arrayBuffer);
                    }

                    const zipBlob: Blob = await zip.generateAsync({ type: 'blob' });
                    const zipFileName = `answer_${Date.now()}.zip`;
                    const zipFile = new Blob([zipBlob], { type: 'application/zip' }) as File;
                    Object.defineProperty(zipFile, 'name', { value: zipFileName });
                    const fileName = prompt('Название для архива', zipFile.name) || zipFile.name;
                    fileId = await uploadFile(zipFile, fileName);
                }
            }

            const newData = {
                id: task.id,
                answer_id: fileId,
                students_comment: newComment,
            };

            await post('/update-answer', newData);

            setSelectedFiles([]);
            setEditing(false);

            showAlert('Ответ обновлен!', 'Изменения сохранены', 'success');
            await getTaskInfo((params?.aid)?.toString() || '');
        } catch (error: any) {
            showAlert('Ошибка', error.response?.data?.message || error.message || 'Не удалось обновить ответ', 'error');
        } finally {
            setUpdating(false);
        }
    };

    const setAnswer = async (event: FormEvent) => {
        event.preventDefault();
        setSubmitting(true);

        const form: any = event.target;
        const newData = {
            id: task?.id,
            mark: form.mark.value === 'н/а' ? null : form.mark.value,
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

    const downloadFile = async (fileId: number, fileName: string) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/files/download/${fileId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) throw new Error('Ошибка загрузки файла');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            showAlert('Файл сохранен!', fileName, 'success');
        } catch (error: any) {
            showAlert('Ошибка', error.message, 'error');
        }
    };

    const openTaskFile = () => {
        if (task?.task_file) {
            const isArchive = task.task_file.original_name?.endsWith('.zip') || 
                             task.task_file.original_name?.endsWith('.rar');
            
            const taskFileData = {
                id: task.task_file.id,
                original_name: task.task_file.original_name,
                mime_type: getCorrectMimeType(task.task_file.mime_type, task.task_file.original_name),
                size: task.task_file.size || 0,
                url: `${NEXT_PUBLIC_API_URL}/storage/${task.task_file.path}`,
                serve_url: `${NEXT_PUBLIC_API_URL}/api/files/${task.task_file.id}/serve`,
                file_type: getFileTypeByExtension(task.task_file.original_name, task.task_file.mime_type),
                is_archive: isArchive,
            };
            setFileData(taskFileData);
            
            if (isArchive) {
                setArchiveFileData({
                    id: task.task_file.id,
                    original_name: task.task_file.original_name,
                    mime_type: task.task_file.mime_type || 'application/zip',
                    size: task.task_file.size || 0,
                    url: `${NEXT_PUBLIC_API_URL}/storage/${task.task_file.path}`,
                    serve_url: `${NEXT_PUBLIC_API_URL}/api/files/serve/${task.task_file.id}`,
                });
                setShowArchiveViewer(true);
            } else {
                setShowViewer(true);
            }
        }
    };

    const getMarkColor = () => {
        const mark = parseInt(task?.mark || '0');
        if (isNaN(mark)) return 'text-gray-600';
        if (mark >= 4) return 'text-green-600';
        if (mark >= 3) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getSmallFileIcon = (mimeType: string, fileName?: string) => {
        const type = getFileTypeByExtension(fileName || '', mimeType);
        const icons: Record<string, JSX.Element> = {
            archive: <FileArchive className="w-5 h-5 text-yellow-500" />,
            image: <ImageIcon className="w-5 h-5 text-purple-500" />,
            pdf: <File className="w-5 h-5 text-red-500" />,
            word: <FileText className="w-5 h-5 text-blue-500" />,
            excel: <FileSpreadsheet className="w-5 h-5 text-green-500" />,
            presentation: <FileSpreadsheet className="w-5 h-5 text-orange-500" />,
            text: <FileCode className="w-5 h-5 text-gray-500" />,
            video: <FileVideo className="w-5 h-5 text-pink-500" />,
            audio: <FileAudio className="w-5 h-5 text-indigo-500" />,
        };
        return icons[type] || <FileIcon className="w-5 h-5 text-gray-400" />;
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFiles(Array.from(e.target.files));
        }
    };

    // Обработчик открытия файла из архива
    const handleFileFromArchive = (file: any) => {
        setFileData({
            ...file,
            file_type: getFileTypeByExtension(file.original_name, file.mime_type),
        });
        setShowViewer(true);
    };

    const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
    const isOwner = user?.id === task?.studentId;
    const isArchive = fileData?.is_archive || fileData?.file_type === 'archive';

    if (authLoading || pageLoading) {
        return <Loader />;
    }

    if (!user || !task) {
        return null;
    }

    return (
        <MainLayout alertMess={alertMess?.content}>
            {/* Модальное окно с FileViewer */}
            {showViewer && fileData && (
                <div className="fixed inset-0 z-50 bg-white overflow-auto">
                    <FileViewer
                        fileData={fileData}
                        onClose={() => {
                            setShowViewer(false);
                            setFileData(null);
                        }}
                        onFileOpen={handleFileFromArchive}
                    />
                </div>
            )}

            {/* ArchiveViewer Modal */}
            {showArchiveViewer && archiveFileData && (
                <ArchiveViewer
                    archive={archiveFileData}
                    onClose={() => setShowArchiveViewer(false)}
                    onFileOpen={handleFileFromArchive}
                    onFileExtracted={(newFile) => {
                        showAlert('Файл извлечен', newFile.original_name, 'success');
                    }}
                />
            )}

            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Header */}
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
                                {task.task_title && `Задание: ${task.task_title}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Левая колонка - предпросмотр файла ответа */}
                        <div className="flex-1 min-w-0">
                            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                                <div className="bg-main px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                                    <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
                                        <FolderOpen className="w-5 h-5" />
                                        Файл ответа
                                    </h3>
                                    <div className="flex gap-2">
                                        {isArchive && fileData && (
                                            <button
                                                onClick={() => setShowArchiveViewer(true)}
                                                className="px-3 py-1.5 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors text-sm"
                                            >
                                                <FolderArchive className="w-4 h-4 inline mr-1" />
                                                Открыть архив
                                            </button>
                                        )}
                                        {fileData && !isArchive && (
                                            <button
                                                onClick={() => setShowViewer(true)}
                                                className="px-3 py-1.5 bg-white text-main rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                                            >
                                                <Eye className="w-4 h-4 inline mr-1" />
                                                Открыть
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="min-h-[400px] sm:min-h-[500px] bg-gray-50">
                                    {fileData ? (
                                        <div className="flex flex-col items-center justify-center min-h-[400px] sm:min-h-[500px] text-center p-6 sm:p-8">
                                            {/* Превью для изображений */}
                                            {fileData.file_type === 'image' && fileData.url && !isArchive && (
                                                <img
                                                    src={fileData.url}
                                                    alt={fileData.original_name}
                                                    className="max-w-full max-h-[300px] object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity mb-4"
                                                    onClick={() => setShowViewer(true)}
                                                />
                                            )}

                                            {/* Иконка файла */}
                                            {(fileData.file_type !== 'image' || isArchive) && (
                                                <div className="text-6xl mb-4">
                                                    {isArchive && '📦'}
                                                    {!isArchive && fileData.file_type === 'pdf' && '📕'}
                                                    {!isArchive && fileData.file_type === 'word' && '📃'}
                                                    {!isArchive && fileData.file_type === 'excel' && '📊'}
                                                    {!isArchive && fileData.file_type === 'presentation' && '📽️'}
                                                    {!isArchive && fileData.file_type === 'text' && '📝'}
                                                    {!isArchive && fileData.file_type === 'video' && '🎬'}
                                                    {!isArchive && fileData.file_type === 'audio' && '🎵'}
                                                    {!isArchive && (!fileData.file_type || fileData.file_type === 'other') && '📎'}
                                                </div>
                                            )}

                                            <h3 className="text-xl sm:text-2xl font-semibold mb-2 text-gray-900 break-all">
                                                {fileData.original_name}
                                            </h3>

                                            <p className="text-gray-500 mb-2 text-sm">
                                                {fileData.mime_type}
                                                {fileData.size > 0 && ` • ${(fileData.size / 1024 / 1024).toFixed(2)} MB`}
                                            </p>

                                            {isArchive && (
                                                <p className="text-gray-400 mb-6 text-sm">
                                                    Архив содержит несколько файлов. Нажмите "Открыть архив" для просмотра содержимого.
                                                </p>
                                            )}

                                            <div className="flex gap-3">
                                                {isArchive ? (
                                                    <button
                                                        onClick={() => setShowArchiveViewer(true)}
                                                        className="px-6 py-3 bg-main text-white rounded-lg hover:bg-main-dark transition-colors flex items-center gap-2"
                                                    >
                                                        <FolderArchive className="w-5 h-5" />
                                                        Открыть архив
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setShowViewer(true)}
                                                        className="px-6 py-3 bg-main text-white rounded-lg hover:bg-main-dark transition-colors flex items-center gap-2"
                                                    >
                                                        <Eye className="w-5 h-5" />
                                                        Просмотреть
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => downloadFile(task.fileId, task.fileName)}
                                                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                                                >
                                                    <Download className="w-5 h-5" />
                                                    Скачать
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center min-h-[400px] text-gray-400">
                                            <div className="text-center">
                                                <FileCheck className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                                <p>Файл не прикреплен</p>
                                                {isOwner && !editing && (
                                                    <button
                                                        onClick={() => setEditing(true)}
                                                        className="mt-4 px-4 py-2 bg-main text-white rounded-lg hover:bg-main-dark transition-colors text-sm"
                                                    >
                                                        Добавить файл
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Файл задания */}
                            {task.task_file && (
                                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 mt-6">
                                    <div className="bg-gray-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                                        <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
                                            <FileCheck className="w-5 h-5" />
                                            Файл задания
                                        </h3>
                                        <div className="flex gap-2">
                                        <button
                                            onClick={openTaskFile}
                                            className="px-3 py-1.5 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors text-sm"
                                        >
                                            <Eye className="w-4 h-4 inline mr-1" />
                                            Открыть
                                        </button>
                                        <a className='px-3 py-1.5 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors text-sm' href={`/tasks/${task.id}`}><ExternalLink className="w-4 h-4 inline mr-1" /> Перейти</a></div>
                                    </div>
                                    <div className="p-6 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {getSmallFileIcon(task.task_file.mime_type, task.task_file.original_name)}
                                            <div>
                                                <p className="font-medium text-gray-900">{task.task_file.original_name}</p>
                                                <p className="text-sm text-gray-500">
                                                    {(task.task_file.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => downloadFile(task.task_file!.id, task.task_file!.original_name)}
                                            className="p-2 text-main hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            <Download className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Описание задания */}
                            {task.task_description && (
                                <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <MessageSquare className="w-5 h-5 text-main" />
                                        Описание задания
                                    </h3>
                                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                        {task.task_description}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Правая колонка - информация */}
                        <div className="lg:w-80 xl:w-96 flex-shrink-0">
                            <div className="sticky top-4 space-y-4">
                                {/* Информация */}
                                <div className="bg-white rounded-xl shadow-lg border border-gray-100">
                                    <div className="bg-main px-4 sm:px-6 py-3 sm:py-4 rounded-t-xl">
                                        <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
                                            <GraduationCap className="w-5 h-5" />
                                            Информация
                                        </h3>
                                    </div>

                                    <div className="p-4 sm:p-6 space-y-4">
                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            <User className="w-5 h-5 text-main flex-shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs text-gray-500">Ученик</p>
                                                <Link
                                                    href={`/users/${task.studentId}`}
                                                    className="text-main hover:text-main-dark font-medium truncate block"
                                                >
                                                    {task.student}
                                                </Link>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            <Calendar className="w-5 h-5 text-main flex-shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs text-gray-500">Срок сдачи</p>
                                                <p className="text-gray-900 font-medium text-sm">
                                                    {task.deadline ? new Date(task.deadline).toLocaleDateString('ru-RU', {
                                                        day: 'numeric', month: 'long', year: 'numeric'
                                                    }) : 'Не указан'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Комментарий ученика - редактируемый для владельца */}
                                        {!editing ? (
                                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                                <MessageSquare className="w-5 h-5 text-main flex-shrink-0 mt-0.5" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <p className="text-xs text-gray-500">Комментарий ученика</p>
                                                        {isOwner && (
                                                            <button
                                                                onClick={() => setEditing(true)}
                                                                className="text-xs text-main hover:text-main-dark"
                                                            >
                                                                Редактировать
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-700 text-sm break-words">
                                                        {task.students_comment || 'Нет комментария'}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <form onSubmit={updateAnswer} className="space-y-3">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Комментарий
                                                    </label>
                                                    <textarea
                                                        value={newComment}
                                                        onChange={(e) => setNewComment(e.target.value)}
                                                        rows={3}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-main focus:border-transparent outline-none transition text-sm"
                                                        placeholder="Введите комментарий..."
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Файл(ы)
                                                    </label>
                                                    <div className="flex items-center justify-center w-full">
                                                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                                                            <div className="flex flex-col items-center justify-center">
                                                                <Upload className="w-5 h-5 text-gray-400 mb-1" />
                                                                <p className="text-xs text-gray-500">
                                                                    <span className="font-semibold">Нажмите для загрузки</span>
                                                                </p>
                                                                <p className="text-xs text-gray-500">Несколько файлов будут упакованы в ZIP</p>
                                                            </div>
                                                            <input type="file" multiple className="hidden" onChange={handleFileChange} />
                                                        </label>
                                                    </div>

                                                    {selectedFiles.length > 0 && (
                                                        <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                                                            {selectedFiles.map((file, index) => (
                                                                <div key={index} className="flex items-center justify-between py-1 px-2 bg-gray-50 rounded">
                                                                    <span className="text-xs text-gray-600 truncate flex-1 flex items-center gap-2">
                                                                        {getSmallFileIcon(file.type, file.name)}
                                                                        {file.name}
                                                                    </span>
                                                                    <button type="button" onClick={() => removeFile(index)} className="text-red-500 hover:text-red-700">
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        type="submit"
                                                        disabled={updating}
                                                        className="flex-1 py-2 bg-main text-white rounded-lg hover:bg-main-dark transition-colors text-sm flex items-center justify-center gap-1"
                                                    >
                                                        {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                        Сохранить
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditing(false);
                                                            setSelectedFiles([]);
                                                            setNewComment(task.students_comment || '');
                                                        }}
                                                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                                                    >
                                                        Отмена
                                                    </button>
                                                </div>
                                            </form>
                                        )}

                                        {task.mark && task.mark !== 'н/а' && (
                                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                                <Star className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                                                <div>
                                                    <p className="text-xs text-gray-500">Текущая оценка</p>
                                                    <p className={`text-2xl font-bold ${getMarkColor()}`}>
                                                        {task.mark}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Форма оценивания (для учителя) */}
                                {isTeacher && (
                                    <div className="bg-white rounded-xl shadow-lg border border-gray-100">
                                        <div className="bg-green-600 px-4 sm:px-6 py-3 sm:py-4 rounded-t-xl">
                                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                                <Star className="w-5 h-5" />
                                                Оценивание
                                            </h3>
                                        </div>

                                        <form className="p-4 sm:p-6 space-y-4" onSubmit={setAnswer}>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Комментарий учителя
                                                </label>
                                                <textarea
                                                    id="teachers_comment"
                                                    name="teachers_comment"
                                                    rows={3}
                                                    placeholder="Введите комментарий..."
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-main focus:border-transparent outline-none transition resize-none text-sm"
                                                    defaultValue={task.teacher_comment || ''}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Оценка
                                                </label>
                                                <select
                                                    name="mark"
                                                    id="mark"
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-main focus:border-transparent outline-none transition bg-white text-sm"
                                                    defaultValue={task.mark || 'н/а'}
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
                                                className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
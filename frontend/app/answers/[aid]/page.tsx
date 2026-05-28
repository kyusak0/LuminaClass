// app/answers/[aid]/page.tsx
'use client';

import MainLayout from "@/layouts/MainLayout";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { NEXT_PUBLIC_API_URL } from "@/lib/axios.config";
import { useAuth } from "@/context/authContext";
import FileViewer from "@/components/files/FileViewer";

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
} from 'lucide-react';
import Loader from "@/components/loader/Loader";

export default function AnswerPage() {
    const params = useParams();
    const router = useRouter();
    const auth = useAuth();
    if (!auth) return null;
    const { user, loading: authLoading, get, post } = auth;
    const [pageLoading, setPageLoading] = useState(true);

    const [fileData, setFileData] = useState<any>(null);
    const [showViewer, setShowViewer] = useState(false);
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
    }>();

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
            };

            setTask(taskData);

            // Подготавливаем данные для FileViewer
            if (answerData.file) {
                const extension = answerData.file.original_name?.split('.').pop()?.toLowerCase() || '';

                setFileData({
                    id: answerData.file.id,
                    original_name: answerData.file.original_name,
                    mime_type: getCorrectMimeType(answerData.file.mime_type, extension),
                    size: answerData.file.size || 0,
                    url: `${NEXT_PUBLIC_API_URL}/storage/${answerData.file.path}`,
                    serve_url: `${NEXT_PUBLIC_API_URL}/api/files/${answerData.file.id}/serve`,
                    file_type: getFileTypeByExtension(extension, answerData.file.mime_type),
                });
            }
        } catch (error: any) {
            console.error('Ошибка загрузки ответа:', error);
            showAlert('Ошибка', error.message || 'Не удалось загрузить информацию об ответе', 'error');
        } finally {
            setPageLoading(false);
        }
    };

    // Вспомогательные функции
    const getCorrectMimeType = (mimeType: string, extension: string): string => {
        if (extension === 'zip' || extension === 'rar') return 'application/zip';

        const mimeMap: Record<string, string> = {
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'doc': 'application/msword',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'xls': 'application/vnd.ms-excel',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'ppt': 'application/vnd.ms-powerpoint',
            'pdf': 'application/pdf',
            'txt': 'text/plain',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'mp4': 'video/mp4',
        };

        return mimeMap[extension] || mimeType;
    };

    const getFileTypeByExtension = (extension: string, mimeType: string): string => {
        if (extension === 'zip' || extension === 'rar') return 'archive';

        const typeMap: Record<string, string> = {
            'doc': 'word', 'docx': 'word',
            'xls': 'excel', 'xlsx': 'excel',
            'ppt': 'presentation', 'pptx': 'presentation',
            'pdf': 'pdf',
            'txt': 'text', 'csv': 'text', 'json': 'text', 'xml': 'text',
            'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image', 'webp': 'image',
            'mp4': 'video', 'mp3': 'audio',
        };

        return typeMap[extension] || 'other';
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

    const downloadFile = async (fileId: number, fileName: string) => {
        try {
            const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/files/download/${fileId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
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

    const getMarkColor = () => {
        const mark = parseInt(task?.mark || '0');
        if (isNaN(mark)) return 'text-gray-600';
        if (mark >= 4) return 'text-green-600';
        if (mark >= 3) return 'text-yellow-600';
        return 'text-red-600';
    };

    if (authLoading || pageLoading) {
        return (
            <Loader />
        );
    }

    if (!user || !task) {
        return null;
    }

    return (
        <MainLayout alertMess={alertMess?.content}>
            {/* Модальное окно с FileViewer */}
            {showViewer && fileData && (
                <div className="fixed bg-white inset-0 z-50">
                    <FileViewer
                        fileData={fileData}
                        onClose={() => setShowViewer(false)}
                    />
                </div>
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
                                Просмотр и оценивание работы
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Левая колонка - предпросмотр файла */}
                        <div className="flex-1 min-w-0">
                            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                                <div className="bg-main px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                                    <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
                                        <FolderOpen className="w-5 h-5" />
                                        Файл ответа
                                    </h3>
                                    {fileData && (
                                        <button
                                            onClick={() => setShowViewer(true)}
                                            className="px-4 py-2 bg-white text-main rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                                        >
                                            Открыть
                                        </button>
                                    )}
                                </div>

                                <div className="min-h-[400px] sm:min-h-[500px] bg-gray-50">
                                    {fileData ? (
                                        <div className="flex flex-col items-center justify-center min-h-[400px] sm:min-h-[500px] text-center p-6 sm:p-8">
                                            {/* Иконка файла */}
                                            <div className="text-6xl mb-4">
                                                {fileData.file_type === 'archive' && '📦'}
                                                {fileData.file_type === 'image' && '🖼️'}
                                                {fileData.file_type === 'pdf' && '📕'}
                                                {fileData.file_type === 'word' && '📃'}
                                                {fileData.file_type === 'excel' && '📊'}
                                                {fileData.file_type === 'presentation' && '📽️'}
                                                {fileData.file_type === 'text' && '📝'}
                                                {fileData.file_type === 'video' && '🎬'}
                                                {fileData.file_type === 'audio' && '🎵'}
                                                {(!fileData.file_type || fileData.file_type === 'other') && '📎'}
                                            </div>

                                            <h3 className="text-xl sm:text-2xl font-semibold mb-2 text-gray-900">
                                                {fileData.original_name}
                                            </h3>

                                            <p className="text-gray-500 mb-2 text-sm">
                                                {fileData.mime_type}
                                                {fileData.size > 0 && ` • ${(fileData.size / 1024 / 1024).toFixed(2)} MB`}
                                            </p>

                                            {fileData.file_type === 'archive' && (
                                                <p className="text-gray-400 mb-6 text-sm">
                                                    Архив содержит несколько файлов. Откройте в просмотрщике для просмотра содержимого.
                                                </p>
                                            )}

                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => setShowViewer(true)}
                                                    className="px-6 py-3 bg-main text-white rounded-lg hover:bg-main-dark transition-colors flex items-center gap-2"
                                                >
                                                    <FolderOpen className="w-5 h-5" />
                                                    Просмотреть
                                                </button>
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
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
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

                                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                            <MessageSquare className="w-5 h-5 text-main flex-shrink-0 mt-0.5" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-gray-500 mb-1">Комментарий ученика</p>
                                                <p className="text-gray-700 text-sm break-words">
                                                    {task.students_comment || 'Нет комментария'}
                                                </p>
                                            </div>
                                        </div>

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

                                {/* Форма оценивания */}
                                {user.role === 'teacher' && (
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
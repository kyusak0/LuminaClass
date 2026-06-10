// app/tasks/[tid]/page.tsx
'use client';

import MainLayout from "@/layouts/MainLayout";
import { useAuth } from "@/context/authContext";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState, useCallback, useMemo, JSX } from "react";
import JSZip from 'jszip';
import FileViewer from "@/components/files/FileViewer";
import ArchiveViewer from "@/components/files/ArchiveViewer";
import SearchTable, { SearchRecord } from "@/components/searchTable/SearchTable";
import { NEXT_PUBLIC_API_URL } from "@/lib/axios.config";
import axios from '@/lib/axios.config';

import {
  ArrowLeft, Download, Eye, FileArchive, FileImage, FileText,
  FileIcon, File, FileCheck, FileX, FolderArchive, X, RefreshCw,
  Send, MessageSquare, Calendar, User, BookOpen, CheckCircle,
  AlertCircle, Loader2, Upload, FilePlus, Trash2, Archive,
  Image as ImageIcon, FileCode, FileSpreadsheet, FileAudio,
  FileVideo, FileQuestion, Star, StarOff, ExternalLink, ChevronRight,
  GraduationCap, FolderOpen
} from 'lucide-react';
import Loader from "@/components/loader/Loader";

// Типы
interface TaskInfo {
  id: number;
  title: string;
  teacher: string;
  teacherId: string;
  deadline: string;
  description: string;
  fileId: number;
  fileUrl: string;
  fileType: string;
  fileName: string;
  fileSize: number;
}

interface AnswerData {
  id: number;
  user_id: number;
  task_id: number;
  students_comment: string | null;
  mark: number | null;
  teacher_comment?: string;
  created_at: string;
  user: { id: number; name: string; email?: string };
  file?: {
    id: number;
    original_name: string;
    path: string;
    mime_type: string;
    size: number;
  };
}

export default function TaskPage() {
  const params = useParams();
  const router = useRouter();
  const auth = useAuth();
  const { get, post, user, loading: authLoading } = auth || {};

  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [alertMess, setAlertMess] = useState<{ content: any }>();
  const [task, setTask] = useState<TaskInfo | null>(null);
  const [answers, setAnswers] = useState<AnswerData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<AnswerData | null>(null);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [gradingComment, setGradingComment] = useState('');
  const [gradingMark, setGradingMark] = useState<string>('н/а');
  const [gradingSubmitting, setGradingSubmitting] = useState(false);

  // Состояния для FileViewer
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [viewingFile, setViewingFile] = useState<any>(null);
  const [showArchiveViewer, setShowArchiveViewer] = useState(false);
  const [archiveFileData, setArchiveFileData] = useState<any>(null);

  // Получение URL файла для отображения
  const getFileUrl = (path: string) => {
    if (!path) return '';
    // Если путь уже содержит полный URL
    if (path.startsWith('http')) return path;
    // Иначе формируем полный путь
    return `${NEXT_PUBLIC_API_URL}/storage/${path}`;
  };

  // Получение URL для serve endpoint
  const getServeUrl = (fileId: number) => {
    return `${NEXT_PUBLIC_API_URL}/api/files/serve/${fileId}`;
  };

  // Загрузка информации о задании
  const getTaskInfo = useCallback(async (id: number) => {
    if (!get) return;
    setError(null);
    setLoading(true);

    try {
      const res = await get(`/get-task/${id}`);
      const data = res.data.data;

      if (!data) throw new Error('Задание не найдено');

      const taskData: TaskInfo = {
        id: data.id,
        title: data.title,
        teacher: data.user?.name || 'Неизвестно',
        teacherId: data.user?.id || 0,
        deadline: data.deadline,
        description: data.description,
        fileId: data.file?.id || 0,
        fileUrl: data.file?.path || '',
        fileType: data.file?.mime_type || '',
        fileName: data.file?.original_name || '',
        fileSize: data.file?.size || 0,
      };

      setTask(taskData);

      // Устанавливаем ответы
      if (data.answers && Array.isArray(data.answers)) {
        setAnswers(data.answers);
      } else {
        setAnswers([]);
      }

      // Если ZIP архив - подготавливаем данные
      if (data.file && (data.file.original_name?.endsWith('.zip') || data.file.mime_type === 'application/zip')) {
        setArchiveFileData({
          id: data.file.id,
          original_name: data.file.original_name,
          mime_type: 'application/zip',
          size: data.file.size || 0,
          url: getFileUrl(data.file.path),
          serve_url: getServeUrl(data.file.id),
        });
      }
    } catch (error: any) {
      console.error('Ошибка загрузки задания:', error);
      setError(error.message || 'Не удалось загрузить информацию о задании');
      showAlert('Ошибка', error.message || 'Не удалось загрузить информацию о задании', 'error');
    } finally {
      setLoading(false);
    }
  }, [get]);

  // Показ уведомления
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

  // Отправка ответа
  const setAnswer = async (event: FormEvent) => {
    event.preventDefault();
    if (!post || !user || !task || submitting) return;

    setSubmitting(true);

    try {
      let fileId = null;

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
      } else {
        throw new Error('Не выбраны файлы для отправки');
      }

      const form: any = event.target;
      const newData = {
        task_id: task.id,
        answer_id: fileId,
        user_id: user.id,
        students_comment: form.students_comment.value || null,
      };

      await post('/create-answer', newData);

      form.reset();
      setSelectedFiles([]);
      setDisabled(false);

      showAlert('Ответ успешно отправлен!', 'Ответ отправлен', 'success');
      await getTaskInfo(task.id);
    } catch (error: any) {
      showAlert('Ошибка', error.response?.data?.message || error.message || 'Не удалось отправить ответ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Обработчики файлов
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
      setDisabled(false);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    if (selectedFiles.length === 1) setDisabled(true);
  };

  // Скачивание файла
  const downloadFile = async (fileId: number, fileName: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/files/download/${fileId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
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

  // Открытие файла в просмотрщике
  const openFileViewer = (file: any) => {
    const isArchive = file.original_name?.endsWith('.zip') ||
      file.original_name?.endsWith('.rar') ||
      file.mime_type?.includes('zip') ||
      file.mime_type?.includes('rar');

    const viewerData = {
      id: file.id,
      original_name: file.original_name,
      mime_type: file.mime_type,
      size: file.size || 0,
      url: file.path ? getFileUrl(file.path) : file.url,
      serve_url: getServeUrl(file.id),
      file_type: getFileTypeByExtension(file.original_name, file.mime_type),
      is_archive: isArchive,
    };

    console.log('Opening file:', viewerData);
    setViewingFile(viewerData);

    if (isArchive) {
      setArchiveFileData({
        id: file.id,
        original_name: file.original_name,
        mime_type: file.mime_type || 'application/zip',
        size: file.size || 0,
        url: file.path ? getFileUrl(file.path) : file.url,
        serve_url: getServeUrl(file.id),
      });
      setShowArchiveViewer(true);
    } else {
      setShowFileViewer(true);
    }
  };

  // Определение типа файла
  const getFileTypeByExtension = (fileName: string, mimeType: string): string => {
    const extension = fileName?.split('.').pop()?.toLowerCase() || '';

    if (extension === 'zip' || extension === 'rar') return 'archive';
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

  // Открытие модального окна для оценивания
  const openGradeModal = (answer: AnswerData) => {
    setSelectedAnswer(answer);
    setGradingComment(answer.teacher_comment || '');
    setGradingMark(answer.mark?.toString() || 'н/а');
    setShowGradeModal(true);
  };

  // Отправка оценки
  const submitGrade = async (event: FormEvent) => {
    event.preventDefault();
    if (!post || !selectedAnswer || gradingSubmitting) return;

    setGradingSubmitting(true);

    try {
      const newData = {
        id: selectedAnswer.id,
        mark: gradingMark === 'н/а' ? null : parseInt(gradingMark),
        teachers_comment: gradingComment
      };

      await post('/grade-task', newData);
      showAlert('Оценка выставлена!', 'Оценка успешно сохранена', 'success');
      setShowGradeModal(false);
      await getTaskInfo(task!.id);
    } catch (error: any) {
      showAlert('Ошибка', error.message || 'Не удалось сохранить оценку', 'error');
    } finally {
      setGradingSubmitting(false);
    }
  };

  // Обработчик файлов из архива
  const handleFileFromArchive = (file: any) => {
    setViewingFile({
      ...file,
      file_type: getFileTypeByExtension(file.original_name, file.mime_type),
    });
    setShowFileViewer(true);
  };

  // Иконки
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

  // Формирование данных для SearchTable
  const answerRecords = useMemo((): SearchRecord[] => {
    return answers.map(item => {
      let markValue = '—';
      let markClass = '';

      if (item.mark !== null && item.mark !== undefined) {
        markValue = item.mark.toString();
        if (item.mark >= 4) markClass = 'text-green-600 font-bold';
        else if (item.mark >= 3) markClass = 'text-yellow-600 font-bold';
        else markClass = 'text-red-600 font-bold';
      }

      return {
        id: item.id,
        columns: [
          {
            title: 'Ученик',
            key: 'student',
            data: {
              value: item.user.name || 'Неизвестно',
              size: 6,
              isFilter: true,
              add: 'font-medium'
            }
          },
          {
            title: 'Оценка',
            key: 'mark',
            data: {
              value: markValue,
              size: 3,
              add: markClass
            }
          }
        ]
      };
    });
  }, [answers]);

  // Действия для SearchTable
  const tableActions = [
    {
      label: 'Просмотр',
      icon: <Eye size={20} />,
      onClick: (record: SearchRecord) => {
        const answer = answers.find(a => a.id === record.id);
        if (answer?.file) openFileViewer(answer.file);
        else showAlert('Внимание', 'Нет файла для просмотра', 'error');
      },
      className: 'text-blue-600 hover:bg-blue-50',
      getLabel: (record: SearchRecord) => {
        const answer = answers.find(a => a.id === record.id);
        return answer?.file ? 'Просмотр' : 'Нет файла';
      }
    },
    {
      label: 'Оценить',
      icon: <Star size={20} />,
      onClick: (record: SearchRecord) => {
        const answer = answers.find(a => a.id === record.id);
        if (answer) openGradeModal(answer);
      },
      className: `text-yellow-600 hover:bg-yellow-50 ${user?.role == 'teacher' ? '' : 'hidden'}`
    },
    {
      label: 'Скачать',
      icon: <Download size={20} />,
      onClick: (record: SearchRecord) => {
        const answer = answers.find(a => a.id === record.id);
        if (answer?.file) downloadFile(answer.file.id, answer.file.original_name);
        else showAlert('Внимание', 'Нет файла для скачивания', 'error');
      },
      className: 'text-green-600 hover:bg-green-50',
      getLabel: (record: SearchRecord) => {
        const answer = answers.find(a => a.id === record.id);
        return answer?.file ? 'Скачать' : 'Нет файла';
      }
    },
    {
      label: 'Подробнее',
      icon: <ExternalLink size={20} />,
      onClick: (record: SearchRecord) => router.push(`/answers/${record.id}`),
      className: 'text-gray-600 hover:bg-gray-50'
    }
  ];

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    getTaskInfo(Number(params?.tid));
  }, [user, authLoading, params?.tid, getTaskInfo]);

  if (authLoading || loading) {
    return <Loader />;
  }

  if (!user || !task) return null;

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  return (
    <MainLayout alertMess={alertMess?.content}>
      {/* FileViewer Modal */}
      {showFileViewer && viewingFile && (
        <div className="fixed inset-0 z-50 bg-white overflow-auto">
          <FileViewer
            fileData={viewingFile}
            onClose={() => {
              setShowFileViewer(false);
              setViewingFile(null);
            }}
            onFileOpen={handleFileFromArchive}
          />
        </div>
      )}

      {/* ArchiveViewer Modal */}
      {showArchiveViewer && archiveFileData && (
        <ArchiveViewer
          archive={archiveFileData}
          onClose={() => {
            setShowArchiveViewer(false);
            setViewingFile(null);
          }}
          onFileOpen={handleFileFromArchive}
          onFileExtracted={(newFile) => {
            showAlert('Файл извлечен', newFile.original_name, 'success');
          }}
        />
      )}

      {/* Modal для оценивания ответа */}
      {showGradeModal && selectedAnswer && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="bg-green-600 px-6 py-4 rounded-t-xl flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <Star className="w-5 h-5" />
                Оценить ответ
              </h3>
              <button
                onClick={() => setShowGradeModal(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={submitGrade} className="p-6 space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-500">Ученик:</span>
                </div>
                <p className="font-medium text-gray-900">{selectedAnswer.user.name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-500">
                    Дата сдачи: {new Date(selectedAnswer.created_at).toLocaleString('ru-RU')}
                  </span>
                </div>
              </div>

              {selectedAnswer.students_comment && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Комментарий ученика
                  </label>
                  <div className="bg-gray-50 rounded-lg p-3 text-gray-700 text-sm">
                    {selectedAnswer.students_comment}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Комментарий учителя
                </label>
                <textarea
                  value={gradingComment}
                  onChange={(e) => setGradingComment(e.target.value)}
                  rows={4}
                  placeholder="Введите комментарий к работе..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Оценка
                </label>
                <select
                  value={gradingMark}
                  onChange={(e) => setGradingMark(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition bg-white"
                >
                  <option value="н/а">— Не оценено —</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowGradeModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={gradingSubmitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {gradingSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Сохранение...</>
                  ) : (
                    <><Star className="w-4 h-4" /> Сохранить оценку</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => router.push('/tasks')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{task.title}</h1>
              <p className="text-gray-500 text-sm mt-1">
                {task.teacher} • Срок: {new Date(task.deadline).toLocaleString('ru-RU')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Левая колонка - информация о задании */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden sticky top-4">
                <div className="bg-main px-4 sm:px-6 py-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Файл задания
                  </h3>
                </div>

                <div className="min-h-[400px] bg-gray-50 flex items-center justify-center p-6">
                  {task.fileId ? (
                    <div className="text-center w-full">
                      {task.fileType?.startsWith('image/') ? (
                        <img
                          src={getFileUrl(task.fileUrl)}
                          alt={task.fileName}
                          className="max-w-full max-h-[350px] object-contain mx-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => openFileViewer({ id: task.fileId, original_name: task.fileName, mime_type: task.fileType, path: task.fileUrl, size: task.fileSize })}
                          onError={(e) => {
                            console.error('Image load error:', e);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="text-6xl mb-4">
                            {task.fileName?.endsWith('.zip') ? '📦' : '📄'}
                          </div>
                          <h3 className="text-lg font-semibold mb-1">{task.fileName}</h3>
                          <p className="text-sm text-gray-500 mb-4">
                            {task.fileType || 'Неизвестный тип'}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => openFileViewer({ id: task.fileId, original_name: task.fileName, mime_type: task.fileType, path: task.fileUrl, size: task.fileSize })}
                          className="px-4 py-2 bg-main text-white rounded-lg hover:bg-main-dark transition-colors flex items-center gap-2 text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          Просмотреть
                        </button>
                        <button
                          onClick={() => downloadFile(task.fileId, task.fileName)}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
                        >
                          <Download className="w-4 h-4" />
                          Скачать
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400">
                      <FileQuestion className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Файл не прикреплен</p>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-main" />
                    Описание задания
                  </h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {task.description || 'Нет описания'}
                  </p>
                </div>
              </div>
            </div>

            {/* Правая колонка */}
            <div className="lg:col-span-3 space-y-6">
              {/* Форма отправки для учеников */}
              {!isTeacher && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Send className="w-5 h-5 text-main" />
                    Отправить ответ
                  </h3>

                  <form className="space-y-5" onSubmit={setAnswer}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Комментарий</label>
                      <textarea
                        id="students_comment"
                        name="students_comment"
                        rows={4}
                        placeholder="Введите комментарий к ответу..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-main focus:border-transparent outline-none transition resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Файл(ы) с ответом <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                          <div className="flex flex-col items-center justify-center pt-4 pb-4">
                            <Upload className="w-6 h-6 text-gray-400 mb-1" />
                            <p className="mb-1 text-xs text-gray-500">
                              <span className="font-semibold">Нажмите для загрузки</span> или перетащите
                            </p>
                            <p className="text-xs text-gray-500">Несколько файлов будут упакованы в ZIP</p>
                          </div>
                          <input type="file" name="file" multiple required className="hidden" onChange={handleFileChange} />
                        </label>
                      </div>

                      {selectedFiles.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-sm font-medium text-gray-700">
                            Выбрано: {selectedFiles.length} файл(ов)
                            {selectedFiles.length > 1 && <span className="text-main ml-1">(→ ZIP архив)</span>}
                          </p>
                          <div className="max-h-32 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                            {selectedFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between py-1 px-2 hover:bg-white rounded">
                                <span className="text-sm text-gray-600 truncate flex-1 flex items-center gap-2">
                                  {getSmallFileIcon(file.type, file.name)}
                                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                                <button type="button" onClick={() => removeFile(index)} className="text-red-500 hover:text-red-700">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={disabled || submitting}
                      className="w-full py-3 bg-main text-white rounded-lg hover:bg-main-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Отправка...</>
                      ) : (
                        <><Send className="w-5 h-5" /> Отправить ответ</>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Таблица ответов для учителя */}
              {isTeacher && (
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="bg-main px-4 sm:px-6 py-3 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <FileCheck className="w-5 h-5" />
                      Ответы учеников ({answers.length})
                    </h3>
                    <button
                      onClick={() => getTaskInfo(task.id)}
                      className="px-3 py-1.5 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors flex items-center gap-1 text-sm"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Обновить
                    </button>
                  </div>
                  <div className="p-4">
                    {answers.length > 0 ? (
                      <SearchTable
                        searchProps={answerRecords}
                        actions={tableActions}
                        compactView={false}
                        hideSearch={true}
                        hideFilters={true}
                        studentNameField="Ученик"
                        gradeField="Оценка"
                      />
                    ) : (
                      <div className="text-center py-12 text-gray-400">
                        <FileQuestion className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>Нет ответов</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
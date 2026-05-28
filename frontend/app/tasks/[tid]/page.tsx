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
  FileVideo, FileQuestion, Star, StarOff, ExternalLink, ChevronRight
} from 'lucide-react';

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
  created_at: string;
  user?: { id: number; name: string; email?: string };
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

  // Состояния для FileViewer
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [viewingFile, setViewingFile] = useState<any>(null);
  const [showArchiveViewer, setShowArchiveViewer] = useState(false);
  const [archiveFileData, setArchiveFileData] = useState<any>(null);

  // Получение правильного MIME типа
  const getCorrectMimeType = (mimeType: string, fileName: string): string => {
    const extension = fileName?.split('.').pop()?.toLowerCase() || '';

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
      'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
      'png': 'image/png', 'gif': 'image/gif',
      'mp4': 'video/mp4', 'mp3': 'audio/mpeg',
    };

    return mimeMap[extension] || mimeType;
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
          url: `${NEXT_PUBLIC_API_URL}/storage/${data.file.path}`,
          serve_url: `${NEXT_PUBLIC_API_URL}/api/files/serve/${data.file.id}`,
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
        const zipFile = new File([zipBlob], zipFileName, { type: 'application/zip' });
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
    const extension = file.original_name?.split('.').pop()?.toLowerCase() || '';

    const viewerData = {
      id: file.id,
      original_name: file.original_name,
      mime_type: getCorrectMimeType(file.mime_type, file.original_name),
      size: file.size || 0,
      url: file.path ? `${NEXT_PUBLIC_API_URL}/storage/${file.path}` : file.url,
      serve_url: `${NEXT_PUBLIC_API_URL}/api/files/${file.id}/serve`,
      file_type: getFileTypeByExtension(file.original_name, file.mime_type),
    };

    console.log('📂 Viewer data:', viewerData);

    setViewingFile(viewerData);
    setShowFileViewer(true);
  };

  // ✅ Функция определения типа по имени файла и MIME
  function getFileTypeByExtension(fileName: string, mimeType: string): string {
    const extension = fileName?.split('.').pop()?.toLowerCase() || '';

    // Сначала проверяем расширение
    if (['txt', 'csv', 'json', 'xml', 'html', 'css', 'js', 'md', 'log'].includes(extension)) {
      return 'text';
    }

    if (['zip', 'rar'].includes(extension)) return 'archive';
    if (['doc', 'docx'].includes(extension)) return 'word';
    if (['xls', 'xlsx'].includes(extension)) return 'excel';
    if (['ppt', 'pptx'].includes(extension)) return 'presentation';
    if (['pdf'].includes(extension)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension)) return 'image';
    if (['mp4', 'avi', 'mov'].includes(extension)) return 'video';
    if (['mp3', 'wav', 'ogg'].includes(extension)) return 'audio';

    // Затем MIME тип
    if (mimeType?.startsWith('text/')) return 'text';
    if (mimeType?.startsWith('image/')) return 'image';
    if (mimeType?.startsWith('video/')) return 'video';
    if (mimeType?.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType?.includes('zip') || mimeType?.includes('rar')) return 'archive';
    if (mimeType?.includes('word') || mimeType?.includes('document')) return 'word';
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return 'excel';
    if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation')) return 'presentation';

    return 'other';
  }

  // Обработчик файлов из архива
  const handleFileFromArchive = (file: any) => {
    setViewingFile({
      ...file,
      file_type: file.file_type || getFileTypeByExtension(file.original_name, file.mime_type),
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

  // Таблица ответов
  const answerRecords = useMemo((): SearchRecord[] => {
    return answers.map(item => {
      let markValue = '—';
      let markClass = 'text-gray-400';

      if (item.mark !== null && item.mark !== undefined) {
        markValue = item.mark.toString();
        if (item.mark >= 4) markClass = 'text-green-600 font-bold';
        else if (item.mark >= 3) markClass = 'text-yellow-600 font-bold';
        else markClass = 'text-red-600 font-bold';
      }

      return {
        id: item.id,
        task_id: item.task_id,
        columns: [
          {
            title: 'Ученик', key: 'student_name',
            data: { value: item.user?.name || 'Неизвестно', size: 2, isFilter: true, add: 'font-medium' }
          },
          {
            title: 'Дата сдачи', key: 'created_at',
            data: { value: item.created_at ? new Date(item.created_at).toLocaleString('ru-RU') : '—', size: 2, isFilter: true }
          },
          {
            title: 'Комментарий', key: 'comment',
            data: { value: item.students_comment || '—', size: 3, add: 'text-gray-700 max-w-[250px] truncate' }
          },
          {
            title: 'Файл ответа', key: 'answer_file',
            data: { value: item.file?.original_name || '—', size: 2, add: item.file ? 'text-blue-600 cursor-pointer hover:underline' : 'text-gray-400' }
          },
          {
            title: 'Оценка', key: 'mark',
            data: { value: markValue, size: 1, add: markClass }
          },
          {
            title: '', key: 'actions',
            data: { value: '→', size: 0.5, add: 'text-center' }
          }
        ]
      };
    });
  }, [answers]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    getTaskInfo(Number(params?.tid));
  }, [user, authLoading, params?.tid, getTaskInfo]);

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="h-screen flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-main animate-spin mb-4" />
          <div className="text-lg text-gray-500">Загрузка...</div>
        </div>
      </MainLayout>
    );
  }

  if (!user || !task) return null;

  const isZipFile = task.fileName?.endsWith('.zip') || task.fileType === 'application/zip';
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  return (
    <MainLayout alertMess={alertMess?.content}>
      {/* FileViewer Modal */}
      {showFileViewer && viewingFile && (
        <div className="fixed inset-0 z-50 bg-white">
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
            {/* Левая колонка - файл задания */}
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
                      {/* Превью для изображений */}
                      {task.fileType?.startsWith('image/') ? (
                        <img
                          src={`${NEXT_PUBLIC_API_URL}/storage/${task.fileUrl}`}
                          alt={task.fileName}
                          className="max-w-full max-h-[350px] object-contain mx-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => openFileViewer({ id: task.fileId, original_name: task.fileName, mime_type: task.fileType, path: task.fileUrl, size: task.fileSize })}
                        />
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="text-6xl mb-4">
                            {isZipFile ? '📦' : task.fileType?.includes('pdf') ? '📕' : '📄'}
                          </div>
                          <h3 className="text-lg font-semibold mb-1">{task.fileName}</h3>
                          <p className="text-sm text-gray-500 mb-4">
                            {isZipFile ? 'ZIP архив' : task.fileType}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2 justify-center">
                        {isZipFile ? (
                          <button
                            onClick={() => setShowArchiveViewer(true)}
                            className="px-4 py-2 bg-main text-white rounded-lg hover:bg-main-dark transition-colors flex items-center gap-2 text-sm"
                          >
                            <FolderArchive className="w-4 h-4" />
                            Открыть архив
                          </button>
                        ) : (
                          <button
                            onClick={() => openFileViewer({ id: task.fileId, original_name: task.fileName, mime_type: task.fileType, path: task.fileUrl, size: task.fileSize })}
                            className="px-4 py-2 bg-main text-white rounded-lg hover:bg-main-dark transition-colors flex items-center gap-2 text-sm"
                          >
                            <Eye className="w-4 h-4" />
                            Просмотреть
                          </button>
                        )}
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

            {/* Правая колонка - информация и форма */}
            <div className="lg:col-span-3 space-y-6">
              {/* Описание */}
              

              {/* Форма отправки (для учеников) */}
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

              {/* Таблица ответов (для учителя) */}
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
                        actions={[
                          {
                            label: 'Просмотр',
                            icon: <Eye className="w-4 h-4" />,
                            onClick: (record) => {
                              const answer = answers.find(a => a.id === record.id);
                              if (answer?.file) openFileViewer(answer.file);
                              else showAlert('Внимание', 'Нет файла', 'error');
                            },
                            className: 'bg-green-500 text-white hover:bg-green-600 px-3 py-1.5 rounded-lg text-sm',
                            getLabel: (record) => {
                              const answer = answers.find(a => a.id === record.id);
                              return answer?.file ? 'Просмотр' : 'Нет файла';
                            }
                          },
                          {
                            label: 'Перейти',
                            icon: <ExternalLink className="w-4 h-4" />,
                            onClick: (record) => router.push(`/answers/${record.id}`),
                            className: 'bg-purple-500 text-white hover:bg-purple-600 px-3 py-1.5 rounded-lg text-sm',
                            getLabel: () => 'К ответу'
                          }
                        ]}
                        compactView={true}
                        onRowClick={(record) => router.push(`/answers/${record.id}`)}
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
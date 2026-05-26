'use client'

import MainLayout from "@/layouts/MainLayout";
import { useAuth } from "@/context/authContext";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState, useCallback, useMemo } from "react";
import JSZip from 'jszip';
import FileViewer from "@/components/files/FileViewer";
import ArchiveViewer from "@/components/files/ArchiveViewer";
import SearchTable, { SearchRecord } from "@/components/searchTable/SearchTable";
import { NEXT_PUBLIC_API_URL } from "@/lib/axios.config";
import axios from '@/lib/axios.config';

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
  FileCheck,
  FileX,
  FolderArchive,
  X,
  RefreshCw,
  Send,
  MessageSquare,
  Calendar,
  User,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Loader2,
  Upload,
  FilePlus,
  Trash2,
  Archive,
  Image as ImageIcon,
  FileCode,
  FileSpreadsheet,
  FileAudio,
  FileVideo,
  FileQuestion,
  Star,
  StarOff,
  Clock,
  ExternalLink,
  ChevronRight
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
}

interface AnswerData {
  id: number;
  user_id: number;
  task_id: number;
  answer_id: number | null;
  students_comment: string | null;
  mark: number | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    name: string;
    email?: string;
  };
  file?: {
    id: number;
    original_name: string;
    path: string;
    mime_type: string;
    size: number;
  };
}

export default function BookingPage() {
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
  const [showArchiveViewer, setShowArchiveViewer] = useState(false);
  const [archiveFile, setArchiveFile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [viewingFile, setViewingFile] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Загрузка информации о задании и ответов
  const getTaskInfo = useCallback(async (id: number) => {
    if (!get) return;
    setError(null);
    setLoading(true);

    try {
      const res = await get(`/get-task/${id}`);
      const data = res.data.data;

      console.log(data)

      if (!data) {
        throw new Error('Задание не найдено');
      }

      // Устанавливаем данные задания
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
      };

      setTask(taskData);

      // Устанавливаем ответы (если есть)
      if (data.answers && Array.isArray(data.answers)) {
        setAnswers(data.answers);
      } else {
        setAnswers([]);
      }

      // Если файл - ZIP архив, подготавливаем для просмотра
      if (data.file && (data.file.mime_type === 'application/zip' || data.file.original_name?.endsWith('.zip'))) {
        setArchiveFile({
          id: data.file.id,
          original_name: data.file.original_name,
          mime_type: data.file.mime_type,
          size: data.file.size,
          author_id: data.file.author_id
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

  // Преобразование ответов в формат для SearchTable
  const answerRecords = useMemo((): SearchRecord[] => {
    if (!answers.length) return [];

    return answers.map((item) => {
      // Определяем статус и цвет оценки
      let markClass = 'text-gray-400';
      let markValue = '—';

      if (item.mark !== null && item.mark !== undefined) {
        markValue = item.mark.toString();
        if (item.mark >= 4) {
          markClass = 'text-green-600 font-bold';
        } else if (item.mark >= 3) {
          markClass = 'text-yellow-600 font-bold';
        } else if (item.mark > 0) {
          markClass = 'text-red-600 font-bold';
        }
      }

      return {
        id: item.id,
        task_id: item.task_id,
        columns: [
          {
            title: 'Ученик',
            key: 'student_name',
            data: {
              value: item.user?.name || 'Неизвестно',
              size: 2,
              isFilter: true,
              add: 'font-medium'
            }
          },
          {
            title: 'Дата сдачи',
            key: 'created_at',
            data: {
              value: item.created_at ? new Date(item.created_at).toLocaleString('ru-RU') : '—',
              size: 2,
              isFilter: true,
              add: 'text-gray-600 text-sm'
            }
          },
          {
            title: 'Комментарий',
            key: 'comment',
            data: {
              value: item.students_comment || '—',
              size: 3,
              add: 'text-gray-700 max-w-[250px] truncate'
            }
          },
          {
            title: 'Файл ответа',
            key: 'answer_file',
            data: {
              value: item.file?.original_name || '—',
              size: 2,
              add: item.file ? 'text-blue-600 cursor-pointer hover:underline' : 'text-gray-400'
            }
          },
          {
            title: 'Оценка',
            key: 'mark',
            data: {
              value: markValue,
              size: 1,
              add: markClass,
              tag: 'select'
            }
          },
          {
            title: '',
            key: 'actions',
            data: {
              value: '→',
              size: 0.5,
              add: 'text-center'
            }
          }
        ]
      };
    });
  }, [answers]);

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
  };

  // Загрузка файла на сервер
  const uploadFile = async (file: File, customFileName?: string): Promise<number> => {
    const formData = new FormData();
    const fileName = customFileName || file.name;
    formData.append('file', file, fileName);
    formData.append('author_id', user?.id.toString() || '1');

    const response = await axios.post('/save-file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
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

        const zipBlob:Blob = await zip.generateAsync({ type: 'blob' });
        const zipFileName:string = `answer_${Date.now()}.zip`;
        const zipFile = new File([zipBlob], zipFileName, { type: 'application/zip' });

        const fileName = prompt('Название для архива', zipFile.name) || zipFile.name;
        fileId = await uploadFile(zipFile, fileName);
      } else {
        throw new Error('Не выбраны файлы для отправки');
      }

      const form: any = event.target;
      const newData = {
        task_id: task?.id,
        answer_id: fileId,
        user_id: user?.id,
        students_comment: form.students_comment.value || null,
      };

      const response = await post('/create-answer', newData);

      form.reset();
      setSelectedFiles([]);
      setDisabled(false);

      const filesCount = selectedFiles.length;
      const message = filesCount > 1
        ? `${filesCount} файлов упакованы в ZIP архив`
        : 'Ответ успешно отправлен';

      showAlert('Ответ успешно отправлен!', message, 'success');

      // Обновляем данные задания и ответов
      await getTaskInfo(task.id);
    } catch (error: any) {
      console.error('Ошибка при отправке ответа:', error);
      showAlert('Ошибка', error.response?.data?.message || error.message || 'Не удалось отправить ответ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Обработка выбора файлов
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
      setDisabled(false);
    }
  };

  // Удаление файла
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    if (selectedFiles.length === 1) {
      setDisabled(true);
    }
  };

  // Получение иконки файла
  const getFileIcon = (mimeType: string, fileName?: string) => {
    const extension = fileName?.split('.').pop()?.toLowerCase();
    
    if (mimeType?.includes('pdf')) return <File className="w-5 h-5 text-red-500" />;
    if (mimeType?.includes('image')) return <ImageIcon className="w-5 h-5 text-purple-500" />;
    if (mimeType?.includes('word') || extension === 'doc' || extension === 'docx') return <FileText className="w-5 h-5 text-blue-500" />;
    if (mimeType?.includes('excel') || extension === 'xls' || extension === 'xlsx') return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    if (mimeType?.includes('zip') || extension === 'zip' || extension === 'rar') return <FileArchive className="w-5 h-5 text-yellow-500" />;
    if (mimeType?.includes('text') || extension === 'txt') return <FileCode className="w-5 h-5 text-gray-500" />;
    if (mimeType?.includes('audio')) return <FileAudio className="w-5 h-5 text-indigo-500" />;
    if (mimeType?.includes('video')) return <FileVideo className="w-5 h-5 text-pink-500" />;
    
    return <FileIcon className="w-5 h-5 text-gray-400" />;
  };

  // Получение большой иконки файла
  const getLargeFileIcon = (mimeType: string, fileName?: string) => {
    const extension = fileName?.split('.').pop()?.toLowerCase();
    
    if (mimeType?.includes('pdf')) return <File className="w-20 h-20 text-red-500" />;
    if (mimeType?.includes('image')) return <ImageIcon className="w-20 h-20 text-purple-500" />;
    if (mimeType?.includes('word') || extension === 'doc' || extension === 'docx') return <FileText className="w-20 h-20 text-blue-500" />;
    if (mimeType?.includes('excel') || extension === 'xls' || extension === 'xlsx') return <FileSpreadsheet className="w-20 h-20 text-green-500" />;
    if (mimeType?.includes('zip') || extension === 'zip' || extension === 'rar') return <FolderArchive className="w-20 h-20 text-yellow-500" />;
    if (mimeType?.includes('text') || extension === 'txt') return <FileCode className="w-20 h-20 text-gray-500" />;
    
    return <FileQuestion className="w-20 h-20 text-gray-400" />;
  };

  // Получение URL файла
  const getFileUrl = (filePath: string) => {
    return `${NEXT_PUBLIC_API_URL}/storage/${filePath}`;
  };

  // Скачивание файла
  const downloadFile = async (fileId: number, fileName: string) => {
    const newFileName = prompt(`Под каким именем сохранить? \n по умолчанию: (${fileName})`);

    if (newFileName === null) return;

    const finalFileName = newFileName || fileName;

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
      link.download = finalFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showAlert('Файл успешно сохранен!', `Файл сохранен под именем: ${finalFileName}`, 'success');
    } catch (error: any) {
      console.error('Error downloading file:', error);
      showAlert('Ошибка', error.message, 'error');
    }
  };

  // Переход к ответу
  const navigateToAnswer = (answerId: number) => {
    router.push(`/answers/${answerId}`);
  };

  // Просмотр файла задания
  const handleViewTaskFile = () => {
    if (!task?.fileId) return;

    setViewingFile({
      id: task.fileId,
      original_name: task.fileName,
      path: task.fileUrl,
      mime_type: task.fileType,
    });
    setShowFileViewer(true);
  };

  // Просмотр файла ответа
  const handleViewAnswerFile = (answer: AnswerData) => {
    if (!answer.file) return;

    setViewingFile({
      id: answer.file.id,
      original_name: answer.file.original_name,
      path: answer.file.path,
      mime_type: answer.file.mime_type,
      size: answer.file.size
    });
    setShowFileViewer(true);
  };

  // Действия для таблицы ответов
  const answerActions = useMemo(() => [
    {
      label: 'Скачать',
      icon: <Download className="w-4 h-4" />,
      onClick: (record: SearchRecord) => {
        const answer = answers.find(a => a.id === record.id);
        if (answer?.file?.id && answer?.file?.original_name) {
          downloadFile(answer.file.id, answer.file.original_name);
        } else {
          showAlert('Внимание', 'Файл не прикреплен к ответу', 'error');
        }
      },
      className: 'bg-blue-500 text-white hover:bg-blue-600 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1',
      getLabel: (record: SearchRecord) => {
        const answer = answers.find(a => a.id === record.id);
        return answer?.file ? 'Скачать файл' : 'Нет файла';
      }
    },
    {
      label: 'Просмотр',
      icon: <Eye className="w-4 h-4" />,
      onClick: (record: SearchRecord) => {
        const answer = answers.find(a => a.id === record.id);
        if (answer?.file) {
          handleViewAnswerFile(answer);
        } else {
          showAlert('Внимание', 'Нет файла для просмотра', 'error');
        }
      },
      className: 'bg-green-500 text-white hover:bg-green-600 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1',
      getLabel: (record: SearchRecord) => {
        const answer = answers.find(a => a.id === record.id);
        return answer?.file ? 'Просмотр' : 'Нет файла';
      }
    },
    {
      label: 'Перейти',
      icon: <ExternalLink className="w-4 h-4" />,
      onClick: (record: SearchRecord) => {
        if (record.id) {
          navigateToAnswer(Number(record.id));
        }
      },
      className: 'bg-purple-500 text-white hover:bg-purple-600 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1',
      getLabel: () => 'Перейти к ответу'
    }
  ], [answers]);

  function getAnswersCountText(count: number): string {
    if (count % 10 === 1 && count % 100 !== 11) return 'ответ';
    if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'ответа';
    return 'ответов';
  }

  // Кастомные рендереры для таблицы
  const customRenderers = useMemo(() => ({
    answer_file: (value: string, record: SearchRecord) => {
      const answer = answers.find(a => a.id === record.id);
      if (answer?.file && value !== '—') {
        return (
          <button
            onClick={() => handleViewAnswerFile(answer)}
            className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
          >
            {getFileIcon(answer.file.mime_type, answer.file.original_name)}
            <span className="truncate max-w-[200px]">{value}</span>
          </button>
        );
      }
      return <span className="text-gray-400 flex items-center gap-1"><FileX className="w-4 h-4" /> {value}</span>;
    },
    mark: (value: string, record: SearchRecord) => {
      const answer = answers.find(a => a.id === record.id);
      const mark = answer?.mark;
      
      if (mark && mark > 0) {
        return (
          <div className="flex items-center gap-1">
            {mark >= 4 ? <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> : <StarOff className="w-4 h-4 text-gray-400" />}
            <span className={mark >= 4 ? 'text-green-600 font-bold' : mark >= 3 ? 'text-yellow-600 font-bold' : 'text-red-600 font-bold'}>
              {mark}
            </span>
          </div>
        );
      }
      return <span className="text-gray-400">—</span>;
    },
    actions: (value: string, record: SearchRecord) => {
      return (
        <button
          onClick={() => navigateToAnswer(Number(record.id))}
          className="text-main hover:text-main-dark transition-colors p-1 rounded-full hover:bg-gray-100"
          title="Перейти к ответу"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      );
    }
  }), [answers]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    getTaskInfo(Number(params?.tid));
  }, [user, authLoading, params?.tid, getTaskInfo]);

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="h-170 flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-main animate-spin mb-4" />
          <div className="text-lg">Загрузка...</div>
        </div>
      </MainLayout>
    );
  }

  if (!user) return null;

  if (error && !task) {
    return (
      <MainLayout alertMess={alertMess?.content}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-800 mb-2">Ошибка загрузки</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/tasks')}
              className="px-6 py-2 bg-main text-white rounded-lg hover:bg-main-dark transition-colors flex items-center gap-2 mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Вернуться к списку заданий
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!task) return null;

  const isZipFile = task?.fileType === 'application/zip' || task?.fileName?.endsWith('.zip');
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  return (
    <MainLayout alertMess={alertMess?.content}>
      {/* File Viewer Modal */}
      {showFileViewer && viewingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[90vw] h-[90vh] flex flex-col">
            <div className="border-b p-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {getFileIcon(viewingFile.mime_type, viewingFile.original_name)}
                {viewingFile.original_name}
              </h3>
              <button
                onClick={() => setShowFileViewer(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {viewingFile.mime_type?.startsWith('image/') && viewingFile.path && (
                <img
                  src={getFileUrl(viewingFile.path)}
                  alt={viewingFile.original_name}
                  className="max-w-full max-h-full object-contain mx-auto"
                />
              )}
              {viewingFile.mime_type === 'application/pdf' && viewingFile.path && (
                <iframe
                  src={getFileUrl(viewingFile.path)}
                  className="w-full h-full"
                  title={viewingFile.original_name}
                />
              )}
              {(viewingFile.mime_type?.includes('text') || viewingFile.mime_type?.includes('word')) && (
                <FileViewer
                  file={viewingFile}
                  onClose={() => setShowFileViewer(false)}
                  onDownload={downloadFile}
                />
              )}
              {!viewingFile.mime_type?.startsWith('image/') && 
               viewingFile.mime_type !== 'application/pdf' && 
               !viewingFile.mime_type?.includes('text') && 
               !viewingFile.mime_type?.includes('word') && (
                <div className="text-center p-8">
                  {getLargeFileIcon(viewingFile.mime_type, viewingFile.original_name)}
                  <p className="mt-4 text-gray-600">Невозможно просмотреть этот тип файла</p>
                  <button
                    onClick={() => downloadFile(viewingFile.id, viewingFile.original_name)}
                    className="mt-4 px-4 py-2 bg-main text-white rounded-lg flex items-center gap-2 mx-auto"
                  >
                    <Download className="w-4 h-4" />
                    Скачать файл
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Archive Viewer */}
      {showArchiveViewer && archiveFile && (
        <ArchiveViewer
          archive={archiveFile}
          onClose={() => setShowArchiveViewer(false)}
          onFileOpen={(file) => {
            setViewingFile(file);
            setShowFileViewer(true);
          }}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/tasks')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h2 className="text-4xl font-bold">
            {task?.title}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Левая колонка - контент задания */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden sticky top-4">
              <div className="min-h-[400px] bg-gray-50">
                {isZipFile ? (
                  <div className="flex flex-col items-center justify-center h-[400px] text-center p-6">
                    <FolderArchive className="w-20 h-20 text-yellow-500 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">ZIP архив</h3>
                    <p className="text-gray-600 text-sm mb-4">{task?.fileName}</p>
                    <p className="text-gray-600 text-sm mb-4">Этот архив содержит вложенные файлы</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowArchiveViewer(true)}
                        className="px-4 py-2 bg-main text-white rounded-lg hover:bg-main-dark transition-colors flex items-center gap-2 text-sm"
                      >
                        <FolderArchive className="w-4 h-4" />
                        Просмотреть
                      </button>
                      <button
                        onClick={() => downloadFile(task?.fileId || 0, task?.fileName || '')}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Скачать
                      </button>
                    </div>
                  </div>
                ) : task?.fileType?.startsWith('image/') ? (
                  <div
                    className="flex items-center justify-center h-[400px] p-4 cursor-pointer"
                    onClick={handleViewTaskFile}
                  >
                    <img
                      src={getFileUrl(task?.fileUrl || '')}
                      alt={task?.fileName}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : task?.fileType === 'application/pdf' ? (
                  <iframe
                    src={getFileUrl(task?.fileUrl || '')}
                    className="w-full h-[400px] border-0"
                    title={task?.fileName}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] text-center p-6">
                    {getLargeFileIcon(task?.fileType, task?.fileName)}
                    <h3 className="text-xl font-semibold mb-2 mt-4">{task?.fileName}</h3>
                    <p className="text-gray-600 text-sm mb-4">Нажмите для просмотра или скачайте файл</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleViewTaskFile}
                        className="px-4 py-2 bg-main text-white rounded-lg hover:bg-main-dark transition-colors flex items-center gap-2 text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Просмотреть
                      </button>
                      <button
                        onClick={() => downloadFile(task?.fileId || 0, task?.fileName || '')}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Скачать
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Правая колонка - информация и форма отправки */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-main" />
                  Информация о задании
                </h3>

                <div className="space-y-3">
                  <div className="flex">
                    <div className="flex items-start gap-2 w-24">
                      <User className="w-4 h-4 text-gray-400 mt-0.5" />
                      <span className="text-sm text-gray-500">Учитель:</span>
                    </div>
                    <Link
                      href={`/users/${task?.teacherId}`}
                      className="text-main hover:text-main-dark font-medium"
                    >
                      {task?.teacher}
                    </Link>
                  </div>

                  <div className="flex">
                    <div className="flex items-start gap-2 w-24">
                      <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                      <span className="text-sm text-gray-500">Срок:</span>
                    </div>
                    <div className={`font-medium ${Date.parse(task?.deadline) <= Date.now() ? 'text-red-600' : 'text-gray-900'}`}>
                      {new Date(task?.deadline).toLocaleString('ru-RU')}
                    </div>
                  </div>

                  <div className="flex">
                    <div className="flex items-start gap-2 w-24">
                      <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                      <span className="text-sm text-gray-500">Описание:</span>
                    </div>
                    <p className="text-gray-700 leading-relaxed flex-1">
                      {task?.description || 'Нет описания'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Send className="w-5 h-5 text-main" />
                  Отправить ответ
                </h3>

                <form className="space-y-5" onSubmit={setAnswer}>
                  <div>
                    <label htmlFor="students_comment" className="block text-sm font-medium text-gray-700 mb-2">
                      Комментарий
                    </label>
                    <textarea
                      id="students_comment"
                      name="students_comment"
                      rows={4}
                      placeholder="Введите комментарий к ответу..."
                      className="w-full px-4 py-3 h-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-main focus:border-transparent outline-none transition resize-none"
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
                            <span className="font-semibold">Нажмите для загрузки</span> или перетащите файлы
                          </p>
                          <p className="text-xs text-gray-500">Можно выбрать несколько файлов (будут упакованы в ZIP)</p>
                        </div>
                        <input
                          type="file"
                          name="file"
                          multiple
                          required
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </label>
                    </div>

                    {selectedFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <FilePlus className="w-4 h-4 text-main" />
                          Выбрано файлов: {selectedFiles.length}
                          {selectedFiles.length > 1 && (
                            <span className="ml-2 text-main flex items-center gap-1">
                              <Archive className="w-3 h-3" />
                              (будут упакованы в ZIP архив)
                            </span>
                          )}
                        </p>
                        <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between py-1 px-2 hover:bg-white rounded">
                              <span className="text-sm text-gray-600 truncate flex-1 flex items-center gap-2">
                                {getFileIcon(file.type, file.name)}
                                {file.name} ({(file.size / 1024).toFixed(2)} KB)
                              </span>
                              <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="text-red-500 hover:text-red-700"
                              >
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
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Отправка...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Отправить ответ
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Таблица ответов - показываем только учителям */}
        {isTeacher && (
          <div className="mt-12">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <FileCheck className="w-6 h-6 text-main" />
                  Ответы учеников
                  {answers.length > 0 && (
                    <span className="ml-3 text-sm font-normal text-gray-500">
                      ({answers.length} {getAnswersCountText(answers.length)})
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Нажмите на файл для просмотра, используйте кнопки действий или нажмите на стрелку для перехода к ответу
                </p>
              </div>
              <button
                onClick={() => getTaskInfo(task.id)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Обновить
              </button>
            </div>

            {answers.length > 0 ? (
              <SearchTable
                searchProps={answerRecords}
                actions={answerActions}
                customRenderers={customRenderers}
                compactView={true}
                studentNameField="Ученик"
                gradeField="Оценка"
                onRowClick={(record) => navigateToAnswer(Number(record.id))}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <FileQuestion className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-gray-700 mb-2">Нет ответов</h4>
                <p className="text-gray-500">
                  Пока ни один ученик не отправил ответ на это задание
                </p>
              </div>
            )}
          </div>
        )}

        {/* Информация для ученика об уже отправленных ответах */}
        {!isTeacher && answers.some(a => a.user_id === user?.id) && (
          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-blue-500" />
              <div>
                <h3 className="text-lg font-semibold text-blue-900">Ваш ответ отправлен</h3>
                <p className="text-blue-700">
                  Вы уже отправили ответ на это задание.
                  {answers.find(a => a.user_id === user?.id)?.mark !== null && (
                    <span className="block mt-1">
                      Оценка: <strong>{answers.find(a => a.user_id === user?.id)?.mark}</strong>
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
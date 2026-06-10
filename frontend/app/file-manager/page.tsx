// app/viewer/page.tsx
'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/layouts/MainLayout';
import FileUploader from '@/components/files/FileUploader';
import FileViewer from '@/components/files/FileViewer';
import Loader from '@/components/loader/Loader';
import {
  CheckCircle,
  XCircle,
  Info,
  X,
  FileText,
  Upload,
  Archive,
  FolderOpen,
  Trash2,
  Download,
  Eye
} from 'lucide-react';
import { useAuth } from '@/context/authContext';

export default function ViewerPage() {
  const auth = useAuth();

  if(!auth) return null

  const { get, post, user } = auth;
  const [fileData, setFileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [alertMess, setAlertMess] = useState<{ content: any } | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'myfiles'>('upload');
  const [myFiles, setMyFiles] = useState<Array<{ id: number; name: string; original_name: string; created_at: string; size: number }>>([]);
  const [filesLoading, setFilesLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'myfiles') {
      loadMyFiles();
    }
  }, [activeTab]);

  const loadMyFiles = async () => {
    if (!get) return;
    setFilesLoading(true);
    try {
      const res = await get('/get-files');

      // Проверяем структуру ответа
      const filesData = res.data?.data || res.data || [];

      const records = (Array.isArray(filesData) ? filesData : [])
        .filter((item: any) => item.author_id === user?.id)
        .map((item: any) => ({
          id: item.id,
          name: item.original_name,
          original_name: item.original_name,
          created_at: item.created_at,
          size: item.size
        }));

      setMyFiles(records);
    } catch (error) {
      console.error('Ошибка загрузки файлов:', error);
      showAlert('Ошибка при загрузке списка файлов', true);
    } finally {
      setFilesLoading(false);
    }
  };

  const showAlert = (message: string, isError: boolean = false) => {
    const alertContent = (
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0 mt-0.5">
          {isError ? (
            <XCircle className="text-red-500" size={24} />
          ) : (
            <CheckCircle className="text-green-500" size={24} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm mb-1">
            {isError ? 'Ошибка' : 'Успешно'}
          </p>
          <p className="text-sm text-gray-600">{message}</p>
          <p className="text-xs text-gray-400 mt-2">
            {new Date().toLocaleString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
        <button
          onClick={() => setAlertMess(null)}
          className="flex-shrink-0 p-1 hover:bg-black/5 rounded transition-colors"
        >
          <X size={16} className="text-gray-400" />
        </button>
      </div>
    );
    setAlertMess({ content: alertContent });

    setTimeout(() => {
      setAlertMess(null);
    }, 5000);
  };

  const handleFileLoaded = (data: any) => {
    console.log('📄 File loaded:', data);
    setFileData(data);

    // Обновляем список файлов после загрузки
    if (activeTab === 'myfiles') {
      loadMyFiles();
    }

    if (data.from_archive) {
      showAlert(`Файл "${data.original_name}" извлечен из архива`);
    } else if (data.is_preview) {
      showAlert(`Предпросмотр: "${data.original_name}"`);
    } else {
      showAlert(`Файл "${data.original_name}" готов к просмотру`);
    }
  };

  const handleError = (error: string | null) => {
    showAlert(error || 'Неизвестная ошибка', true);
  };

  const handleClose = () => {
    setFileData(null);
    showAlert('Просмотр файла закрыт');
  };

  const handleViewFile = async (fileId: number) => {
    if (!get) return;
    setLoading(true);
    try {
      const res = await get(`/get-file/${fileId}`);
      const fileData = res.data?.data || res.data;

      const enrichedFile = {
        ...fileData,
        mime_type: fileData.mime_type || getMimeTypeByExtension(fileData.original_name),
        file_type: fileData.file_type || getFileTypeByMime(fileData.mime_type),
        url: fileData.url || fileData.serve_url,
        serve_url: fileData.serve_url || fileData.url,
      };

      setFileData(enrichedFile);
      showAlert(`Открыт файл: "${fileData.original_name}"`);
    } catch (error: any) {
      showAlert(error.message || 'Ошибка при открытии файла', true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (fileId: number, fileName: string) => {
    if (!confirm(`Удалить файл "${fileName}"?`)) return;

    if (!post) return;
    try {
      const res = await post(`/delete-file/${fileId}`, {});
      showAlert(`Файл "${fileName}" удален`);
      loadMyFiles(); // Обновляем список
    } catch (error: any) {
      showAlert(error.message || 'Ошибка при удалении файла', true);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleFileFromArchive = (file: any) => {
    console.log('📦 File from archive:', file);

    // Добавляем недостающие поля для корректного отображения
    const enrichedFile = {
      ...file,
      mime_type: file.mime_type || getMimeTypeByExtension(file.original_name),
      file_type: file.file_type || getFileTypeByMime(file.mime_type),
      url: file.blob ? URL.createObjectURL(file.blob) : file.url,
      serve_url: file.serve_url || (file.blob ? URL.createObjectURL(file.blob) : ''),
    };

    setFileData(enrichedFile);

    if (file.is_preview) {
      showAlert(`Предпросмотр файла из архива: "${file.original_name}"`);
    } else if (file.from_archive) {
      showAlert(`Файл извлечен из архива: "${file.original_name}"`);
    }
  };

  // Вспомогательные функции
  function getMimeTypeByExtension(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'ppt': 'application/vnd.ms-powerpoint',
      'txt': 'text/plain',
      'csv': 'text/csv',
      'json': 'application/json',
      'xml': 'application/xml',
      'zip': 'application/zip',
      'mp4': 'video/mp4',
      'mp3': 'audio/mpeg',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  function getFileTypeByMime(mimeType: string): string {
    if (!mimeType) return 'unknown';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.includes('text/') || mimeType.includes('json') || mimeType.includes('xml')) return 'text';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'excel';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'presentation';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return 'archive';
    return 'other';
  }

  if (loading || !user) {
    return (
      <Loader />
    );
  }

  return (
    <MainLayout alertMess={alertMess?.content}>
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          {/* Заголовок */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              {fileData?.from_archive ? (
                <Archive className="text-main" size={32} />
              ) : (
                <FileText className="text-main" size={32} />
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {fileData?.from_archive
                ? 'Файл из архива'
                : fileData?.is_preview
                  ? 'Предпросмотр'
                  : 'Просмотр файлов'
              }
            </h1>
            <p className="text-gray-500">
              {fileData?.from_archive
                ? `Извлеченный файл: ${fileData.original_name}`
                : fileData
                  ? fileData.original_name
                  : 'Загрузите файл или вставьте ссылку для просмотра'
              }
            </p>
          </div>

          {/* Вкладки */}
          {!fileData && (
            <div className="max-w-full mx-auto mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex gap-4">
                  <button
                    onClick={() => setActiveTab('upload')}
                    className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === 'upload'
                      ? 'text-main border-b-2 border-main'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    <Upload size={16} className="inline mr-2" />
                    Загрузить файлы
                  </button>
                  <button
                    onClick={() => setActiveTab('myfiles')}
                    className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === 'myfiles'
                      ? 'text-main border-b-2 border-main'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    <FolderOpen size={16} className="inline mr-2" />
                    Мои файлы
                    {myFiles.length > 0 && (
                      <span className="ml-1 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                        {myFiles.length}
                      </span>
                    )}
                  </button>
                </nav>
              </div>
            </div>
          )}

          {/* Контент */}
          {!fileData ? (
            <div className="max-w-full mx-auto">
              {activeTab === 'upload' ? (
                <>
                  <FileUploader
                    onFileLoaded={handleFileLoaded}
                    setLoading={setLoading}
                    setError={handleError}
                  />

                  {/* Информация о поддерживаемых форматах */}
                  <div className="mt-6 bg-white rounded-xl shadow-sm p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                      <Info size={16} />
                      <span>Поддерживаемые форматы:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['📄 DOCX', '📊 XLSX', '📽️ PPTX', '📝 TXT', '🖼️ JPG/PNG', '🎬 MP4', '📦 ZIP'].map((format) => (
                        <span key={format} className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                          {format}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-semibold text-gray-700">Мои загруженные файлы</h3>
                    <p className="text-xs text-gray-500 mt-1">Всего: {myFiles.length} файлов</p>
                  </div>

                  {filesLoading ? (
                    <Loader />
                  ) : myFiles.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      <FolderOpen size={48} className="mx-auto mb-3 opacity-50" />
                      <p>У вас пока нет загруженных файлов</p>
                      <button
                        onClick={() => setActiveTab('upload')}
                        className="mt-3 text-sm text-main hover:underline"
                      >
                        Загрузить первый файл
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {myFiles.map((file) => (
                        <div key={file.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText size={20} className="text-main flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 truncate" title={file.name}>
                                {file.name}
                              </p>
                              <div className="flex gap-3 text-xs text-gray-400 mt-1">
                                <span>{formatFileSize(file.size)}</span>
                                <span>•</span>
                                <span>{formatDate(file.created_at)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleViewFile(file.id)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Просмотреть"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteFile(file.id, file.name)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Удалить"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <FileViewer
              fileData={fileData}
              onClose={handleClose}
              onFileOpen={handleFileFromArchive}
            />
          )}

          {/* Пустое состояние */}
          {!fileData && !loading && activeTab === 'upload' && (
            <div className="text-center mt-12 text-gray-400">
              <Upload className="mx-auto mb-3 opacity-50" size={48} />
              <p className="text-sm">Загрузите первый файл, чтобы начать просмотр</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
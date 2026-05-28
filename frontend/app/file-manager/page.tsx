// app/viewer/page.tsx
'use client';

import { useState } from 'react';
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
  Archive
} from 'lucide-react';

export default function ViewerPage() {
  const [fileData, setFileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [alertMess, setAlertMess] = useState<{ content: any } | null>(null);

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
    
    if (data.from_archive) {
      showAlert(`Файл "${data.original_name}" извлечен из архива`);
    } else if (data.is_preview) {
      showAlert(`Предпросмотр: "${data.original_name}"`);
    } else {
      showAlert(`Файл "${data.original_name}" готов к просмотру`);
    }
  };

  const handleError = (error: string | null ) => {
    showAlert(error || 'Неизвестная ошибка', true);
  };

  const handleClose = () => {
    setFileData(null);
    showAlert('Просмотр файла закрыт');
  };

  // ✅ ОБРАБОТЧИК ФАЙЛОВ ИЗ АРХИВА
  const handleFileFromArchive = (file: any) => {
    console.log('📦 File from archive:', file);
    
    // Добавляем недостающие поля для корректного отображения
    const enrichedFile = {
      ...file,
      // Если нет mime_type, определяем по расширению
      mime_type: file.mime_type || getMimeTypeByExtension(file.original_name),
      // Если нет file_type, определяем по mime_type
      file_type: file.file_type || getFileTypeByMime(file.mime_type),
      // Для blob файлов создаем URL
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

  if (loading) {
    return (
      <MainLayout alertMess={alertMess?.content}>
        <Loader />
      </MainLayout>
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

          {/* Контент */}
          {!fileData ? (
            <div className="max-w-full mx-auto">
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
            </div>
          ) : (
            <FileViewer
              fileData={fileData}
              onClose={handleClose}
              onFileOpen={handleFileFromArchive} // ✅ Передаем обработчик
            />
          )}

          {/* Пустое состояние */}
          {!fileData && !loading && (
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
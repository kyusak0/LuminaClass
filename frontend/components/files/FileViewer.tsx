'use client';

import { useState, useEffect } from 'react';
import { X, Download, Maximize2, Minimize2 } from 'lucide-react';
import { NEXT_PUBLIC_API_URL } from '@/lib/axios.config';

const STORAGE_URL = `${NEXT_PUBLIC_API_URL}/storage/`;
const API_URL = `${NEXT_PUBLIC_API_URL}/api`;

interface FileViewerProps {
  file: any;
  onClose: () => void;
  onDownload?: (fileId: number, fileName: string) => void;
}

export default function FileViewer({ file, onClose, onDownload }: FileViewerProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Для файлов из архива - они приходят как Blob
  useEffect(() => {
    if (file.content && (file.file_type === 'text' || file.mime_type?.startsWith('text/'))) {
      // Если это текстовый файл из архива и он в виде Blob
      if (file.content instanceof Blob) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFileContent(e.target?.result as string);
        };
        reader.readAsText(file.content);
      } else if (typeof file.content === 'string') {
        setFileContent(file.content);
      }
    }
  }, [file]);

  const getFileUrl = (path: string) => {
    if (path.startsWith('blob:') || path.startsWith('data:')) {
      return path;
    }
    return `${STORAGE_URL}${path}`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('image')) return '🖼';
    if (mimeType?.includes('word') || mimeType?.includes('document')) return '📝';
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return '📊';
    if (mimeType?.includes('text')) return '📃';
    if (mimeType?.includes('zip')) return '📦';
    return '📎';
  };

  const downloadFile = async () => {
    if (onDownload && file.id) {
      onDownload(file.id, file.original_name);
    } else if (file.content instanceof Blob) {
      // Для файлов из архива
      const url = URL.createObjectURL(file.content);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const renderContent = () => {
    // Изображения
    if (file.file_type === 'image' || file.mime_type?.startsWith('image/')) {
      let imageUrl;
      if (file.content instanceof Blob) {
        imageUrl = URL.createObjectURL(file.content);
      } else {
        imageUrl = file.content || getFileUrl(file.path);
      }
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <img
            src={imageUrl}
            alt={file.original_name}
            className={`max-w-full max-h-[80vh] object-contain transition-transform duration-300 ${
              isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
            }`}
            onClick={() => setIsZoomed(!isZoomed)}
          />
        </div>
      );
    }
    
    // PDF
    if (file.file_type === 'pdf' || file.mime_type === 'application/pdf') {
      let pdfUrl;
      if (file.content instanceof Blob) {
        pdfUrl = URL.createObjectURL(file.content);
      } else {
        pdfUrl = file.content || getFileUrl(file.path);
      }
      return (
        <iframe
          src={pdfUrl}
          className="w-full h-[85vh] border-0 bg-white"
          title={file.original_name}
        />
      );
    }
    
    // Текстовые файлы
    if (file.file_type === 'text' || file.mime_type?.startsWith('text/')) {
      let textContent = fileContent;
      
      if (!textContent && file.content && typeof file.content === 'string') {
        textContent = file.content;
      }
      
      if (!textContent && file.path) {
        // Загружаем текстовый файл с сервера
        fetchTextContent();
        return (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-main mx-auto mb-4"></div>
              <p className="text-gray-600">Загрузка содержимого...</p>
            </div>
          </div>
        );
      }
      
      return (
        <div className="w-full max-w-6xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-600 font-medium">{file.original_name}</span>
            <div className="flex gap-2">
              <button
                onClick={downloadFile}
                className="text-gray-600 hover:text-main transition-colors flex items-center gap-1 text-sm"
              >
                <Download size={16} />
                Скачать
              </button>
            </div>
          </div>
          <div className="p-6 bg-gray-50 overflow-auto max-h-[70vh]">
            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 bg-white p-4 rounded-lg">
              {textContent}
            </pre>
          </div>
        </div>
      );
    }
    
    // Microsoft Office файлы (Word, Excel, PowerPoint) - используем Google Docs Viewer
    if (['word', 'excel', 'powerpoint'].includes(file.file_type) || 
        file.mime_type?.includes('word') || 
        file.mime_type?.includes('excel') || 
        file.mime_type?.includes('presentation')) {
      
      const fileUrl = file.content instanceof Blob 
        ? URL.createObjectURL(file.content)
        : file.content || getFileUrl(file.path);
      
      // Google Docs Viewer URL
      const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
      
      return (
        <div className="w-full h-full flex flex-col">
          <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-600 font-medium">{file.original_name}</span>
            <div className="flex gap-2">
              <button
                onClick={() => window.open(googleViewerUrl, '_blank')}
                className="text-gray-600 hover:text-main transition-colors flex items-center gap-1 text-sm"
              >
                <Maximize2 size={16} />
                Открыть в новой вкладке
              </button>
              <button
                onClick={downloadFile}
                className="text-gray-600 hover:text-main transition-colors flex items-center gap-1 text-sm"
              >
                <Download size={16} />
                Скачать
              </button>
            </div>
          </div>
          <iframe
            src={googleViewerUrl}
            className="w-full flex-1 border-0"
            title={file.original_name}
          />
        </div>
      );
    }
    
    // Другие типы
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-lg shadow-xl max-w-2xl mx-auto">
        <div className="text-8xl mb-6">
          {getFileIcon(file.mime_type || file.file_type || '')}
        </div>
        <h3 className="text-2xl font-semibold mb-3 text-gray-900">
          {file.original_name}
        </h3>
        <p className="text-gray-600 mb-6">
          Этот тип файла нельзя просмотреть в браузере
        </p>
        <button
          onClick={downloadFile}
          className="px-6 py-3 bg-main text-white rounded-lg hover:bg-main-dark transition-colors flex items-center gap-2"
        >
          <Download size={18} />
          Скачать файл
        </button>
      </div>
    );
  };

  const fetchTextContent = async () => {
    if (loading || !file.path) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/files/download/${file.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Ошибка загрузки файла');
      
      const text = await response.text();
      setFileContent(text);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="relative w-full h-full flex flex-col">
        {/* Кнопка закрытия */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white text-2xl z-10 hover:text-gray-300 transition-colors rounded-full w-10 h-10 flex items-center justify-center bg-black/50"
        >
          ✕
        </button>

        {/* Информация о файле */}
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg z-10">
          <div className="text-white text-sm font-medium max-w-md truncate">{file.original_name}</div>
        </div>

        {/* Контент файла */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
          {error ? (
            <div className="text-center text-white">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={downloadFile}
                className="px-6 py-2 bg-main text-white rounded-lg hover:bg-main-dark"
              >
                Скачать файл
              </button>
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </div>
    </div>
  );
}
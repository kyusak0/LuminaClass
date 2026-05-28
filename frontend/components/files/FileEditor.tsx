'use client';

import { useState, useEffect, useRef } from 'react';
import TextEditor from '@/components/editor/TextEditor';
import ExcelEditor from '@/components/editor/TableEditor';
import PowerPointEditor from '@/components/editor/PresentationEditor';
import { Save, X, Download, Loader2, AlertCircle, CheckCircle, FileText, FileSpreadsheet, Presentation, Image, File, ArrowDownToLine, FileDown, Menu } from 'lucide-react';
import { useAuth } from '@/context/authContext';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import * as XLSX from 'xlsx';
import { NEXT_PUBLIC_API_URL } from '@/lib/axios.config';

const STORAGE_URL = `${NEXT_PUBLIC_API_URL}/storage/`;

interface FileEditorProps {
  file: any;
  onSave: (fileId: number, content: any, isTemp?: boolean) => Promise<{ success: boolean; isTemp?: boolean }>;
  onClose: () => void;
  onSaveAsPermanent?: () => Promise<{ success: boolean }> | void;
  userId: number;
  onDiscard?: () => void;
}

interface AlertProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const CustomAlert = ({ message, type, onClose }: AlertProps) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: 'bg-green-50 border-green-500 text-green-800',
    error: 'bg-red-50 border-red-500 text-red-800',
    info: 'bg-blue-50 border-blue-500 text-blue-800'
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <FileText className="w-5 h-5 text-blue-500" />
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className={`${styles[type]} border-l-4 rounded-lg shadow-lg p-4 min-w-[280px] max-w-md`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">{icons[type]}</div>
          <div className="flex-1">
            <p className="text-sm font-medium">{message}</p>
            <p className="text-xs opacity-75 mt-1">
              {new Date().toLocaleTimeString('ru-RU')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 hover:opacity-70 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function FileEditor({
  file,
  onSave,
  onClose,
  userId,
  onSaveAsPermanent,
  onDiscard
}: FileEditorProps) {
  const auth = useAuth();
  if (!auth) return null;
  const { user, get, post } = auth;
  const [content, setContent] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlert({ message, type });
  };

  useEffect(() => {
    loadFileContent();

    return () => {
      if (imageUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [file.id]);

  const loadFileContent = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (file.content) {
        setContent(file.content);
        setIsLoading(false);
        return;
      }

      if (file.is_temp && file.content) {
        setContent(file.content);
        setIsLoading(false);
        return;
      }

      if (file.file_type === 'image') {
        if (file.content) {
          setImageUrl(file.content);
        } else if (file.path) {
          setImageUrl(`${STORAGE_URL}${file.path}`);
        }
        setIsLoading(false);
        return;
      }

      const response = await get(`/get-file-content/${file.id}`);

      if (response && response.success) {
        setContent(response.content);
      } else {
        initializeEmptyContent();
      }
    } catch (error) {
      console.error('Ошибка загрузки содержимого:', error);
      initializeEmptyContent();
    } finally {
      setIsLoading(false);
    }
  };

  const initializeEmptyContent = () => {
    if (file.file_type === 'excel') {
      setContent([['', '', ''], ['', '', ''], ['', '', '']]);
      showAlert('Создан новый пустой документ Excel', 'info');
    } else if (file.file_type === 'powerpoint') {
      setContent({
        slides: [{
          id: Date.now().toString(),
          elements: [{
            id: Date.now().toString() + '_text',
            type: 'text',
            content: file.original_name || 'Новая презентация',
            x: 100,
            y: 200,
            width: 760,
            height: 100,
            styles: {
              fontSize: 32,
              fontFamily: 'Arial',
              color: '#000000',
              textAlign: 'center',
              bold: true
            }
          }],
          background: '#ffffff'
        }]
      });
      showAlert('Создана новая пустая презентация', 'info');
    } else {
      setContent('<p>Начните редактировать ваш документ...</p>');
    }
  };

  const handleSave = async () => {
    if (file.file_type === 'image') {
      showAlert('Изображения сохраняются автоматически', 'info');
      return;
    }

    setIsSaving(true);
    try {
      let saveContent = content;

      if (file.file_type === 'powerpoint') {
        saveContent = { slides: content.slides || [] };
      }

      const result = await onSave(file.id, saveContent, file.is_temp);

      if (result && result.success) {
        showAlert('Файл успешно сохранён!', 'success');
        localStorage.setItem(`backup_${file.id}`, JSON.stringify(saveContent));
      } else {
        showAlert('Ошибка при сохранении файла', 'error');
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      showAlert('Произошла ошибка при сохранении файла', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadOriginal = async () => {
    try {
      // Получаем токен из localStorage
      const token = localStorage.getItem('token');

      const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/files/download/${file.id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/octet-stream'
            }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки файла');
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.original_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showAlert('Началась загрузка оригинального файла', 'info');
    } catch (error) {
      console.error('Ошибка скачивания:', error);
      showAlert('Ошибка при скачивании файла', 'error');
    }
  };

  const handleDownloadEdited = async () => {
    try {
      let blob: Blob;
      let fileName = file.original_name;

      if (file.file_type === 'word') {
        const doc = new Document({
          sections: [{
            properties: {},
            children: createParagraphsFromHtml(content || '<p>Пустой документ</p>')
          }]
        });

        const buffer = await Packer.toBlob(doc);
        blob = buffer;
        fileName = fileName.replace(/\.(docx?)$/, '_измененный.docx');
      }
      else if (file.file_type === 'excel') {
        const ws = XLSX.utils.aoa_to_sheet(content || []);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Лист1');
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        fileName = fileName.replace(/\.(xlsx?)$/, '_измененный.xlsx');
      }
      else if (file.file_type === 'powerpoint') {
        const pptData = JSON.stringify(content, null, 2);
        blob = new Blob([pptData], { type: 'application/json' });
        fileName = fileName.replace(/\.(pptx?)$/, '_измененный.json');
        showAlert('Презентация сохранена в формате JSON. Полная поддержка PPTX в разработке', 'info');
      }
      else if (file.file_type === 'text') {
        const textContent = stripHtml(content || '');
        blob = new Blob([textContent], { type: 'text/plain' });
        fileName = fileName.replace(/\.(txt)$/, '_измененный.txt');
      }
      else {
        // Для остальных типов используем API с авторизацией
        const token = localStorage.getItem('token');
        const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/files/download/${file.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/octet-stream'
          }
        });

        if (!response.ok) {
          throw new Error('Ошибка загрузки файла');
        }

        blob = await response.blob();
        return;
      }

      // Скачиваем blob
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showAlert(`Скачан изменённый файл: ${fileName}`, 'success');
    } catch (error) {
      console.error('Ошибка скачивания:', error);
      showAlert('Ошибка при создании файла для скачивания', 'error');
    }
  };

  const createParagraphsFromHtml = (html: string): Paragraph[] => {
    const paragraphs: Paragraph[] = [];
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) {
          paragraphs.push(new Paragraph({
            children: [new TextRun(text)]
          }));
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        if (element.tagName === 'P') {
          const text = element.textContent?.trim();
          if (text) {
            paragraphs.push(new Paragraph({
              children: [new TextRun(text)]
            }));
          }
        }
        element.childNodes.forEach(processNode);
      }
    };

    tempDiv.childNodes.forEach(processNode);

    if (paragraphs.length === 0) {
      paragraphs.push(new Paragraph({
        children: [new TextRun('Пустой документ')]
      }));
    }

    return paragraphs;
  };

  const stripHtml = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  const getFileIcon = () => {
    switch (file.file_type) {
      case 'word': return <FileText className="w-5 h-5" />;
      case 'excel': return <FileSpreadsheet className="w-5 h-5" />;
      case 'powerpoint': return <Presentation className="w-5 h-5" />;
      case 'image': return <Image className="w-5 h-5" />;
      default: return <File className="w-5 h-5" />;
    }
  };

  const renderEditor = () => {
    if (file.file_type === 'image') {
      let imageSrc = null;

      if (file.content?.startsWith('data:image')) {
        imageSrc = file.content;
      } else if (file.content?.startsWith('blob:')) {
        imageSrc = file.content;
      } else if (file.path) {
        imageSrc = `${STORAGE_URL}${file.path}`;
      }

      if (!imageSrc) {
        return (
          <div className="flex flex-col items-center justify-center h-full bg-gray-100">
            <div className="text-center text-gray-500">
              <Image className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Нет источника изображения</p>
              <p className="text-sm mt-2">Файл: {file.original_name}</p>
            </div>
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-100 p-8 overflow-auto">
          <div className="flex flex-col items-center gap-4 max-w-full max-h-full">
            <img
              src={imageSrc}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg"
              alt={file.original_name}
              onError={() => {
                showAlert('Не удалось загрузить изображение', 'error');
              }}
            />
            <div className="text-sm text-gray-500 bg-white p-3 rounded-lg shadow">
              <p><span className="font-medium">Файл:</span> {file.original_name}</p>
              <p><span className="font-medium">Размер:</span> {(file.size / 1024).toFixed(1)} КБ</p>
              {file.is_temp && <p className="text-blue-500 mt-1">📦 Извлечено из архива</p>}
            </div>
          </div>
        </div>
      );
    }

    if (file.file_type === 'powerpoint') {
      const pptContent = content || { slides: [] };
      return <PowerPointEditor initialData={pptContent} onChange={setContent} />;
    }

    if (file.file_type === 'excel') {
      return <ExcelEditor initialData={content || [[]]} onChange={setContent} />;
    }

    return <TextEditor initialContent={content || '<p>Начните печатать...</p>'} onChange={setContent} />;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="mt-4 text-gray-600">Загрузка содержимого файла...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-red-500 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
          <p className="text-lg font-semibold">Ошибка</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={loadFileContent}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {alert && (
        <CustomAlert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="flex flex-col h-full bg-white">
        {/* Заголовок с адаптивными кнопками */}
        <div ref={headerRef} className="border-b bg-gray-50 sticky top-0 z-10">
          {/* Основной заголовок для десктопа */}
          <div className="hidden lg:block p-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                {getFileIcon()}
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">{file.original_name}</h2>
                  <p className="text-sm text-gray-500">
                    Тип: {file.file_type === 'word' ? 'Документ' :
                      file.file_type === 'excel' ? 'Таблица' :
                        file.file_type === 'powerpoint' ? 'Презентация' :
                          file.file_type === 'image' ? 'Изображение' :
                            file.file_type === 'text' ? 'Текст' : 'Файл'} •
                    Размер: {(file.size / 1024).toFixed(1)} КБ
                    {file.is_temp && ' • ⚡ Временный файл'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadOriginal}
                  className="px-3 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2 transition-all text-sm"
                  title="Скачать оригинальный файл"
                >
                  <ArrowDownToLine size={16} />
                  <span className="hidden sm:inline">Оригинал</span>
                </button>
                {file.file_type !== 'image' && (
                  <button
                    onClick={handleDownloadEdited}
                    className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 transition-all text-sm"
                    title="Скачать изменённую версию"
                  >
                    <FileDown size={16} />
                    <span className="hidden sm:inline">Изменить</span>
                  </button>
                )}
                {file.file_type !== 'image' && (
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2 transition-all text-sm disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    <span className="hidden sm:inline">{isSaving ? 'Сохранение...' : 'Сохранить'}</span>
                  </button>
                )}
                {file.is_temp && onSaveAsPermanent && (
                  <button
                    onClick={async () => {
                      await onSaveAsPermanent();
                      showAlert('Временный файл сохранён как постоянный', 'success');
                    }}
                    className="px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2 transition-all text-sm"
                  >
                    <Save size={16} />
                    <span className="hidden sm:inline">Навсегда</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2 transition-all text-sm"
                >
                  <X size={16} />
                  <span className="hidden sm:inline">Закрыть</span>
                </button>
              </div>
            </div>
          </div>

          {/* Мобильный заголовок с выпадающим меню */}
          <div className="lg:hidden p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getFileIcon()}
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-gray-800 truncate">
                    {file.original_name}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)} • {file.file_type}
                    {file.is_temp && ' • Временный'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Menu size={20} />
              </button>
            </div>

            {/* Выпадающее меню для мобильных */}
            {isMobileMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-20 p-2 space-y-1">
                <button
                  onClick={() => {
                    handleDownloadOriginal();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 rounded-lg flex items-center gap-2"
                >
                  <ArrowDownToLine size={16} />
                  Скачать оригинал
                </button>
                {file.file_type !== 'image' && (
                  <button
                    onClick={() => {
                      handleDownloadEdited();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 rounded-lg flex items-center gap-2"
                  >
                    <FileDown size={16} />
                    Скачать изменённый
                  </button>
                )}
                {file.file_type !== 'image' && (
                  <button
                    onClick={() => {
                      handleSave();
                      setIsMobileMenuOpen(false);
                    }}
                    disabled={isSaving}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 rounded-lg flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {isSaving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                )}
                {file.is_temp && onSaveAsPermanent && (
                  <button
                    onClick={async () => {
                      await onSaveAsPermanent();
                      setIsMobileMenuOpen(false);
                      showAlert('Временный файл сохранён как постоянный', 'success');
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 rounded-lg flex items-center gap-2"
                  >
                    <Save size={16} />
                    Сохранить навсегда
                  </button>
                )}
                <button
                  onClick={() => {
                    onClose();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 rounded-lg flex items-center gap-2 text-red-600"
                >
                  <X size={16} />
                  Закрыть
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Редактор */}
        <div className="flex-1 overflow-hidden">
          {renderEditor()}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

// Вспомогательная функция форматирования размера
function formatFileSize(bytes: number): string {
  if (!bytes) return '0 Б';
  if (bytes < 1024) return bytes + ' Б';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
  return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
}
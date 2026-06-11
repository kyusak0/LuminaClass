'use client';

import { useEffect, useState } from 'react';
import axiosInstance from '@/lib/axios.config';
import { useAuth } from '@/context/authContext';
import ArchiveViewer from './ArchiveViewer';
import { WordViewer, ExcelViewer, PowerPointViewer } from './OfficeViewer';
import Loader from '../loader/Loader';
import { Download, Loader2, Eye, Info, ArrowLeft, Copy, Check, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface FileViewerProps {
  fileData: {
    id: number | string;
    original_name: string;
    mime_type: string;
    size: number;
    url?: string;
    serve_url?: string;
    file_type?: string;
    content?: any;
    blob?: Blob;
    is_temp?: boolean;
    is_preview?: boolean;
    from_archive?: boolean;
    archive_id?: number;
  };
  onClose: () => void;
  onFileOpen?: (file: any) => void;
}

export default function FileViewer({ fileData, onClose, onFileOpen }: FileViewerProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'info'>('preview');
  const [showArchive, setShowArchive] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [alertMess, setAlertMess] = useState<{ content: any } | null>(null);
  const [fileNameDialog, setFileNameDialog] = useState<{
    show: boolean;
    defaultName: string;
    onConfirm: (name: string) => void;
  } | null>(null);
  const auth = useAuth();

  if (!auth) return null;

  const { token, post } = auth;

  const showAlert = (message: string, isError: boolean = false) => {
    const alertContent = (
      <div className="p-3">
        <div className="flex items-center gap-2 font-semibold mb-2">
          {isError ? (
            <XCircle className="w-5 h-5 text-red-500" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-500" />
          )}
          <span>{isError ? 'Ошибка' : 'Успешно'}</span>
        </div>
        <div className="text-sm">{message}</div>
        <div className="text-xs text-gray-500 mt-2">
          {new Date().toLocaleString()}
        </div>
      </div>
    );
    setAlertMess({ content: alertContent });
    
    setTimeout(() => {
      setAlertMess(null);
    }, 5000);
  };

  const fileType = fileData.file_type || getFileType(fileData.mime_type, fileData.original_name);
  const isTempFile = fileData.is_temp || fileData.from_archive || fileData.is_preview;

  function getFileType(mimeType: string, fileName?: string): string {
    if (fileName) {
      const ext = fileName.split('.').pop()?.toLowerCase() || '';

      if (['txt', 'csv', 'json', 'xml', 'html', 'css', 'js', 'md', 'log'].includes(ext)) {
        return 'text';
      }
      if (ext === 'zip' || ext === 'rar') return 'archive';
      if (['doc', 'docx'].includes(ext)) return 'word';
      if (['xls', 'xlsx'].includes(ext)) return 'excel';
      if (['ppt', 'pptx'].includes(ext)) return 'presentation';
      if (['pdf'].includes(ext)) return 'pdf';
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
      if (['mp4', 'avi', 'mov'].includes(ext)) return 'video';
      if (['mp3', 'wav', 'ogg'].includes(ext)) return 'audio';
    }

    if (!mimeType) return 'other';

    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return 'archive';
    if (mimeType.startsWith('text/') ||
      mimeType.includes('json') ||
      mimeType.includes('xml') ||
      mimeType.includes('javascript') ||
      mimeType.includes('csv')) {
      return 'text';
    }
    if (mimeType.includes('word') || mimeType.includes('document')) return 'word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'excel';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'presentation';

    return 'other';
  }

  function formatSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  const getFileIcon = (type: string) => {
    const iconClass = "w-5 h-5";
    const icons: Record<string, React.ReactNode> = {
      image: <Eye className={`${iconClass} text-purple-500`} />,
      video: <Eye className={`${iconClass} text-blue-500`} />,
      audio: <Eye className={`${iconClass} text-green-500`} />,
      pdf: <Eye className={`${iconClass} text-red-500`} />,
      text: <Eye className={`${iconClass} text-gray-500`} />,
      excel: <Eye className={`${iconClass} text-green-600`} />,
      presentation: <Eye className={`${iconClass} text-orange-500`} />,
      word: <Eye className={`${iconClass} text-blue-600`} />,
      archive: <Eye className={`${iconClass} text-yellow-500`} />,
      other: <Eye className={`${iconClass} text-gray-400`} />,
    };
    return icons[type] || icons.other;
  };

  const downloadFile = async (customName?: string) => {
    if (downloading) return;

    const fileName = customName || fileData.original_name;

    setDownloading(true);
    try {
      let response;
      
      if (isTempFile && fileData.content) {
        if (fileData.content instanceof Blob) {
          response = fileData.content;
        } else if (typeof fileData.content === 'string' && fileData.content.startsWith('data:')) {
          const base64Response = await fetch(fileData.content);
          response = await base64Response.blob();
        } else {
          throw new Error('Не удалось скачать файл');
        }
      } else {
        const downloadId = typeof fileData.id === 'string' ? parseInt(fileData.id) : fileData.id;
        response = await post(`/files/download/${downloadId}`, {});
        
        if (response instanceof Blob) {
          response = response;
        } else {
          response = new Blob([response]);
        }
      }

      const url = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showAlert(`Файл "${fileName}" успешно скачан`);
    } catch (error) {
      console.error('Error downloading file:', error);
      showAlert('Ошибка при скачивании файла', true);
    } finally {
      setDownloading(false);
    }
  };

  const openFileNameDialog = () => {
    setFileNameDialog({
      show: true,
      defaultName: fileData.original_name,
      onConfirm: (name: string) => {
        downloadFile(name);
      },
    });
  };

  const serveUrl = fileData.content instanceof Blob
    ? URL.createObjectURL(fileData.content)
    : fileData.serve_url || `${process.env.NEXT_PUBLIC_API_URL}/api/files/serve/${fileData.id}`;

  // Если это архив - показываем ArchiveViewer
  if (fileType === 'archive' || fileData.mime_type?.includes('zip')) {
    if (showArchive) {
      return (
        <ArchiveViewer
          archive={fileData}
          onClose={() => {
            setShowArchive(false);
            onClose();
          }}
          onFileOpen={(file: any) => {
            setShowArchive(false);
            if (onFileOpen) {
              onFileOpen(file);
            }
          }}
          onFileExtracted={(newFile) => {
            console.log('File extracted:', newFile);
          }}
        />
      );
    }

    return (
      <>
        {alertMess?.content && (
          <div className="fixed top-4 right-4 z-50 max-w-sm animate-in slide-in-from-top-2">
            {alertMess.content}
          </div>
        )}
        {fileNameDialog?.show && (
          <FileNameDialog
            defaultName={fileNameDialog.defaultName}
            onConfirm={fileNameDialog.onConfirm}
            onCancel={() => setFileNameDialog(null)}
          />
        )}
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button onClick={onClose} className="text-gray-600 hover:text-gray-900 flex items-center gap-2">
                <ArrowLeft className="w-5 h-5" />
                Назад
              </button>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Eye className="w-6 h-6 text-yellow-500" />
                {fileData.original_name}
              </h2>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowArchive(true)}
                className="px-4 py-2 bg-main text-white rounded-lg hover:bg-main-hover transition-colors flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Открыть архив
              </button>
              <button
                onClick={openFileNameDialog}
                disabled={downloading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Скачивание...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Скачать
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="flex justify-center mb-4">
              <Eye className="w-24 h-24 text-yellow-500" />
            </div>
            <p className="text-xl text-gray-600 mb-2">{fileData.original_name}</p>
            <p className="text-gray-400 mb-6">Архив содержит несколько файлов</p>
            <button
              onClick={() => setShowArchive(true)}
              className="px-6 py-3 bg-main text-white rounded-lg hover:bg-main-hover transition-colors"
            >
              Просмотреть содержимое
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {alertMess?.content && (
        <div className="fixed top-4 right-4 z-50 max-w-sm animate-in slide-in-from-top-2">
          {alertMess.content}
        </div>
      )}
      {fileNameDialog?.show && (
        <FileNameDialog
          defaultName={fileNameDialog.defaultName}
          onConfirm={fileNameDialog.onConfirm}
          onCancel={() => setFileNameDialog(null)}
        />
      )}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between my-6 max-lg:flex-wrap gap-5">
          <div className="flex items-center space-x-4">
            <button onClick={onClose} className="text-gray-600 hover:text-gray-900 flex items-center gap-2">
              <ArrowLeft className="w-5 h-5" />
              Назад
            </button>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              {getFileIcon(fileType)} {fileData.original_name}
            </h2>
          </div>
          <div className="flex space-x-2 max-lg:flex-wrap gap-3">
            <button
              onClick={() => setViewMode('preview')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
                ${viewMode === 'preview'
                  ? 'bg-main text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              <Eye className="w-4 h-4" />
              Просмотр
            </button>
            <button
              onClick={() => setViewMode('info')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
                ${viewMode === 'info'
                  ? 'bg-main text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              <Info className="w-4 h-4" />
              Информация
            </button>
            <button
              onClick={openFileNameDialog}
              disabled={downloading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-medium flex items-center gap-2"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Скачивание...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Скачать
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {viewMode === 'preview' ? (
            <div className="p-8">
              <FilePreview
                fileData={fileData}
                fileType={fileType}
                serveUrl={serveUrl}
                token={token}
                isTempFile={isTempFile}
                showAlert={showAlert}
                onDownload={openFileNameDialog}
              />
            </div>
          ) : (
            <div className="p-8">
              <FileInfo 
                fileData={fileData} 
                formatSize={formatSize} 
                onDownload={openFileNameDialog}
                downloading={downloading}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Компонент диалога для ввода имени файла
function FileNameDialog({ defaultName, onConfirm, onCancel }: { defaultName: string; onConfirm: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState(defaultName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onConfirm(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Download className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Сохранение файла</h3>
            </div>
            <p className="text-gray-600 mb-4 text-sm">
              Введите имя для сохранения файла
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-main focus:border-transparent"
              autoFocus
            />
            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Сохранить
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Компонент предпросмотра
function FilePreview({ fileData, fileType, serveUrl, token, isTempFile, showAlert, onDownload }: any) {
  // Для временных файлов (из архива) используем content напрямую
  if (isTempFile && fileData.content) {
    // DOCX из архива - уже HTML
    if (fileType === 'word' && typeof fileData.content === 'string') {
      return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-sm">
          <div dangerouslySetInnerHTML={{ __html: fileData.content }} />
        </div>
      );
    }

    // Excel из архива - уже HTML
    if (fileType === 'excel' && typeof fileData.content === 'string') {
      return (
        <div className="excel-viewer bg-white rounded-lg shadow-sm overflow-auto max-h-[600px]">
          <div dangerouslySetInnerHTML={{ __html: fileData.content }} />
        </div>
      );
    }

    // PowerPoint из архива - уже HTML
    if (fileType === 'presentation') {
      return (
        <div className="powerpoint-viewer">
          <div dangerouslySetInnerHTML={{ __html: fileData.content }} />
        </div>
      );
    }

    // Текст из архива
    if (fileType === 'text' && typeof fileData.content === 'string') {
      return (
        <div className="w-full max-h-[600px] overflow-auto bg-gray-900 text-green-400 p-6 rounded-lg">
          <pre className="font-mono text-sm whitespace-pre-wrap">
            <code>{fileData.content}</code>
          </pre>
        </div>
      );
    }

    // Изображение из архива (base64)
    if (fileType === 'image' && typeof fileData.content === 'string') {
      return (
        <img
          src={fileData.content}
          alt={fileData.original_name}
          className="max-w-full max-h-[600px] object-contain rounded-lg shadow-md"
        />
      );
    }

    // PDF из архива
    if (fileType === 'pdf' && typeof fileData.content === 'string') {
      return (
        <iframe src={fileData.content} className="w-full h-[800px] rounded-lg shadow-md" />
      );
    }
  }

  // Для обычных файлов - используем стандартную логику
  if (fileType === 'image') {
    return <AuthenticatedImage src={serveUrl} alt={fileData.original_name} token={token} />;
  }

  if (fileType === 'pdf') {
    return <iframe src={serveUrl} className="w-full h-[800px] rounded-lg shadow-md" />;
  }

  if (fileType === 'text') {
    return <TextPreview serveUrl={serveUrl} token={token} showAlert={showAlert} />;
  }

  // Для офисных файлов - если это не временный файл, используем API
  if (fileType === 'word') {
    if (isTempFile && fileData.content) {
      return <WordViewer content={fileData.content} isTemp={true} />;
    }
    if (isTempFile && fileData.blob) {
      return <WordViewer fileBlob={fileData.blob} isTemp={true} />;
    }
    return <WordViewer fileId={fileData.id} token={token} />;
  }

  if (fileType === 'excel') {
    if (isTempFile && fileData.content) {
      return <ExcelViewer content={fileData.content} isTemp={true} />;
    }
    if (isTempFile && fileData.blob) {
      return <ExcelViewer fileBlob={fileData.blob} isTemp={true} />;
    }
    return <ExcelViewer fileId={fileData.id} token={token} />;
  }

  if (fileType === 'presentation') {
    if (isTempFile && fileData.content) {
      return <PowerPointViewer content={fileData.content} isTemp={true} />;
    }
    if (isTempFile && fileData.blob) {
      return <PowerPointViewer fileBlob={fileData.blob} isTemp={true} />;
    }
    if (fileData.id && !isTempFile) {
      return <PowerPointViewer fileId={fileData.id} token={token} />;
    }
  }

  if (fileType === 'video') {
    return (
      <video controls className="max-w-full max-h-[600px] rounded-lg shadow-md">
        <source src={serveUrl} type={fileData.mime_type} />
      </video>
    );
  }

  if (fileType === 'audio') {
    return (
      <audio controls className="w-full max-w-2xl">
        <source src={serveUrl} type={fileData.mime_type} />
      </audio>
    );
  }

  return (
    <OtherFilePreview fileData={fileData} serveUrl={serveUrl} token={token} showAlert={showAlert} onDownload={onDownload} />
  );
}

function OtherFilePreview({ fileData, serveUrl, token, showAlert, onDownload }: any) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isText, setIsText] = useState(false);
  const { post } = useAuth() || {};

  useEffect(() => {
    const checkFile = async () => {
      try {
        const response = await fetch(serveUrl, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        const text = await response.text();

        if (text.length > 0 && text.length < 1000000) {
          const isBinary = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text.substring(0, 1000));

          if (!isBinary) {
            setTextContent(text);
            setIsText(true);
            setLoading(false);
            return;
          }
        }

        setIsText(false);
        setLoading(false);
      } catch (err) {
        console.error('Error checking file:', err);
        setIsText(false);
        setLoading(false);
      }
    };

    checkFile();
  }, [serveUrl, token]);

  if (loading) {
    return <Loader />
  }

  if (isText && textContent) {
    return (
      <pre className="w-full max-h-[600px] overflow-auto bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm">
        <code>{textContent}</code>
      </pre>
    );
  }

  return (
    <div className="flex flex-col items-center py-12">
      <div className="flex justify-center mb-4">
        <Eye className="w-20 h-20 text-gray-300" />
      </div>
      <p className="text-xl text-gray-600 mb-2">{fileData.original_name}</p>
      <p className="text-gray-400 mb-4">Предпросмотр недоступен для этого типа файла</p>
      <button
        onClick={onDownload}
        className="px-6 py-3 bg-main text-white rounded-lg hover:bg-main-hover transition-colors flex items-center gap-2"
      >
        <Download className="w-5 h-5" />
        Скачать файл
      </button>
    </div>
  );
}

function AuthenticatedImage({ src, alt, token }: { src: string; alt: string; token?: string }) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      try {
        if (src.startsWith('blob:') || src.startsWith('data:')) {
          setImageSrc(src);
          setLoading(false);
          return;
        }

        const response = await fetch(src, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error('Failed to load image');

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setImageSrc(objectUrl);
        setLoading(false);

        return () => URL.revokeObjectURL(objectUrl);
      } catch (err) {
        console.error('Error loading image:', err);
        setError(true);
        setLoading(false);
      }
    };

    loadImage();
  }, [src, token]);

  if (loading) return <Loader />;
  if (error) return <div className="text-center text-gray-400 py-12">Ошибка загрузки изображения</div>;

  return <img src={imageSrc} alt={alt} className="max-w-full max-h-[600px] object-contain rounded-lg shadow-md" />;
}

function FileInfo({ fileData, formatSize, onDownload, downloading }: any) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center mb-8">
        <Eye className="w-20 h-20 text-main" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-500">Имя файла</label>
            <p className="text-lg font-medium text-gray-900">{fileData.original_name}</p>
          </div>

          <div>
            <label className="text-sm text-gray-500">Тип файла</label>
            <p className="text-lg font-medium text-gray-900">{fileData.mime_type}</p>
          </div>

          <div>
            <label className="text-sm text-gray-500">Размер</label>
            <p className="text-lg font-medium text-gray-900">{formatSize(fileData.size)}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-500">ID файла</label>
            <p className="text-lg font-medium text-gray-900">{fileData.id}</p>
          </div>

          <div>
            <label className="text-sm text-gray-500">Действия</label>
            <button
              onClick={onDownload}
              disabled={downloading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Скачивание...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Скачать файл
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TextPreview({ serveUrl, token, showAlert }: { serveUrl: string; token?: string; showAlert?: (msg: string, isError?: boolean) => void }) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadText = async () => {
      try {
        const response = await fetch(serveUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/plain, */*',
          },
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const text = await response.text();
        setContent(text);
        setLoading(false);
      } catch (err: any) {
        try {
          const axiosResponse = await axiosInstance.get(serveUrl, {
            headers: { 'Authorization': `Bearer ${token}` },
            responseType: 'text',
          });
          setContent(axiosResponse.data);
          setLoading(false);
        } catch (axiosErr) {
          setError('Не удалось загрузить содержимое файла');
          if (showAlert) {
            showAlert('Не удалось загрузить содержимое файла', true);
          }
          setLoading(false);
        }
      }
    };

    loadText();
  }, [serveUrl, token, showAlert]);

  if (loading) return (
    <div className="h-full w-full flex flex-col items-center justify-center">
      <div className="text-lg text-gray-500">Загрузка данных...</div>
      <div className="mt-4 w-16 h-16 border-4 border-main border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  if (error) return <div className="text-center py-12 text-red-500">{error}</div>;

  return (
    <div className="w-full max-h-[600px] overflow-auto bg-gray-900 text-green-400 p-6 rounded-lg">
      <pre className="font-mono text-sm whitespace-pre-wrap">
        <code>{content}</code>
      </pre>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import axiosInstance from '@/lib/axios.config';
import { useAuth } from '@/context/authContext';
import ArchiveViewer from './ArchiveViewer';
import { WordViewer, ExcelViewer, PowerPointViewer } from './OfficeViewer';
import Loader from '../loader/Loader';
import { Download } from 'lucide-react';

interface FileViewerProps {
  fileData: {
    id: number | string;
    original_name: string;
    mime_type: string;
    size: number;
    url?: string;
    serve_url?: string;
    file_type?: string;
    content?: any; // Для файлов из архива
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
  const auth = useAuth();

  if (!auth) return null;

  const { token } = auth;

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

  function getFileIcon(type: string): string {
    const icons: Record<string, string> = {
      image: '🖼️',
      video: '🎬',
      audio: '🎵',
      pdf: '📄',
      text: '📝',
      excel: '📊',
      presentation: '📽️',
      word: '📃',
      archive: '📦',
      other: '📎',
    };
    return icons[type] || icons.other;
  }

  const serveUrl = fileData.content instanceof Blob
    ? URL.createObjectURL(fileData.content)
    : fileData.serve_url || `${process.env.NEXT_PUBLIC_API_URL}/api/files/serve/${fileData.id}`;

  const downloadUrl = fileData.url ||
    `${process.env.NEXT_PUBLIC_API_URL}/api/files/download/${fileData.id}`;

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
            } else {
              console.log('Файл из архива:', file);
            }
          }}
          onFileExtracted={(newFile) => {
            console.log('File extracted:', newFile);
          }}
        />
      );
    }

    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
              ← Назад
            </button>
            <h2 className="text-xl font-semibold">
              📦 {fileData.original_name}
            </h2>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowArchive(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Открыть архив
            </button>
            <a
              href={downloadUrl}
              download={fileData.original_name}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Скачать
            </a>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="text-8xl mb-4">📦</div>
          <p className="text-xl text-gray-600 mb-2">{fileData.original_name}</p>
          <p className="text-gray-400 mb-6">Архив содержит несколько файлов</p>
          <button
            onClick={() => setShowArchive(true)}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Просмотреть содержимое
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between my-6 max-lg:flex-wrap gap-5">
        <div className="flex items-center space-x-4">
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
            ← Назад
          </button>
          <h2 className="text-xl font-semibold">
            {getFileIcon(fileType)} {fileData.original_name}
          </h2>
        </div>
        <div className="flex space-x-2 max-lg:flex-wrap gap-5">
          <button
            onClick={() => setViewMode('preview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${viewMode === 'preview'
                ? 'bg-main text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            Просмотр
          </button>
          <button
            onClick={() => setViewMode('info')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${viewMode === 'info'
                ? 'bg-main text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            Информация
          </button>
          <a
            href={downloadUrl}
            download={fileData.original_name}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            Скачать
          </a>
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
            />
          </div>
        ) : (
          <div className="p-8">
            <FileInfo fileData={fileData} formatSize={formatSize} downloadUrl={downloadUrl} />
          </div>
        )}
      </div>
    </div>
  );
}

// Компонент предпросмотра
function FilePreview({ fileData, fileType, serveUrl, token, isTempFile }: any) {
  console.log('🖼️ FilePreview:', { fileType, serveUrl, fileData, isTempFile });

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
    return <TextPreview serveUrl={serveUrl} token={token} />;
  }

  // Для офисных файлов - если это не временный файл, используем API
  if (fileType === 'word') {
    if (isTempFile && fileData.content) {
      // Для файлов из архива передаем готовый HTML
      return <WordViewer content={fileData.content} isTemp={true} />;
    }
    if (isTempFile && fileData.blob) {
      // Для файлов из архива с blob
      return <WordViewer fileBlob={fileData.blob} isTemp={true} />;
    }
    // Для обычных файлов
    return <WordViewer fileId={fileData.id} token={token} />;
  }

  // Для Excel файлов:
  if (fileType === 'excel') {
    if (isTempFile && fileData.content) {
      return <ExcelViewer content={fileData.content} isTemp={true} />;
    }
    if (isTempFile && fileData.blob) {
      return <ExcelViewer fileBlob={fileData.blob} isTemp={true} />;
    }
    return <ExcelViewer fileId={fileData.id} token={token} />;
  }

  // Для презентаций:
  if (fileType === 'presentation') {
    console.log('🎬 Rendering presentation:', {
      isTempFile,
      hasContent: !!fileData.content,
      hasBlob: !!fileData.blob,
      fileId: fileData.id,
      contentType: typeof fileData.content
    });

    if (isTempFile && fileData.content) {
      console.log('📄 Using content for presentation');
      return <PowerPointViewer content={fileData.content} isTemp={true} />;
    }
    if (isTempFile && fileData.blob) {
      console.log('📦 Using blob for presentation, size:', fileData.blob.size);
      return <PowerPointViewer fileBlob={fileData.blob} isTemp={true} />;
    }
    if (fileData.id && !isTempFile) {
      console.log('🌐 Using fileId for presentation:', fileData.id);
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

  // Для остальных - пробуем текстовый просмотр
  return (
    <OtherFilePreview fileData={fileData} serveUrl={serveUrl} token={token} />
  );
}

function OtherFilePreview({ fileData, serveUrl, token }: any) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isText, setIsText] = useState(false);

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
      <div className="text-6xl mb-4">📄</div>
      <p className="text-xl text-gray-600 mb-2">{fileData.original_name}</p>
      <p className="text-gray-400 mb-4">Предпросмотр недоступен для этого типа файла</p>
      <button
        onClick={() => downloadFile(serveUrl, fileData.original_name, token)}
        className="px-6 py-3 bg-main flex gap-5 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        <Download />
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

function FileInfo({ fileData, formatSize, downloadUrl }: any) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center text-8xl mb-8">📄</div>

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
            <label className="text-sm text-gray-500">Ссылка для скачивания</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={downloadUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={() => copyToClipboard(downloadUrl)}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                {copied ? '✓' : 'Копировать'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

async function downloadFile(url: string, fileName: string, token?: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Error downloading file:', error);
  }
}

function TextPreview({ serveUrl, token }: { serveUrl: string; token?: string }) {
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
          setLoading(false);
        }
      }
    };

    loadText();
  }, [serveUrl, token]);

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
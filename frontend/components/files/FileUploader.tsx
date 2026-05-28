// components/FileUploader.tsx
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axiosInstance from '@/lib/axios.config';
import { useAuth } from '@/context/authContext';
import { FileIcon } from 'lucide-react';

interface FileUploaderProps {
  onFileLoaded: (data: any) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export default function FileUploader({ onFileLoaded, setLoading, setError }: FileUploaderProps) {
  const [urlInput, setUrlInput] = useState('');
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file');
  const auth = useAuth();

  if (!auth) return null;
  const { user, token } = auth;

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('author_id', user.id);

    try {
      const response = await axiosInstance.post(
        `/save-file`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Проверяем структуру ответа
      if (response.data.success && response.data.file) {
        onFileLoaded(response.data.file);
      } else {
        setError('Некорректный ответ от сервера');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Ошибка загрузки файла';
      setError(errorMessage);
      console.error('Upload error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, token, onFileLoaded, setLoading, setError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: 50000000, // 50MB
  });

  return (
    <div className="max-w-full mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        {/* Табы */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('file')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'file'
                ? 'text-main border-b-2 border-main'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Загрузить файл
          </button>
        </div>

        {/* Загрузка файла */}
        {activeTab === 'file' && (
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
              transition-colors duration-200
              ${isDragActive 
                ? 'border-main bg-blue-50' 
                : 'border-gray-300 hover:border-blue-400'
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="flex justify-center mb-4"><FileIcon size={42}/></div>
            {isDragActive ? (
              <p className="text-lg text-main">Отпустите файл здесь...</p>
            ) : (
              <>
                <p className="text-lg text-gray-600 mb-2">
                  Перетащите файл сюда или кликните для выбора
                </p>
                <p className="text-sm text-gray-400">
                  Поддерживаются: JPG, PNG, GIF, PDF, MP4, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, ZIP
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
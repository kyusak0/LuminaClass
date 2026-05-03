'use client';

import { useState } from 'react';
import { useAuth } from '@/context/authContext';
import { Upload, Loader2 } from 'lucide-react';
import mammoth from 'mammoth';

interface FileUploaderProps {
  onUpload: (newFile?: any) => void;
  userId: number;
}

export default function FileUploader({ onUpload, userId }: FileUploaderProps) {
  const auth = useAuth()
  if (!auth) return
  const { user, get, post } = auth;
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const readFileContent = (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const extension = file.name.split('.').pop()?.toLowerCase();

      if (extension === 'txt') {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            type: 'text',
            content: `<p>${(e.target?.result as string).replace(/\n/g, '<br/>')}</p>`
          });
        };
        reader.onerror = reject;
        reader.readAsText(file);
      }
      else if (extension === 'docx') {
        // Используем mammoth для парсинга DOCX
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const result = await mammoth.convertToHtml({ arrayBuffer });
            resolve({
              type: 'word',
              content: result.value
            });
          } catch (error) {
            console.error('DOCX parsing error:', error);
            resolve({
              type: 'word',
              content: `<p>${file.name}</p><p>Нажмите для редактирования...</p>`
            });
          }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      }
      else if (extension === 'doc') {
        resolve({
          type: 'word',
          content: `<p>${file.name}</p><p>Нажмите для редактирования...</p>`
        });
      }
      else if (extension === 'pptx' || extension === 'ppt') {
        resolve({
          type: 'powerpoint',
          content: {
            slides: [{
              id: Date.now().toString(),
              elements: [{
                id: Date.now().toString() + '_text',
                type: 'text',
                content: file.name.replace(/\.[^/.]+$/, ''),
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
          }
        });
      }
      else if (extension === 'xlsx' || extension === 'xls') {
        resolve({
          type: 'excel',
          content: [['', '', ''], ['', '', ''], ['', '', '']]
        });
      }
      else {
        resolve({ type: 'unknown', content: null });
      }
    });
  };

  const handleUpload = async (files: FileList) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    const uploadedFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('author_id', user?.id.toString());

      try {
        console.log('Uploading file:', file.name);

        const result = await post('/save-file', formData);

        console.log('Upload result:', result);

        if (result && (result.success || result.file_id)) {
          const fileId = result.file_id || result.file?.id;
          uploadedFiles.push(result.file || { id: fileId, original_name: file.name });

          // Читаем и сохраняем содержимое
          const fileContent = await readFileContent(file);
          if (fileContent.content) {
            await post('/save-file-content', {
              file_id: fileId,
              content: fileContent.content
            });
          }

          setUploadProgress(((i + 1) / files.length) * 100);
        } else {
          console.error('Upload failed:', result);
          setUploadError(`Ошибка загрузки ${file.name}`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        setUploadError(`Ошибка загрузки ${file.name}`);
      }
    }

    setIsUploading(false);

    // Вызываем onUpload с загруженными файлами
    if (uploadedFiles.length > 0) {
      onUpload(uploadedFiles);
    } else {
      onUpload(); // Просто обновляем список
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) {
      handleUpload(e.dataTransfer.files);
    }
  };

  return (
    <div className="p-4 border-b">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="space-y-2">
            <Loader2 className="mx-auto animate-spin text-blue-500" size={32} />
            <p className="text-sm text-gray-600">Загрузка...</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <Upload className="mx-auto mb-2 text-gray-400" size={32} />
            <p className="text-sm text-gray-600 mb-2">
              Нажмите или перетащите файлы для загрузки
            </p>
            {uploadError && (
              <p className="text-sm text-red-500 mb-2">{uploadError}</p>
            )}
            <input
              type="file"
              id="file-upload"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleUpload(e.target.files)}
              accept=".txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
            />
            <label
              htmlFor="file-upload"
              className="inline-block px-4 py-2 bg-bg text-main rounded hover:bg-main hover:text-white border-2 border-main cursor-pointer text-sm transition-colors"
            >
              Выбрать файлы
            </label>
            <p className="text-xs text-gray-400 mt-2">
              Поддерживаемые типы:JPG, PNG, GIF, BMP, TXT, DOC, DOCX, XLS, XLSX, PPT, PPTX, ZIP, RAR
            </p>
          </>
        )}
      </div>
    </div>
  );
}
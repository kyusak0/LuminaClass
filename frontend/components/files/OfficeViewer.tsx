'use client';

import { useState, useEffect, useRef } from 'react';
import axiosInstance from '@/lib/axios.config';
import Loader from '../loader/Loader';
import { pptxToHtml } from '@jvmr/pptx-to-html';

interface WordViewerProps {
  fileId?: number;
  token?: string;
  fileBlob?: Blob;
  isTemp?: boolean;
  content?: string; // HTML контент из архива
}

export function WordViewer({ fileId, token, fileBlob, isTemp, content: initialContent }: WordViewerProps) {
  const [content, setContent] = useState<string>(initialContent || '');
  const [loading, setLoading] = useState(!initialContent);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialContent) {
      setContent(initialContent);
      setLoading(false);
      return;
    }

    if (!isTemp && fileId) {
      loadContent();
    } else if (isTemp && fileBlob) {
      loadFromBlob();
    }
  }, [fileId, fileBlob, isTemp, initialContent]);

  const loadFromBlob = async () => {
    setLoading(true);
    try {
      // Для DOCX из архива используем mammoth
      const mammoth = await import('mammoth');
      const arrayBuffer = await fileBlob!.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setContent(result.value);
    } catch (err) {
      console.error('Error loading DOCX from blob:', err);
      setError('Ошибка загрузки документа из архива');
    } finally {
      setLoading(false);
    }
  };

  const loadContent = async () => {
    if (!fileId) return;
    try {
      const response = await axiosInstance.get(`/get-office-content/${fileId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        setContent(response.data.content);
      } else {
        setError(response.data.message);
      }
    } catch (err: any) {
      setError('Ошибка загрузки документа');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-sm overflow-auto max-h-[600px]">
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}

interface ExcelViewerProps {
  fileId?: number;
  token?: string;
  fileBlob?: Blob;
  isTemp?: boolean;
  content?: string; // HTML контент из архива
}

export function ExcelViewer({ fileId, token, fileBlob, isTemp, content: initialContent }: ExcelViewerProps) {
  const [content, setContent] = useState<string>(initialContent || '');
  const [loading, setLoading] = useState(!initialContent);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialContent) {
      setContent(initialContent);
      setLoading(false);
      return;
    }

    if (!isTemp && fileId) {
      loadContent();
    } else if (isTemp && fileBlob) {
      loadFromBlob();
    }
  }, [fileId, fileBlob, isTemp, initialContent]);

  const loadFromBlob = async () => {
    setLoading(true);
    try {
      // Для XLSX из архива используем SheetJS
      const XLSX = await import('xlsx');
      const arrayBuffer = await fileBlob!.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const htmlContent = XLSX.utils.sheet_to_html(firstSheet);
      setContent(htmlContent);
    } catch (err) {
      console.error('Error loading XLSX from blob:', err);
      setError('Ошибка загрузки таблицы из архива');
    } finally {
      setLoading(false);
    }
  };

  const loadContent = async () => {
    if (!fileId) return;
    try {
      const response = await axiosInstance.get(`/get-office-content/${fileId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        setContent(response.data.content);
      } else {
        setError(response.data.message);
      }
    } catch (err: any) {
      setError('Ошибка загрузки таблицы');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;

  return (
    <div className="excel-viewer bg-white rounded-lg shadow-sm overflow-auto max-h-[600px]">
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}

interface PowerPointViewerProps {
  fileId?: number;
  token?: string;
  fileBlob?: Blob;
  isTemp?: boolean;
  content?: string; // HTML контент из архива (уже сконвертированные слайды)
}

export function PowerPointViewer({ fileId, token, fileBlob, isTemp }: any) {
  const [slidesHtml, setSlidesHtml] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAndConvert = async () => {
      setLoading(true);
      setError('');
      try {
        let arrayBuffer: ArrayBuffer;

        if (isTemp && fileBlob) {
          arrayBuffer = await fileBlob.arrayBuffer();
        } else if (fileId && token) {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/files/download/${fileId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!response.ok) throw new Error('Не удалось загрузить файл');
          arrayBuffer = await response.arrayBuffer();
        } else {
          throw new Error('Нет данных для загрузки');
        }

        const htmlSlides = await pptxToHtml(arrayBuffer, {
          width: 960,
          height: 540,
          scaleToFit: false,  // ← Меняем на false! Не масштабировать, а растягивать
          letterbox: false,   // ← Отключаем черные полосы
        });

        setSlidesHtml(htmlSlides);
      } catch (err: any) {
        console.error('Error converting PPTX:', err);
        setError(`Ошибка конвертации: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadAndConvert();
  }, [fileId, fileBlob, isTemp, token]);

  if (loading) return <Loader />;
  if (error) return <div className="text-red-500 text-center p-8">{error}</div>;
  if (!slidesHtml.length) return <div className="text-center p-8">В презентации нет слайдов</div>;

  return (
    <div className="flex flex-col items-center w-full">
      {slidesHtml.map((slide, index) => (
        <div 
          key={index} 
          className="mb-8 w-full bg-white shadow-lg rounded-lg overflow-auto"  // ← overflow-auto вместо overflow-hidden
        >
          <div 
            dangerouslySetInnerHTML={{ __html: slide }} 
            style={{ height: 'auto' }}  // ← Автоматическая высота
          />
        </div>
      ))}
      <div className="text-sm text-gray-500 mt-4">
        Всего слайдов: {slidesHtml.length}
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center">
      <div className="text-lg text-gray-500">Загрузка данных...</div>
      <div className="mt-4 w-16 h-16 border-4 border-main border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-red-500">
      <p>{message}</p>
    </div>
  );
}
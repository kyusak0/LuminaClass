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
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-sm max-h-[600px]">
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
  content?: string;
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

        // 1. Получаем файл как ArrayBuffer (из Blob или с сервера)
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

        // 2. Конвертируем презентацию в HTML
        //    Библиотека возвращает массив строк, где каждая строка — это HTML одного слайда
        const htmlSlides = await pptxToHtml(arrayBuffer, {
          width: 960,        // Ширина области просмотра
          height: 540,       // Высота области просмотра
          scaleToFit: true,  // Масштабировать слайд под контейнер
          letterbox: true,   // Сохранять пропорции (добавлять черные полосы при необходимости)
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
      {/* Здесь будут все слайды вашей презентации один за другим */}
      {slidesHtml.map((slide, index) => (
        <div key={index} className="mb-8 w-full shadow-lg rounded-lg overflow-hidden">
          {/* ВАЖНО: dangerouslySetInnerHTML вставляет HTML-код слайда */}
          <div dangerouslySetInnerHTML={{ __html: slide }} />
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
    <Loader />
  );
}

function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-red-500">
      <p>{message}</p>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import axiosInstance from '@/lib/axios.config';

// Word Viewer
export function WordViewer({ fileId, token }: { fileId: number; token?: string }) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadContent();
  }, [fileId]);

  const loadContent = async () => {
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
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-sm">
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}

// Excel Viewer
export function ExcelViewer({ fileId, token }: { fileId: number; token?: string }) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadContent();
  }, [fileId]);

  const loadContent = async () => {
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

// PowerPoint Viewer
export function PowerPointViewer({ fileId, token }: { fileId: number; token?: string }) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadContent();
  }, [fileId]);

  const loadContent = async () => {
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
      setError('Ошибка загрузки презентации');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;

  return (
    <div className="powerpoint-viewer">
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
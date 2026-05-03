// components/archive/Archivator.tsx

import JSZip from 'jszip';
import { useState } from 'react';
import { OfficeFile } from '@/types/office';

export type FileToBlobConverter = (file: OfficeFile) => Promise<Blob>;

interface ZipCreatorProps {
  files: OfficeFile[];
  fileToBlob: FileToBlobConverter; // Передаем функцию как пропс
  onZipCreated?: (blob: Blob, fileName: string) => void;
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
  children?: (props: {
    createZip: () => Promise<Blob | null>;
    isLoading: boolean;
    progress: number;
  }) => React.ReactNode;
}

export function ZipCreator({ 
  files, 
  fileToBlob, // Принимаем функцию из пропсов
  onZipCreated, 
  onProgress, 
  onError,
  children 
}: ZipCreatorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const createZip = async (): Promise<Blob | null> => {
    if (files.length === 0) {
      onError?.('Нет файлов для архивации');
      return null;
    }

    setIsLoading(true);
    setProgress(0);
    
    const zip = new JSZip();
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileBlob = await fileToBlob(file); // Используем переданную функцию
        zip.file(file.name, fileBlob);
        
        const currentProgress = ((i + 1) / files.length) * 100;
        setProgress(currentProgress);
        onProgress?.(currentProgress);
      }
      
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      const zipFileName = `files_${Date.now()}.zip`;
      onZipCreated?.(zipBlob, zipFileName);
      
      return zipBlob;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка создания ZIP архива';
      onError?.(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  if (children) {
    return <>{children({ createZip, isLoading, progress })}</>;
  }

  return null;
}
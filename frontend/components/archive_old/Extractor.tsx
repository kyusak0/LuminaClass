// components/archive/Extractor.tsx

import JSZip from 'jszip';
import { useState } from 'react';

export interface ExtractedFile {
  name: string;
  blob: Blob;
  size: number;
  type: string;
  content?: string | ArrayBuffer;
}

interface ZipExtractorProps {
  onFilesExtracted?: (files: ExtractedFile[]) => void;
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
  children?: (props: {
    extractZip: (zipFile: File | Blob) => Promise<ExtractedFile[] | null>;
    isLoading: boolean;
    progress: number;
    extractedFiles: ExtractedFile[];
  }) => React.ReactNode;
}

export function ZipExtractor({ 
  onFilesExtracted, 
  onProgress, 
  onError,
  children 
}: ZipExtractorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedFiles, setExtractedFiles] = useState<ExtractedFile[]>([]);

  const extractZip = async (zipFile: File | Blob): Promise<ExtractedFile[] | null> => {
    setIsLoading(true);
    setProgress(0);
    setExtractedFiles([]);
    
    try {
      const zip = new JSZip();
      const zipData = await zip.loadAsync(zipFile);
      
      const filesList = Object.values(zipData.files);
      const extracted: ExtractedFile[] = [];
      
      for (let i = 0; i < filesList.length; i++) {
        const zipEntry = filesList[i];
        
        // Пропускаем директории
        if (zipEntry.dir) continue;
        
        const blob = await zipEntry.async('blob') as Blob;
        const fileName = zipEntry.name;
        
        // Определяем тип файла по расширению
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        let fileType = 'unknown';
        if (['doc', 'docx'].includes(ext)) fileType = 'word';
        else if (['xls', 'xlsx', 'csv'].includes(ext)) fileType = 'excel';
        else if (['ppt', 'pptx'].includes(ext)) fileType = 'powerpoint';
        
        extracted.push({
          name: fileName,
          blob,
          size: blob.size,
          type: fileType,
        });
        
        const currentProgress = ((i + 1) / filesList.length) * 100;
        setProgress(currentProgress);
        onProgress?.(currentProgress);
      }
      
      setExtractedFiles(extracted);
      onFilesExtracted?.(extracted);
      
      return extracted;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка распаковки ZIP архива';
      onError?.(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  if (children) {
    return <>{children({ extractZip, isLoading, progress, extractedFiles })}</>;
  }

  return null;
}
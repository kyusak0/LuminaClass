import { useState, useCallback } from 'react';
import { OfficeFile, FileType } from '@/types/office';

export function useFileOperations() {
  const [files, setFiles] = useState<OfficeFile[]>([]);

  const createNewFile = useCallback((type: FileType) => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    let newFile: OfficeFile = {
      id: Date.now().toString(),
      name: `новый_${type}_${timestamp}.${type === 'word' ? 'docx' : type === 'excel' ? 'xlsx' : 'pptx'}`,
      type,
      content: {},
      createdAt: new Date(),
    };
    
    if (type === 'word') {
      newFile.wordContent = '<p>Новый документ</p>';
      newFile.wordImages = [];
    }
    
    if (type === 'excel') {
      newFile.excelHeaders = ['A', 'B'];
      newFile.excelData = [[{ value: '' }, { value: '' }]];
    }
    
    if (type === 'powerpoint') {
      newFile.slides = [{
        id: Date.now(),
        title: 'Новый слайд',
        elements: [],
        background: '#ffffff'
      }];
      newFile.currentSlide = 0;
    }
    
    setFiles(prev => [...prev, newFile]);
    return newFile;
  }, []);

  const updateFile = useCallback((updatedFile: OfficeFile) => {
    setFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
  }, []);

  const deleteFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  return {
    files,
    setFiles,
    createNewFile,
    updateFile,
    deleteFile
  };
}
'use client';

import { useState } from 'react';

type FileType = 'word' | 'excel' | 'powerpoint' | 'txt';
import { OfficeFile } from '@/types/office';

interface FileListProps {
  files: OfficeFile[];
  selectedFileId: string | null;
  onSelectFile: (file: OfficeFile) => void;
  onRenameFile: (fileId: string, newName: string) => void;
  onDeleteFile: (fileId: string) => void;
  className?: string;
}

export default function FileList({ 
  files, 
  selectedFileId, 
  onSelectFile, 
  onRenameFile, 
  onDeleteFile,
  className = ''
}: FileListProps) {
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');

  const startRename = (file: OfficeFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingFileId(file.id);
    // Убираем расширение для редактирования
    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
    setNewFileName(nameWithoutExt);
  };

  const cancelRename = () => {
    setRenamingFileId(null);
    setNewFileName('');
  };

  const confirmRename = () => {
    if (!renamingFileId || !newFileName.trim()) return;
    
    const oldFile = files.find(f => f.id === renamingFileId);
    if (oldFile) {
      // Сохраняем оригинальное расширение
      const oldExt = oldFile.name.split('.').pop() || '';
      // Формируем новое имя с оригинальным расширением
      const newFullName = `${newFileName.trim()}.${oldExt}`;
      
      // Проверяем, не пытается ли пользователь добавить расширение в имя
      if (newFileName.includes('.') && newFileName.split('.').pop() !== oldExt) {
        alert(`Нельзя изменить расширение файла. Файл останется с расширением .${oldExt}`);
      }
      
      onRenameFile(renamingFileId, newFullName);
    }
    cancelRename();
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') confirmRename();
    else if (e.key === 'Escape') cancelRename();
  };

  const handleDelete = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Вы уверены, что хотите удалить этот файл?')) {
      onDeleteFile(fileId);
    }
  };

  const getFileIcon = (type: FileType) => {
    switch (type) {
      case 'word': return '📝';
      case 'excel': return '📊';
      case 'powerpoint': return '📽️';
      case 'txt': return '📄';
      default: return '📄';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Сегодня';
    if (days === 1) return 'Вчера';
    if (days < 7) return `${days} дня(ей) назад`;
    return date.toLocaleDateString('ru-RU');
  };

  // Получение расширения файла для отображения
  const getFileExtension = (fileName: string) => {
    return fileName.split('.').pop() || '';
  };

  if (files.length === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-8 text-center ${className}`}>
        <div className="text-6xl mb-4">📂</div>
        <p className="text-gray-500">Нет файлов</p>
        <p className="text-sm text-gray-400 mt-2">Создайте новый файл или откройте существующий</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-700">Мои документы</h3>
        <p className="text-xs text-gray-500 mt-1">Всего: {files.length}</p>
      </div>
      
      <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
        {files.map(file => {
          const fileExt = getFileExtension(file.name);
          const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
          
          return (
            <div
              key={file.id}
              className={`p-3 cursor-pointer transition-all duration-150 ${
                selectedFileId === file.id
                  ? 'bg-blue-50 border-l-4 border-main'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => onSelectFile(file)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-xl">{getFileIcon(file.type)}</span>
                  
                  {renamingFileId === file.id ? (
                    <div className="flex-1 flex items-center gap-1">
                      <input
                        type="text"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        onKeyDown={handleRenameKeyDown}
                        onBlur={confirmRename}
                        className="flex-1 text-sm font-medium text-gray-700 bg-white border border-main rounded px-2 py-1 focus:outline-none"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-sm text-gray-500">.{fileExt}</span>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {fileNameWithoutExt}
                        <span className="text-gray-400 text-xs ml-1">.{fileExt}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {formatDate(file.createdAt)}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={(e) => startRename(file, e)}
                    className="p-1.5 text-gray-400 hover:text-main transition rounded-lg hover:bg-gray-100"
                    title="Переименовать"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => handleDelete(file.id, e)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-gray-100"
                    title="Удалить"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
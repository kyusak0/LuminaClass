// components/archive/Viewer.tsx
import { useState } from 'react';
import { ExtractedFile } from './Extractor';

interface ZipFileSelectorProps {
  files: ExtractedFile[];
  onSelect: (selectedFiles: ExtractedFile[]) => void;
  onClose: () => void;
  multiple?: boolean;
}

export function ZipFileSelector({ 
  files, 
  onSelect, 
  onClose, 
  multiple = true 
}: ZipFileSelectorProps) {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const toggleFile = (fileName: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileName)) {
      newSelected.delete(fileName);
    } else {
      if (multiple) {
        newSelected.add(fileName);
      } else {
        newSelected.clear();
        newSelected.add(fileName);
      }
    }
    setSelectedFiles(newSelected);
  };

  const handleConfirm = () => {
    const selected = files.filter(f => selectedFiles.has(f.name));
    onSelect(selected);
    onClose();
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'word': return '📝';
      case 'excel': return '📊';
      case 'powerpoint': return '📽️';
      default: return '📄';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Выберите файлы из архива
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✖
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mb-4">
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.name}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
                  selectedFiles.has(file.name)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => toggleFile(file.name)}
              >
                <input
                  type={multiple ? "checkbox" : "radio"}
                  checked={selectedFiles.has(file.name)}
                  onChange={() => {}}
                  className="w-4 h-4"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="text-2xl">{getFileIcon(file.type)}</div>
                <div className="flex-1">
                  <div className="font-medium truncate">{file.name}</div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(file.size)} • {file.type}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <button
            onClick={handleConfirm}
            disabled={selectedFiles.size === 0}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Добавить ({selectedFiles.size})
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
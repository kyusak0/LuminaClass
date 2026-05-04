'use client';

import { useState, useEffect } from 'react';
import TextEditor from '@/components/editor/TextEditor';
import ExcelEditor from '@/components/editor/TableEditor';
import PowerPointEditor from '@/components/editor/PresentationEditor';
import { Save, X, Download, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/authContext';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import * as XLSX from 'xlsx';
import { NEXT_PUBLIC_API_URL } from '@/lib/axios.config';

const STORAGE_URL = '${NEXT_PUBLIC_API_URL}/storage/';

interface FileEditorProps {
  file: any;
  onSave: (fileId: number, content: any) => Promise<{ success: boolean }>;
  onClose: () => void;
  onSaveAsPermanent?: () => Promise<{ success: boolean }> | void;
  userId: number;
  onDiscard?: () => void;
}

export default function FileEditor({
  file,
  onSave,
  onClose,
  userId,
  onSaveAsPermanent,
  onDiscard
}: FileEditorProps) {
  const auth = useAuth()
  if (!auth) return
  const { user, get, post } = auth;
  const [content, setContent] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    loadFileContent();

    // Очищаем blob URL при размонтировании
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [file.id]);

  const loadFileContent = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Если это новая копия с уже загруженным контентом
      if (file.content) {
        console.log('Using existing content from copy');
        setContent(file.content);
        setIsLoading(false);
        return;
      }

      // Если это временный файл из архива
      if (file.is_temp && file.content) {
        console.log('Loading temp file from archive');
        setContent(file.content);
        setIsLoading(false);
        return;
      }

      // Если это изображение
      if (file.file_type === 'image') {
        if (file.content) {
          setImageUrl(file.content);
        } else if (file.path) {
          setImageUrl(`${STORAGE_URL}${file.path}`);
        }
        setIsLoading(false);
        return;
      }

      // Для обычных файлов загружаем с сервера
      const response = await get(`/get-file-content/${file.id}`);

      if (response && response.success) {
        setContent(response.content);
      } else {
        initializeEmptyContent();
      }
    } catch (error) {
      console.error('Error loading content:', error);
      initializeEmptyContent();
    } finally {
      setIsLoading(false);
    }
  };

  const initializeEmptyContent = () => {
    if (file.file_type === 'excel') {
      setContent([['', '', ''], ['', '', ''], ['', '', '']]);
    } else if (file.file_type === 'powerpoint') {
      setContent({
        slides: [{
          id: Date.now().toString(),
          elements: [{
            id: Date.now().toString() + '_text',
            type: 'text',
            content: file.original_name || 'New Presentation',
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
      });
    } else {
      setContent('<p>Start editing your document...</p>');
    }
  };

  const handleSave = async () => {
    if (file.file_type === 'image') {
      alert('Images are saved automatically');
      return;
    }

    setIsSaving(true);
    try {
      // Для PowerPoint и Excel сохраняем структуру
      let saveContent = content;

      // Для текстовых документов сохраняем HTML
      if (file.file_type === 'word' || file.file_type === 'text') {
        saveContent = content;
      }

      // Для PowerPoint сохраняем slides
      if (file.file_type === 'powerpoint') {
        saveContent = { slides: content.slides || [] };
      }

      // Для Excel сохраняем массив
      if (file.file_type === 'excel') {
        saveContent = content;
      }

      console.log('Saving content for file:', file.id, file.file_type);
      console.log('Content to save:', saveContent);

      // Сохраняем через API
      const result = await post('/save-file-content', {
        file_id: file.id,
        content: saveContent
      });

      if (result && result.success) {
        alert('File saved successfully!');
        // Также сохраняем в localStorage как резервную копию
        localStorage.setItem(`backup_${file.id}`, JSON.stringify(saveContent));
      } else {
        alert('Error saving file: ' + (result?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Error saving file');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    if (file.file_type === 'image' && imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = file.original_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    try {
      // Создаем файл с изменениями для скачивания
      let blob: Blob;
      let fileName = file.original_name;

      if (file.file_type === 'word' || file.file_type === 'text') {
        // Для текстовых документов сохраняем как HTML
        const htmlContent = content || '<p>Empty document</p>';
        blob = new Blob([htmlContent], { type: 'text/html' });
        fileName = fileName.replace(/\.(docx?|txt)$/, '.html');
      }
      else if (file.file_type === 'excel') {
        // Для Excel сохраняем как JSON
        const excelData = JSON.stringify(content, null, 2);
        blob = new Blob([excelData], { type: 'application/json' });
        fileName = fileName.replace(/\.(xlsx?)$/, '.json');
      }
      else if (file.file_type === 'powerpoint') {
        // Для PowerPoint сохраняем как JSON
        const pptData = JSON.stringify(content, null, 2);
        blob = new Blob([pptData], { type: 'application/json' });
        fileName = fileName.replace(/\.(pptx?)$/, '.json');
      }
      else {
        // Для остальных типов скачиваем с сервера
        window.open(`${NEXT_PUBLIC_API_URL}/api/files/download/${file.id}`, '_blank');
        return;
      }

      // Скачиваем файл с изменениями
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('Downloading edited version as ' + fileName);
    } catch (error) {
      console.error('Download error:', error);
      alert('Error downloading file');
    }
  };

  const handleDownloadOriginal = () => {
    window.open(`${NEXT_PUBLIC_API_URL}/api/files/download/${file.id}`, '_blank');
  };

  const handleDownloadEdited = async () => {
    try {
      let blob: Blob;
      let fileName = file.original_name;
      let fileExtension = fileName.split('.').pop()?.toLowerCase();

      if (file.file_type === 'word') {
        // Создаем DOCX документ
        const doc = new Document({
          sections: [{
            properties: {},
            children: createParagraphsFromHtml(content)
          }]
        });

        const buffer = await Packer.toBlob(doc);
        blob = buffer;
        fileName = fileName.replace(/\.(docx?)$/, '_edited.docx');
      }
      else if (file.file_type === 'excel') {
        // Создаем XLSX файл
        const ws = XLSX.utils.aoa_to_sheet(content || []);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        fileName = fileName.replace(/\.(xlsx?)$/, '_edited.xlsx');
      }
      else if (file.file_type === 'powerpoint') {
        // Для PowerPoint сохраняем как JSON (создание PPTX сложнее)
        const pptData = JSON.stringify(content, null, 2);
        blob = new Blob([pptData], { type: 'application/json' });
        fileName = fileName.replace(/\.(pptx?)$/, '_edited.json');
        alert('PowerPoint edited version saved as JSON. Full PPTX support coming soon.');
      }
      else if (file.file_type === 'text') {
        // Для текстовых файлов сохраняем как TXT
        const textContent = stripHtml(content || '');
        blob = new Blob([textContent], { type: 'text/plain' });
        fileName = fileName.replace(/\.(txt)$/, '_edited.txt');
      }
      else {
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert(`Downloaded edited version as ${fileName}`);
    } catch (error) {
      console.error('Download error:', error);
      alert('Error creating file for download');
    }
  };

  // Вспомогательная функция для конвертации HTML в параграфы DOCX
  const createParagraphsFromHtml = (html: string): Paragraph[] => {
    const paragraphs: Paragraph[] = [];
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) {
          paragraphs.push(new Paragraph({
            children: [new TextRun(text)]
          }));
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        if (element.tagName === 'P') {
          const text = element.textContent?.trim();
          if (text) {
            paragraphs.push(new Paragraph({
              children: [new TextRun(text)]
            }));
          }
        }
        element.childNodes.forEach(processNode);
      }
    };

    tempDiv.childNodes.forEach(processNode);

    if (paragraphs.length === 0) {
      paragraphs.push(new Paragraph({
        children: [new TextRun('Empty document')]
      }));
    }

    return paragraphs;
  };

  const stripHtml = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  const renderEditor = () => {
    // Изображения
    if (file.file_type === 'image') {
      console.log('Rendering image, content type:', typeof file.content);
      console.log('Content preview:', file.content?.substring(0, 100));

      // Получаем источник изображения
      let imageSrc = null;

      if (file.content && file.content.startsWith('data:image')) {
        // Это base64 изображение
        imageSrc = file.content;
        console.log('Using base64 image');
      } else if (file.content && file.content.startsWith('blob:')) {
        // Это blob URL
        imageSrc = file.content;
        console.log('Using blob URL');
      } else if (file.path) {
        // Это путь к файлу на сервере
        imageSrc = `${STORAGE_URL}${file.path}`;
        console.log('Using server path:', imageSrc);
      }

      if (!imageSrc) {
        return (
          <div className="flex flex-col items-center justify-center h-full bg-gray-100">
            <div className="text-center text-gray-500">
              <p className="text-lg">No image source available</p>
              <p className="text-sm mt-2">File: {file.original_name}</p>
              <p className="text-xs mt-1">Type: {file.file_type}</p>
            </div>
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-100 p-8 overflow-auto">
          <div className="flex flex-col items-center gap-4 max-w-full max-h-full">
            <img
              src={imageSrc}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg"
              alt={file.original_name}
              onError={(e) => {
                console.error('Image failed to load:', imageSrc);
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const errorDiv = document.createElement('div');
                  errorDiv.className = 'text-red-500 text-center p-8';
                  errorDiv.innerHTML = `
                  <p>Failed to load image</p>
                  <p class="text-sm mt-2">${file.original_name}</p>
                  <p class="text-xs mt-1">Content type: ${typeof file.content}</p>
                  <p class="text-xs">Content length: ${file.content?.length || 0}</p>
                `;
                  parent.appendChild(errorDiv);
                }
              }}
              onLoad={() => console.log('Image loaded successfully')}
            />
            <div className="text-sm text-gray-500 bg-white p-3 rounded-lg shadow">
              <p>File: {file.original_name}</p>
              <p>Size: {(file.size / 1024).toFixed(1)} KB</p>
              {file.is_temp && <p className="text-blue-500">📦 Extracted from archive</p>}
            </div>
          </div>
        </div>
      );
    }

    if (file.file_type === 'powerpoint') {
      const pptContent = content || { slides: [] };
      return <PowerPointEditor initialData={pptContent} onChange={setContent} />;
    }

    // Excel
    if (file.file_type === 'excel') {
      return <ExcelEditor initialData={content || [[]]} onChange={setContent} />;
    }

    // Word и текст
    return <TextEditor initialContent={content || '<p>Start typing...</p>'} onChange={setContent} />;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="mt-4 text-gray-600">Loading file content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-red-500 text-center">
          <p className="text-lg font-semibold">Error</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={loadFileContent}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="border-b p-4 flex justify-between items-center bg-gray-50">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">{file.original_name}</h2>
          <p className="text-sm text-gray-500">
            Type: {file.file_type} • Size: {(file.size / 1024).toFixed(1)} KB
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadOriginal}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-2 transition-colors"
            title="Download original file from server"
          >
            <Download size={18} />
            Download Original
          </button>
          {file.file_type !== 'image' && (
            <button
              onClick={handleDownloadEdited}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2 transition-colors"
              title="Download edited version"
            >
              <Download size={18} />
              Download Edited
            </button>
          )}
          {file.file_type !== 'image' && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-2 transition-colors"
          >
            <X size={18} />
            Close
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {renderEditor()}
      </div>
    </div>
  );
}
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType } from 'docx';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import mammoth from 'mammoth';
import PptxGenJS from 'pptxgenjs';
import { useSearchParams, useRouter } from 'next/navigation';
import JSZip from 'jszip';

import MainLayout from '@/layouts/MainLayout';
import WordEditor from '@/components/office/document/Editor';
import ExcelEditor from '@/components/office/table/Editor';
import PowerPointEditor from '@/components/office/present/Editor';
import HelpPanel from '@/components/office/helpPanel/HelpPanel';
import FileList from '@/components/office/fileList/FileList';
import { ImageItem, OfficeFile, ContentBlock, Slide, ExcelCell } from '@/types/office';
import { useAuth } from '@/context/authContext';

type FileType = 'word' | 'excel' | 'powerpoint';
type FileDialogAction = 'server' | 'device' | 'cancel' | null;
type UploadMode = 'single' | 'all';

// Интерфейсы для ZIP операций
interface ExtractedFile {
  name: string;
  blob: Blob;
  size: number;
  type: string;
  path?: string;
}

export default function OfficeEditor() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const auth = useAuth();
  if (!auth) return null;
  const { user, post, get } = auth;

  const [files, setFiles] = useState<OfficeFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<OfficeFile | null>(null);
  const [viewMode, setViewMode] = useState<'view' | 'edit'>('edit');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [helpType, setHelpType] = useState<'main' | 'word' | 'excel' | 'powerpoint' | null>(null);
  const [pendingFileAction, setPendingFileAction] = useState<{ type: 'open' | 'save'; callback: (action: FileDialogAction) => void } | null>(null);
  const [isLoadingFromUrl, setIsLoadingFromUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>('single');
  const [serverFiles, setServerFiles] = useState<any[]>([]);
  const [showServerFiles, setShowServerFiles] = useState(false);

  // Состояния для ZIP
  const [showZipExtractor, setShowZipExtractor] = useState(false);
  const [extractedFilesFromZip, setExtractedFilesFromZip] = useState<ExtractedFile[]>([]);
  const [showZipFileSelector, setShowZipFileSelector] = useState(false);
  const [zipExtractProgress, setZipExtractProgress] = useState(0);
  const [isExtractingZip, setIsExtractingZip] = useState(false);

  const [serverImages, setServerImages] = useState<any[]>([]);
  const [showServerImagesDialog, setShowServerImagesDialog] = useState(false);
  const [selectedImageCallback, setSelectedImageCallback] = useState<((imageUrl: string) => void) | null>(null);

  // Загрузка файлов из localStorage при старте
  useEffect(() => {
    loadFilesFromStorage();
  }, []);

  // Обработка URL параметров после загрузки файлов
  useEffect(() => {
    if (!isInitialized && files.length > 0) {
      setIsInitialized(true);
      handleUrlParams();
    }
  }, [files, isInitialized]);

  // Загрузка файлов с сервера при авторизации
  useEffect(() => {
    if (user) {
      loadFilesFromServer();
      loadImagesFromServer();
    }
  }, [user]);

  const handleUrlParams = () => {
    const fileId = searchParams.get('file');
    const shareId = searchParams.get('share');

    if (fileId) {
      const existingFile = files.find(f => f.id === fileId);
      if (existingFile) {
        setSelectedFile(existingFile);
        const url = new URL(window.location.href);
        url.searchParams.delete('file');
        router.replace(url.pathname, { scroll: false });
      }
    } else if (shareId) {
      loadSharedFile(shareId);
    }
  };

  // Сохранение файлов в localStorage
  const saveFilesToStorage = () => {
    try {
      localStorage.setItem('office_files', JSON.stringify(files));
    } catch (error) {
      console.error('Ошибка сохранения файлов:', error);
    }
  };

  // Загрузка файлов из localStorage
  const loadFilesFromStorage = () => {
    try {
      const savedFiles = localStorage.getItem('office_files');
      if (savedFiles) {
        const parsed = JSON.parse(savedFiles);
        const restored = parsed.map((file: any) => ({
          ...file,
          createdAt: new Date(file.createdAt),
          updatedAt: new Date(file.updatedAt)
        }));
        setFiles(restored);
      }
    } catch (error) {
      console.error('Ошибка загрузки файлов:', error);
    }
  };

  const loadFilesFromServer = async () => {
    try {
      const response = await get('/get-files');
      if (response && response.data) {
        setServerFiles(response.data);

        // Конвертируем серверные файлы в формат OfficeFile
        for (const file of response.data) {
          // Проверяем, есть ли уже такой файл
          if (!files.some(f => f.serverId === file.id)) {
            await downloadAndAddServerFile(file);
          }
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки файлов с сервера:', error);
    }
  };

  // Загрузка и добавление файла с сервера (ИСПРАВЛЕННАЯ)
  const downloadAndAddServerFile = async (serverFile: any) => {
    try {
      console.log('Загрузка файла с сервера:', serverFile.original_name);

      // Получаем файл через API с правильной обработкой
      const response = await get(`/get-file/${serverFile.id}`);

      let blob: Blob;

      // Обрабатываем разные форматы ответа
      if (response instanceof Blob) {
        blob = response;
      } else if (response && response.data instanceof Blob) {
        blob = response.data;
      } else if (response && response.data) {
        // Если data - это ArrayBuffer или строка
        if (response.data instanceof ArrayBuffer) {
          blob = new Blob([response.data]);
        } else if (typeof response.data === 'string') {
          // Если пришла строка - возможно это base64 или текст
          blob = new Blob([response.data], { type: 'text/plain' });
        } else {
          // Пробуем преобразовать в JSON и затем в Blob
          const jsonStr = JSON.stringify(response.data);
          blob = new Blob([jsonStr], { type: 'application/json' });
        }
      } else {
        console.error('Неизвестный формат ответа:', response);
        throw new Error('Не удалось получить файл');
      }

      console.log('Получен blob размером:', blob.size, 'тип:', blob.type);

      if (blob.size === 0) {
        console.error('Получен пустой файл:', serverFile.original_name);
        return;
      }

      const fileType = getFileTypeFromName(serverFile.original_name);
      const officeFile = await blobToFile(blob, serverFile.original_name, fileType);

      const newFile = {
        ...officeFile,
        serverId: serverFile.id,
        serverFile: true,
        serverUrl: serverFile.url
      };

      setFiles(prev => {
        if (prev.some(f => f.serverId === serverFile.id)) return prev;
        console.log('Добавлен файл:', newFile.name, 'тип:', newFile.type);
        return [...prev, newFile];
      });

      saveFilesToStorage();
    } catch (error) {
      console.error('Ошибка загрузки файла с сервера:', error);
    }
  };

  // Открытие файла с сервера (ИСПРАВЛЕННАЯ)
  const openFileFromServer = async (fileId: number, fileName: string) => {
    try {
      setIsUploading(true);

      // Находим файл в списке serverFiles
      const serverFile = serverFiles.find(f => f.id === fileId);
      if (!serverFile) {
        throw new Error('Файл не найден на сервере');
      }

      console.log('Открытие файла с сервера:', fileName);

      // Получаем файл через API
      const response = await get(`/get-file/${fileId}`);

      let blob: Blob;

      // Обрабатываем разные форматы ответа
      if (response instanceof Blob) {
        blob = response;
      } else if (response && response.data instanceof Blob) {
        blob = response.data;
      } else if (response && response.data) {
        if (response.data instanceof ArrayBuffer) {
          blob = new Blob([response.data]);
        } else if (typeof response.data === 'string') {
          blob = new Blob([response.data], { type: 'text/plain' });
        } else {
          const jsonStr = JSON.stringify(response.data);
          blob = new Blob([jsonStr], { type: 'application/json' });
        }
      } else {
        throw new Error('Не удалось получить файл');
      }

      console.log('Получен blob размером:', blob.size);

      if (blob.size === 0) {
        alert('Файл пуст или не может быть загружен');
        return;
      }

      // Проверяем, является ли файл ZIP архивом
      if (fileName.endsWith('.zip')) {
        const extractedFiles = await extractZipFile(blob);
        setExtractedFilesFromZip(extractedFiles);
        setShowZipFileSelector(true);
      } else {
        const fileType = getFileTypeFromName(fileName);
        const officeFile = await blobToFile(blob, fileName, fileType);
        const existingFile = files.find(f => f.serverId === fileId);

        if (existingFile) {
          setSelectedFile(existingFile);
        } else {
          const newFile = { ...officeFile, serverId: fileId, serverFile: true, serverUrl: serverFile.url };
          setFiles(prev => [...prev, newFile]);
          setSelectedFile(newFile);
          saveFilesToStorage();
        }
      }
    } catch (error) {
      console.error('Ошибка открытия файла с сервера:', error);
      alert('Ошибка открытия файла с сервера');
    } finally {
      setIsUploading(false);
    }
  };

  // Загрузка файла с сервера на устройство (ИСПРАВЛЕННАЯ)
  const downloadFromServer = async (fileId: number, fileName: string) => {
    try {
      const response = await get(`/get-file/${fileId}`);

      let blob: Blob;

      if (response instanceof Blob) {
        blob = response;
      } else if (response && response.data instanceof Blob) {
        blob = response.data;
      } else if (response && response.data) {
        if (response.data instanceof ArrayBuffer) {
          blob = new Blob([response.data]);
        } else if (typeof response.data === 'string') {
          blob = new Blob([response.data], { type: 'text/plain' });
        } else {
          const jsonStr = JSON.stringify(response.data);
          blob = new Blob([jsonStr], { type: 'application/json' });
        }
      } else {
        throw new Error('Не удалось получить файл');
      }

      if (blob.size === 0) {
        alert('Файл пуст');
        return;
      }

      saveAs(blob, fileName);
      alert('Файл успешно загружен');
    } catch (error) {
      console.error('Ошибка загрузки файла с сервера:', error);
      alert('Ошибка загрузки файла с сервера');
    }
  };

  // Удаление файла с сервера
  const deleteFromServer = async (fileId: number) => {
    if (!confirm('Удалить файл с сервера?')) return;

    try {
      // Используем ваш метод delete или fetch напрямую
      const response = await fetch(`/api/files/delete/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        alert('Файл удален с сервера');
        setFiles(prev => prev.filter(f => f.serverId !== fileId));
        setServerFiles(prev => prev.filter(f => f.id !== fileId));
        if (selectedFile?.serverId === fileId) {
          setSelectedFile(null);
        }
        saveFilesToStorage();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Ошибка удаления');
      }
    } catch (error) {
      console.error('Ошибка удаления файла:', error);
      alert('Ошибка удаления файла с сервера');
    }
  };

  // Загрузка одного файла на сервер
  const uploadSingleFile = async (file: OfficeFile) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      const fileBlob = await fileToBlob(file);
      const formData = new FormData();
      formData.append('file', fileBlob, file.name);
      formData.append('author_id', user?.id?.toString() || '1');

      // Используем ваш метод post
      const response = await post('/save-file', formData);

      if (response && response.file_id) {
        alert(`Файл "${file.name}" успешно загружен на сервер`);

        const updatedFile = {
          ...file,
          serverId: response.file_id,
          serverFile: true,
          serverUrl: response.url
        };

        setFiles(prev => prev.map(f =>
          f.id === file.id ? updatedFile : f
        ));
        saveFilesToStorage();

        // Обновляем список серверных файлов
        await loadFilesFromServer();

        return true;
      } else {
        throw new Error(response?.message || 'Ошибка загрузки');
      }
    } catch (error) {
      console.error('Ошибка загрузки файла:', error);
      alert(`Ошибка загрузки файла "${file.name}"`);
      return false;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Загрузка файлов архивом
  const uploadFilesAsZip = async (filesToZip: OfficeFile[]) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      const zipBlob = await createZipArchive(filesToZip);
      const formData = new FormData();
      formData.append('file', zipBlob, `files_${Date.now()}.zip`);
      formData.append('author_id', user?.id?.toString() || '1');

      const response = await post('/save-file', formData);

      if (response && response.file_id) {
        alert(`Архив успешно загружен на сервер`);
        await loadFilesFromServer();
      } else {
        throw new Error(response?.message || 'Ошибка загрузки архива');
      }
    } catch (error) {
      console.error('Ошибка загрузки архива:', error);
      alert('Ошибка загрузки архива на сервер');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };


  // Вставка изображения с сервера
  const insertServerImage = (imageUrl: string) => {
    if (selectedImageCallback) {
      selectedImageCallback(imageUrl);
      setSelectedImageCallback(null);
      setShowServerImagesDialog(false);
    }
  };

  // Загрузка shared файла
  const loadSharedFile = async (shareId: string) => {
    setIsLoadingFromUrl(true);
    setUrlError(null);

    try {
      const response = await fetch(`/api/files/share?id=${shareId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Файл не найден');
        } else if (response.status === 410) {
          throw new Error('Ссылка устарела');
        } else {
          throw new Error('Ошибка загрузки файла');
        }
      }

      const fileData = await response.json();

      const newFile: OfficeFile = {
        id: Date.now().toString(),
        name: fileData.fileName,
        type: fileData.fileType,
        content: fileData.content || {},
        createdAt: new Date(fileData.createdAt || Date.now()),
        updatedAt: new Date(),
        wordContent: fileData.wordContent,
        wordImages: fileData.wordImages,
        excelData: fileData.excelData,
        excelHeaders: fileData.excelHeaders,
        slides: fileData.slides
      };

      setFiles(prev => [...prev, newFile]);
      setSelectedFile(newFile);
      saveFilesToStorage();

      const url = new URL(window.location.href);
      url.searchParams.delete('share');
      router.replace(url.pathname, { scroll: false });

      alert('Файл успешно загружен по ссылке!');
    } catch (error) {
      console.error('Ошибка загрузки shared файла:', error);
      setUrlError(error instanceof Error ? error.message : 'Ошибка загрузки файла');
    } finally {
      setIsLoadingFromUrl(false);
    }
  };

  // Определение типа файла по имени
  const getFileTypeFromName = (filename: string): FileType => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['doc', 'docx'].includes(ext)) return 'word';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
    if (['ppt', 'pptx'].includes(ext)) return 'powerpoint';
    return 'word';
  };

  // Конвертация OfficeFile в Blob
  const fileToBlob = useCallback(async (file: OfficeFile): Promise<Blob> => {
    console.log('fileToBlob called for type:', file.type); // Для отладки

    if (file.type === 'word') {
      return await saveWordToBlob(file.wordContent || [], file.wordImages || []);
    } else if (file.type === 'txt') {
      // Собираем текст из блоков
      let text = '';
      if (file.wordContent && Array.isArray(file.wordContent)) {
        text = file.wordContent
          .filter(block => block.type === 'text')
          .map(block => block.content)
          .join('\n');
      }
      console.log('TXT content length:', text.length); // Для отладки
      return new Blob([text], { type: 'text/plain;charset=utf-8' });
    } else if (file.type === 'excel') {
      return await saveExcelToBlob(file.excelData || [], file.excelHeaders || []);
    } else if (file.type === 'powerpoint') {
      return await savePowerPointToBlob(file.slides || []);
    }

    console.warn('Unknown file type:', file.type);
    return new Blob();
  }, []);

  // Конвертация Blob в OfficeFile
  const blobToFile = useCallback(async (blob: Blob, fileName: string, fileType: FileType): Promise<OfficeFile> => {
    console.log('blobToFile:', fileName, 'тип:', fileType, 'размер:', blob.size);

    // Проверка на пустой файл
    if (blob.size === 0) {
      console.warn('Пустой файл:', fileName);
      // Создаем пустой файл с заглушкой
      if (selectedFile?.type === 'txt') {
        return {
          id: `${Date.now()}_${Math.random()}`,
          name: fileName,
          type: 'txt',
          content: { text: '' },
          createdAt: new Date(),
          updatedAt: new Date(),
          wordContent: [{ index: 0, type: 'text', content: 'Пустой файл', style: null }],
          wordImages: []
        };
      }
    }

    const arrayBuffer = await blob.arrayBuffer();
    const id = `${Date.now()}_${Math.random()}`;
  }, []);

  // Сохранение Word в Blob
  const saveWordToBlob = async (blocks: ContentBlock[], images: ImageItem[]): Promise<Blob> => {
    const children: any[] = [];

    blocks.forEach(block => {
      if (block.type === 'text' && block.content.trim()) {
        const style = block.style;
        children.push(new Paragraph({
          children: [new TextRun({
            text: block.content,
            font: style?.fontFamily || 'Arial',
            size: (style?.fontSize || 14) * 2,
            color: (style?.color || '#000000').replace('#', ''),
            bold: style?.bold || false,
            italics: style?.italic || false
          })],
          alignment: style?.alignment === 'center' ? AlignmentType.CENTER :
            style?.alignment === 'right' ? AlignmentType.RIGHT :
              style?.alignment === 'justify' ? AlignmentType.JUSTIFIED :
                AlignmentType.LEFT,
        }));
      } else if (block.type === 'image') {
        const imageData = images.find(img => img.dataUrl === block.content);
        if (imageData) {
          const base64Data = imageData.dataUrl.split(',')[1];
          if (base64Data) {
            const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            children.push(new Paragraph({
              children: [new (ImageRun as any)({
                data: imageBuffer,
                transformation: {
                  width: imageData.width,
                  height: imageData.height
                }
              })],
              alignment: AlignmentType.CENTER
            }));
          }
        }
      }
    });

    if (children.length === 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: ' ' })]
      }));
    }

    const doc = new Document({ sections: [{ properties: {}, children }] });
    return await Packer.toBlob(doc);
  };

  // Сохранение Excel в Blob
  const saveExcelToBlob = async (data: any[][], headers: string[]): Promise<Blob> => {
    const allData: any[][] = [headers];
    for (let i = 0; i < data.length; i++) {
      const row: any[] = [];
      for (let j = 0; j < headers.length; j++) {
        const cell = data[i]?.[j];
        row.push(cell?.formula || cell?.value || '');
      }
      allData.push(row);
    }
    const ws = XLSX.utils.aoa_to_sheet(allData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  };

  // Сохранение PowerPoint в Blob
  const savePowerPointToBlob = async (slides: any[]): Promise<Blob> => {
    const pptx = new PptxGenJS();
    slides.forEach(slide => {
      const pptSlide = pptx.addSlide();
      if (slide.background) pptSlide.background = { color: slide.background.replace('#', '') };
      [...slide.elements].sort((a: any, b: any) => a.zIndex - b.zIndex).forEach((element: any) => {
        const xInches = element.x / 96, yInches = element.y / 96;
        const wInches = element.width / 96, hInches = element.height / 96;
        if (element.type === 'text') {
          pptSlide.addText(element.content, {
            x: xInches, y: yInches, w: wInches, h: hInches,
            fontSize: element.fontSize || 20, fontFace: element.fontFamily || 'Arial',
            color: element.color?.replace('#', '') || '000000'
          });
        } else if (element.type === 'image') {
          pptSlide.addImage({ data: element.content, x: xInches, y: yInches, w: wInches, h: hInches });
        }
      });
    });
    return await pptx.write({ outputType: 'blob' });
  };

  // Распаковка ZIP архива
  const extractZipFile = async (zipFile: File | Blob): Promise<ExtractedFile[]> => {
    setIsExtractingZip(true);
    setZipExtractProgress(0);

    try {
      const zip = new JSZip();
      const zipData = await zip.loadAsync(zipFile);
      const filesList = Object.values(zipData.files);
      const extracted: ExtractedFile[] = [];

      for (let i = 0; i < filesList.length; i++) {
        const zipEntry = filesList[i];
        if (zipEntry.dir) continue;

        const blob = await zipEntry.async('blob');
        const fileName = zipEntry.name;
        const ext = fileName.split('.').pop()?.toLowerCase() || '';

        let fileType = 'unknown';
        if (['doc', 'docx'].includes(ext)) fileType = 'word';
        else if (['xls', 'xlsx', 'csv'].includes(ext)) fileType = 'excel';
        else if (['ppt', 'pptx'].includes(ext)) fileType = 'powerpoint';

        extracted.push({
          name: fileName.split('/').pop() || fileName,
          blob,
          size: blob.size,
          type: fileType,
          path: fileName
        });

        setZipExtractProgress(((i + 1) / filesList.length) * 100);
      }

      return extracted;
    } catch (error) {
      console.error('Ошибка распаковки ZIP:', error);
      throw new Error('Ошибка распаковки ZIP архива');
    } finally {
      setIsExtractingZip(false);
      setZipExtractProgress(0);
    }
  };

  // Создание ZIP архива
  const createZipArchive = async (filesToZip: OfficeFile[]): Promise<Blob> => {
    const zip = new JSZip();

    for (const file of filesToZip) {
      const fileBlob = await fileToBlob(file);
      zip.file(file.name, fileBlob);
    }

    return await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
  };

  // Загрузка всех файлов на сервер
  const uploadAllFiles = async () => {
    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      setUploadProgress(((i + 1) / files.length) * 100);
      const success = await uploadSingleFile(files[i]);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    setIsUploading(false);
    alert(`Загрузка завершена:\nУспешно: ${successCount}\nОшибок: ${failCount}`);
  };

  // Обработка выбранных файлов из ZIP
  const handleAddSelectedFromZip = async (selectedFiles: ExtractedFile[]) => {
    const newOfficeFiles: OfficeFile[] = [];

    for (const file of selectedFiles) {
      const officeFile = await blobToFile(file.blob, file.name, file.type as FileType);
      newOfficeFiles.push(officeFile);
    }

    setFiles(prev => [...prev, ...newOfficeFiles]);
    saveFilesToStorage();
    alert(`Добавлено файлов: ${newOfficeFiles.length}`);
    setShowZipFileSelector(false);
    setExtractedFilesFromZip([]);
  };

  // Открытие диалога выбора изображения с сервера
  const openServerImagePicker = (onSelect: (imageUrl: string) => void) => {
    setSelectedImageCallback(() => onSelect);
    setShowServerImagesDialog(true);
    loadImagesFromServer();
  };

  // Генерация ссылки для шаринга файла
  const generateShareLink = async (file: OfficeFile) => {
    try {
      const shareData = {
        fileName: file.name,
        fileType: file.type,
        content: file.content,
        wordContent: file.wordContent,
        wordImages: file.wordImages,
        excelData: file.excelData,
        excelHeaders: file.excelHeaders,
        slides: file.slides,
        createdAt: file.createdAt.toISOString()
      };

      const response = await fetch('/api/files/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shareData),
      });

      if (!response.ok) {
        throw new Error('Ошибка создания ссылки');
      }

      const data = await response.json();
      const shareUrl = `${window.location.origin}/editor?share=${data.shareId}`;

      await navigator.clipboard.writeText(shareUrl);
      alert(`Ссылка скопирована в буфер обмена!\n\n${shareUrl}\n\nСсылка действительна 7 дней`);

      return shareUrl;
    } catch (error) {
      console.error('Ошибка создания share ссылки:', error);
      alert('Ошибка создания ссылки для шаринга');
    }
  };

  // Конвертация HTML в ContentBlock[]
  const convertHtmlToBlocks = (html: string): ContentBlock[] => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const blocks: ContentBlock[] = [];
    let index = 0;

    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        blocks.push({
          index: index++,
          type: 'text',
          content: node.textContent,
          style: {
            fontFamily: 'Arial',
            fontSize: 14,
            bold: false,
            italic: false,
            alignment: 'left',
            color: '#000000',
            listType: null,
            listLevel: 0
          }
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;

        if (element.tagName === 'P') {
          const text = element.textContent || '';
          if (text.trim()) {
            blocks.push({
              index: index++,
              type: 'text',
              content: text,
              style: {
                fontFamily: element.style.fontFamily || 'Arial',
                fontSize: parseInt(element.style.fontSize) || 14,
                bold: element.style.fontWeight === 'bold',
                italic: element.style.fontStyle === 'italic',
                alignment: (element.style.textAlign as any) || 'left',
                color: element.style.color || '#000000',
                listType: null,
                listLevel: 0
              }
            });
          }
        } else if (element.tagName === 'IMG') {
          blocks.push({
            index: index++,
            type: 'image',
            content: element.getAttribute('src') || '',
            style: null
          });
        } else {
          element.childNodes.forEach(processNode);
        }
      }
    };

    tempDiv.childNodes.forEach(processNode);

    if (blocks.length === 0) {
      blocks.push({
        index: 0,
        type: 'text',
        content: '',
        style: {
          fontFamily: 'Arial',
          fontSize: 14,
          bold: false,
          italic: false,
          alignment: 'left',
          color: '#000000',
          listType: null,
          listLevel: 0
        }
      });
    }

    return blocks;
  };

  // Обработчик изменения контента Word
  const handleWordContentChange = (blocks: ContentBlock[], images: ImageItem[]) => {
    if (!selectedFile) return;

    const updatedFile = {
      ...selectedFile,
      wordContent: blocks,
      wordImages: images,
      updatedAt: new Date()
    };

    const updatedFiles = files.map(f =>
      f.id === selectedFile.id ? updatedFile : f
    );

    setFiles(updatedFiles);
    setSelectedFile(updatedFile);
    saveFilesToStorage();
  };

  // Сохранение файлов на устройство
  const saveFileToDevice = async () => {
    if (!selectedFile) {
      alert('Нет открытого файла для сохранения');
      return;
    }

    if (selectedFile.type === 'word') {
      const blob = await saveWordToBlob(selectedFile.wordContent || [], selectedFile.wordImages || []);
      saveAs(blob, selectedFile.name);
      alert('Word файл сохранен!');
    } else if (selectedFile.type === 'txt') {
      const text = selectedFile.wordContent?.map(block => block.content).join('\n') || '';
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, selectedFile.name);
      alert('TXT файл сохранен!');
    } else if (selectedFile.type === 'excel') {
      const blob = await saveExcelToBlob(selectedFile.excelData || [], selectedFile.excelHeaders || []);
      saveAs(blob, selectedFile.name);
      alert('Excel файл сохранен!');
    } else if (selectedFile.type === 'powerpoint') {
      const blob = await savePowerPointToBlob(selectedFile.slides || []);
      saveAs(blob, selectedFile.name);
      alert('PowerPoint презентация сохранена!');
    }
  };

  // Сохранение файла на сервер
  const saveFileToServer = async () => {
    if (!selectedFile) {
      alert('Нет открытого файла для сохранения');
      return;
    }
    await uploadSingleFile(selectedFile);
  };

  // Сохранение файла
  const saveFile = async () => {
    if (!selectedFile) {
      alert('Нет открытого файла для сохранения');
      return;
    }
    const action = await showFileDialog('save');
    if (action === 'device') {
      await saveFileToDevice();
    } else if (action === 'server') {
      await saveFileToServer();
    }
  };

  // Открытие файла
  const handleOpenClick = async () => {
    const action = await showFileDialog('open');
    if (action === 'device') {
      fileInputRef.current?.click();
    } else if (action === 'server') {
      setShowServerFiles(true);
    }
  };

  const showFileDialog = (type: 'open' | 'save'): Promise<FileDialogAction> => {
    return new Promise((resolve) => setPendingFileAction({ type, callback: resolve }));
  };

  const handleFileDialogResponse = (action: FileDialogAction) => {
    if (pendingFileAction) {
      pendingFileAction.callback(action);
      setPendingFileAction(null);
    }
  };

  const handleViewModeToggle = () => {
    setViewMode(viewMode === 'view' ? 'edit' : 'view');
  };

  const handleFileOpen = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверяем, является ли файл ZIP архивом
    if (file.name.endsWith('.zip')) {
      try {
        const extractedFiles = await extractZipFile(file);
        setExtractedFilesFromZip(extractedFiles);
        setShowZipFileSelector(true);
      } catch (error) {
        alert('Ошибка распаковки ZIP архива');
      }
      return;
    }

    const fileType = getFileTypeFromName(file.name);
    const content = await readFileContent(file, fileType);

    let wordContent: ContentBlock[] | undefined;
    let wordImages: ImageItem[] | undefined;

    if (fileType === 'word') {
      wordContent = convertHtmlToBlocks(content.text || '<p></p>');
      wordImages = [];
    }

    const newFile: OfficeFile = {
      id: Date.now().toString(),
      name: file.name,
      type: fileType,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
      wordContent: wordContent,
      wordImages: wordImages
    };

    if (fileType === 'powerpoint' && content.slides) newFile.slides = content.slides;
    if (fileType === 'excel' && content.data) {
      const { data, headers } = parseExcelData(content.data);
      newFile.excelData = data;
      newFile.excelHeaders = headers;
    }

    const updatedFiles = [...files, newFile];
    setFiles(updatedFiles);
    setSelectedFile(newFile);
    saveFilesToStorage();
  };

  const readFileContent = async (file: File, type: FileType): Promise<any> => {
    if (type === 'word') {
      const arrayBuffer = await file.arrayBuffer();
      try {
        const result = await mammoth.extractRawText({ arrayBuffer });
        const htmlContent = `<p>${result.value.replace(/\n/g, '<br/>')}</p>`;
        return { text: htmlContent, rawData: arrayBuffer };
      } catch {
        return { text: `<p>Ошибка чтения Word файла: ${file.name}</p>`, rawData: arrayBuffer };
      }
    } else if (type === 'excel') {
      const arrayBuffer = await file.arrayBuffer();
      return { workbook: XLSX.read(arrayBuffer, { type: 'array' }), data: arrayBuffer };
    } else {
      return {
        text: `PowerPoint презентация: ${file.name}`,
        slides: [
          {
            id: 1, title: 'Титульный слайд',
            elements: [{ id: 'text1', type: 'text', content: `Название: ${file.name}`, x: 200, y: 200, width: 500, height: 60, zIndex: 0, fontSize: 32, fontFamily: 'Arial', color: '#000000' }]
          },
          {
            id: 2, title: 'Содержание',
            elements: [{ id: 'text2', type: 'text', content: '1. Введение\n2. Основная часть\n3. Заключение', x: 200, y: 150, width: 500, height: 200, zIndex: 0, fontSize: 20, fontFamily: 'Arial', color: '#000000' }]
          },
          {
            id: 3, title: 'Заключение',
            elements: [{ id: 'text3', type: 'text', content: 'Спасибо за внимание!', x: 250, y: 250, width: 400, height: 60, zIndex: 0, fontSize: 28, fontFamily: 'Arial', color: '#000000' }]
          }
        ]
      };
    }
  };

  const parseExcelData = (data: ArrayBuffer): { data: any[][]; headers: string[] } => {
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json<any[]>(firstSheet, { header: 1 });

    if (jsonData.length > 0) {
      const headers = jsonData[0] as string[];
      const cellsData: any[][] = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row: any[] = [];
        for (let j = 0; j < headers.length; j++) {
          row.push({ value: (jsonData[i]?.[j] || '').toString() });
        }
        cellsData.push(row);
      }
      return { data: cellsData, headers };
    }
    return { data: [[{ value: '' }]], headers: ['A'] };
  };

  const createNewFile = (type: FileType) => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

    if (type === 'word') {
      const initialBlock: ContentBlock[] = [{
        index: 0,
        type: 'text',
        content: 'Новый документ Word',
        style: {
          fontFamily: 'Arial',
          fontSize: 14,
          bold: false,
          italic: false,
          alignment: 'left',
          color: '#000000',
          listType: null,
          listLevel: 0
        }
      }];

      const newFile: OfficeFile = {
        id: Date.now().toString(),
        name: `новый_документ_${timestamp}.docx`,
        type,
        content: { text: 'Новый документ Word' },
        createdAt: new Date(),
        updatedAt: new Date(),
        wordContent: initialBlock,
        wordImages: []
      };
      const updatedFiles = [...files, newFile];
      setFiles(updatedFiles);
      setSelectedFile(newFile);
      saveFilesToStorage();
    } else if (type === 'excel') {
      const newFile: OfficeFile = {
        id: Date.now().toString(),
        name: `новая_таблица_${timestamp}.xlsx`,
        type,
        content: { workbook: null },
        createdAt: new Date(),
        updatedAt: new Date(),
        excelData: [[{ value: '' }, { value: '' }], [{ value: '' }, { value: '' }]],
        excelHeaders: ['A', 'B']
      };
      const updatedFiles = [...files, newFile];
      setFiles(updatedFiles);
      setSelectedFile(newFile);
      saveFilesToStorage();
    } else if (type === 'powerpoint') {
      const initialSlides: Slide[] = [
        {
          id: 1, title: 'Титульный слайд',
          elements: [{ id: 't1', type: 'text', content: 'Название презентации', x: 200, y: 250, width: 400, height: 60, zIndex: 0, fontSize: 32, fontFamily: 'Arial', color: '#000000' }]
        },
        {
          id: 2, title: 'Слайд 2',
          elements: [{ id: 't2', type: 'text', content: 'Ваш текст здесь', x: 200, y: 250, width: 400, height: 60, zIndex: 0, fontSize: 24, fontFamily: 'Arial', color: '#000000' }]
        },
        {
          id: 3, title: 'Слайд 3',
          elements: [{ id: 't3', type: 'text', content: 'Заключение', x: 200, y: 250, width: 400, height: 60, zIndex: 0, fontSize: 28, fontFamily: 'Arial', color: '#000000' }]
        }
      ];
      const newFile: OfficeFile = {
        id: Date.now().toString(),
        name: `новая_презентация_${timestamp}.pptx`,
        type,
        content: { text: 'Новая презентация' },
        slides: initialSlides,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const updatedFiles = [...files, newFile];
      setFiles(updatedFiles);
      setSelectedFile(newFile);
      saveFilesToStorage();
    }
  };

  const handleRenameFile = (fileId: string, newName: string) => {
    const updatedFiles = files.map(file =>
      file.id === fileId ? { ...file, name: newName, updatedAt: new Date() } : file
    );
    setFiles(updatedFiles);
    if (selectedFile?.id === fileId) {
      setSelectedFile(prev => prev ? { ...prev, name: newName, updatedAt: new Date() } : null);
    }
    saveFilesToStorage();
  };

  const handleDeleteFile = (fileId: string) => {
    const updatedFiles = files.filter(file => file.id !== fileId);
    setFiles(updatedFiles);
    if (selectedFile?.id === fileId) {
      setSelectedFile(null);
    }
    saveFilesToStorage();
  };

  const handleSelectFile = (file: OfficeFile) => {
    setSelectedFile(file);
  };

  // Показать диалог выбора режима загрузки
  const showUploadSelectionDialog = (filesToUpload: OfficeFile[]) => {
    setUploadMode('single');
    setShowUploadDialog(true);
  };

  // Обработка загрузки с выбранным режимом
  const handleUploadWithMode = async () => {
    if (uploadMode === 'single' && selectedFile) {
      await uploadSingleFile(selectedFile);
    } else if (uploadMode === 'all') {
      const useZip = confirm('Загрузить все файлы одним архивом?\n\nOK - архивом\nОтмена - по отдельности');
      if (useZip) {
        await uploadFilesAsZip(files);
      } else {
        await uploadAllFiles();
      }
    }
    setShowUploadDialog(false);
  };

  const [showImageDialog, setShowImageDialog] = useState(false);
  const [pendingImageCallback, setPendingImageCallback] = useState<((imageUrl: string) => void) | null>(null);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  // Функция открытия диалога:
  const openImageInsertDialog = (onSelect: (imageUrl: string) => void) => {
    setPendingImageCallback(() => onSelect);
    setShowImageDialog(true);
    loadImagesFromServer();
  };

  // Функция загрузки изображений с сервера:
  const loadImagesFromServer = async () => {
    try {
      setIsLoadingImages(true);
      const response = await get('/get-images');
      if (response && response.data) {
        const imagesWithUrls = response.data.map((image: any) => ({
          ...image,
          url: image.url || `/uploads/${image.path.split('/').pop()}`
        }));
        setServerImages(imagesWithUrls);
      }
    } catch (error) {
      console.error('Ошибка загрузки изображений с сервера:', error);
    } finally {
      setIsLoadingImages(false);
    }
  };

  // Обработка выбора изображения с устройства:
  const handleImageFromDevice = () => {
    imageInputRef.current?.click();
  };


  // Обработка загрузки изображения с устройства:
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !pendingImageCallback) return;

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        pendingImageCallback(dataUrl);
        setPendingImageCallback(null);
        setShowImageDialog(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Ошибка загрузки изображения:', error);
      alert('Ошибка загрузки изображения');
    }

    event.target.value = '';
  };

  // Обработка выбора изображения с сервера:
  const handleImageFromServer = (imageUrl: string) => {
    if (pendingImageCallback) {
      pendingImageCallback(imageUrl);
      setPendingImageCallback(null);
      setShowImageDialog(false);
    }
  };

  const renderFileContent = () => {
    if (isLoadingFromUrl) {
      return (
        <div className="text-center py-20">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-lg text-gray-600">Загрузка файла по ссылке...</p>
        </div>
      );
    }

    if (urlError) {
      return (
        <div className="text-center py-20">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-lg text-red-600">{urlError}</p>
          <button
            onClick={() => {
              setUrlError(null);
              const url = new URL(window.location.href);
              url.searchParams.delete('share');
              router.replace(url.pathname, { scroll: false });
            }}
            className="mt-4 px-4 py-2 bg-main text-white rounded-lg hover:bg-main/80"
          >
            Вернуться в редактор
          </button>
        </div>
      );
    }

    if (!selectedFile) {
      return (
        <div className="text-center py-20 text-gray-400">
          <div className="text-6xl mb-4">📁</div>
          <p className="text-lg">Выберите или создайте файл</p>
          <p className="text-sm mt-2">Используйте кнопки выше для создания нового документа</p>
        </div>
      );
    }

    const openImageInsertDialog = (onSelect: (imageUrl: string) => void) => {
      setPendingImageCallback(() => onSelect);
      setShowImageDialog(true);
      loadImagesFromServer();
    };

    if (selectedFile.type === 'word' || selectedFile.type === 'txt') {
      return (
        <WordEditor
          initialContent={selectedFile.wordContent || []}
          initialImages={selectedFile.wordImages || []}
          viewMode={viewMode}
          onContentChange={handleWordContentChange}
          onInsertImage={(callback) => openImageInsertDialog(callback)}
        />
      );
    }

    if (selectedFile.type === 'excel') {
      return (
        <ExcelEditor
          initialData={selectedFile.excelData || [[{ value: '' }]]}
          initialHeaders={selectedFile.excelHeaders || ['A']}
          viewMode={viewMode}
          onDataChange={(data: ExcelCell[][]) => {
            const updatedFile = {
              ...selectedFile,
              excelData: data,
              updatedAt: new Date()
            };
            const updatedFiles = files.map(f =>
              f.id === selectedFile.id ? updatedFile : f
            );
            setFiles(updatedFiles);
            setSelectedFile(updatedFile);
            saveFilesToStorage();
          }}
        />
      );
    }

    if (selectedFile.type === 'powerpoint') {
      return (
        <PowerPointEditor
          initialSlides={selectedFile.slides || []}
          viewMode={viewMode}
          onSlidesChange={(slides) => {
            const updatedFile = {
              ...selectedFile,
              slides,
              updatedAt: new Date()
            };
            const updatedFiles = files.map(f =>
              f.id === selectedFile.id ? updatedFile : f
            );
            setFiles(updatedFiles);
            setSelectedFile(updatedFile);
            saveFilesToStorage();
          }}
        />
      );
    }

    return null;
  };

  // Компонент диалога выбора действия с файлом
  const FileActionDialog = () => {
    if (!pendingFileAction) return null;
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {pendingFileAction.type === 'open' ? 'Открыть файл' : 'Сохранить файл'}
          </h3>
          <p className="text-gray-600 mb-6">
            {pendingFileAction.type === 'open' ? 'Выберите источник для открытия файла:' : 'Выберите место для сохранения файла:'}
          </p>
          <div className="space-y-3">
            <button onClick={() => handleFileDialogResponse('device')} className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
              {pendingFileAction.type === 'open' ? 'С устройства' : 'На устройство'}
            </button>
            <button onClick={() => handleFileDialogResponse('server')} className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
              {pendingFileAction.type === 'open' ? 'С сервера' : 'На сервер'}
            </button>
            <button onClick={() => handleFileDialogResponse('cancel')} className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition">
              Отмена
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Компонент выбора изображений с сервера
  const ServerImagesDialog = () => {
    if (!showServerImagesDialog) return null;

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Выберите изображение с сервера</h3>
            <button
              onClick={() => {
                setShowServerImagesDialog(false);
                setSelectedImageCallback(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              ✖
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {serverImages.length === 0 ? (
              <div className="col-span-3 text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">🖼️</div>
                <p>Нет изображений на сервере</p>
              </div>
            ) : (
              serverImages.map((image) => (
                <div
                  key={image.id}
                  className="border rounded-lg p-2 cursor-pointer hover:border-blue-500 transition"
                  onClick={() => insertServerImage(image.url || image.path)}
                >
                  <img
                    src={image.url || image.path}
                    alt={image.original_name}
                    className="w-full h-32 object-cover rounded mb-2"
                  />
                  <div className="text-xs text-gray-600 truncate">{image.original_name}</div>
                  <div className="text-xs text-gray-400">
                    {Math.round(image.size / 1024)} KB
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  // Компонент диалога загрузки на сервер
  const UploadDialog = () => {
    if (!showUploadDialog) return null;

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Выберите режим загрузки</h3>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Выберите, какие файлы загрузить на сервер:
            </p>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="uploadMode"
                  value="single"
                  checked={uploadMode === 'single'}
                  onChange={(e) => setUploadMode(e.target.value as UploadMode)}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium">Только текущий файл</div>
                  <div className="text-xs text-gray-500">
                    {selectedFile?.name || 'Не выбран'}
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="uploadMode"
                  value="all"
                  checked={uploadMode === 'all'}
                  onChange={(e) => setUploadMode(e.target.value as UploadMode)}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium">Все файлы</div>
                  <div className="text-xs text-gray-500">
                    {files.length} файлов
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleUploadWithMode}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
            >
              Загрузить
            </button>
            <button
              onClick={() => {
                setShowUploadDialog(false);
              }}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Компонент списка файлов на сервере
  const ServerFilesDialog = () => {
    if (!showServerFiles) return null;

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Файлы на сервере</h3>
            <button
              onClick={() => setShowServerFiles(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✖
            </button>
          </div>

          <div className="space-y-2">
            {serverFiles.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">☁️</div>
                <p>Нет файлов на сервере</p>
              </div>
            ) : (
              serverFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="font-medium">{file.original_name}</div>
                    <div className="text-xs text-gray-500">
                      {Math.round(file.size / 1024)} KB • {new Date(file.created_at).toLocaleString('ru-RU')}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openFileFromServer(file.id, file.original_name)}
                      className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition"
                    >
                      📂 Открыть
                    </button>
                    <button
                      onClick={() => downloadFromServer(file.id, file.original_name)}
                      className="px-3 py-1 text-green-600 hover:bg-green-50 rounded transition"
                    >
                      📥 Скачать
                    </button>
                    <button
                      onClick={() => deleteFromServer(file.id)}
                      className="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition"
                    >
                      🗑️ Удалить
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  // Компонент выбора файлов из ZIP
  const ZipFileSelector = () => {
    if (!showZipFileSelector || extractedFilesFromZip.length === 0) return null;

    const [selectedZipFiles, setSelectedZipFiles] = useState<Set<string>>(new Set());

    const toggleFile = (fileName: string) => {
      const newSelected = new Set(selectedZipFiles);
      if (newSelected.has(fileName)) {
        newSelected.delete(fileName);
      } else {
        newSelected.add(fileName);
      }
      setSelectedZipFiles(newSelected);
    };

    const handleConfirm = async () => {
      const selected = extractedFilesFromZip.filter(f => selectedZipFiles.has(f.name));
      await handleAddSelectedFromZip(selected);
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
              onClick={() => {
                setShowZipFileSelector(false);
                setExtractedFilesFromZip([]);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              ✖
            </button>
          </div>

          <div className="flex-1 overflow-y-auto mb-4">
            <div className="space-y-2">
              {extractedFilesFromZip.map((file) => (
                <div
                  key={file.name}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${selectedZipFiles.has(file.name)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  onClick={() => toggleFile(file.name)}
                >
                  <input
                    type="checkbox"
                    checked={selectedZipFiles.has(file.name)}
                    onChange={() => { }}
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
              disabled={selectedZipFiles.size === 0}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Добавить ({selectedZipFiles.size})
            </button>
            <button
              onClick={() => {
                setShowZipFileSelector(false);
                setExtractedFilesFromZip([]);
              }}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Компонент индикатора распаковки ZIP
  const ZipExtractProgress = () => {
    if (!isExtractingZip) return null;

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 text-center min-w-[300px]">
          <div className="text-4xl mb-4">📦</div>
          <p className="text-lg font-medium mb-2">Распаковка архива...</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${zipExtractProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500">{Math.round(zipExtractProgress)}%</p>
        </div>
      </div>
    );
  };

  // Компонент индикатора загрузки
  const UploadProgress = () => {
    if (!isUploading) return null;

    return (
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl p-4 w-80 z-50">
        <div className="text-sm font-medium text-gray-700 mb-2">
          Загрузка на сервер...
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-2 text-right">
          {Math.round(uploadProgress)}%
        </div>
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-[1400px] mx-auto p-6">
          {/* Header with Help Buttons */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Редактор документов</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setHelpType('main')}
                className="px-3 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 transition"
              >
                Общая помощь
              </button>
              <button
                onClick={() => setHelpType('word')}
                className="px-3 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 transition"
              >
                📝 Помощь по Word
              </button>
              <button
                onClick={() => setHelpType('excel')}
                className="px-3 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 transition"
              >
                📊 Помощь по Excel
              </button>
              <button
                onClick={() => setHelpType('powerpoint')}
                className="px-3 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 transition"
              >
                📽️ Помощь по PowerPoint
              </button>
            </div>
          </div>

          {/* Help Panel */}
          {helpType && (
            <HelpPanel
              type={helpType}
              onClose={() => setHelpType(null)}
            />
          )}

          {/* Action Buttons */}
          <div className="bg-white rounded-xl shadow-lg mb-6 p-4 flex flex-wrap gap-2">
            <button
              onClick={handleOpenClick}
              className="px-4 py-2 text-main border-2 uppercase font-medium hover:bg-main hover:text-white rounded-lg transition"
            >
              Открыть
            </button>
            <button
              onClick={() => createNewFile('word')}
              className="px-4 py-2 text-main border-2 uppercase font-medium hover:bg-main hover:text-white rounded-lg transition"
            >
              Новый документ
            </button>
            <button
              onClick={() => createNewFile('excel')}
              className="px-4 py-2 text-main border-2 uppercase font-medium hover:bg-main hover:text-white rounded-lg transition"
            >
              Новая таблица
            </button>
            <button
              onClick={() => createNewFile('powerpoint')}
              className="px-4 py-2 text-main border-2 uppercase font-medium hover:bg-main hover:text-white rounded-lg transition"
            >
              Новая презентация
            </button>
            <button
              onClick={saveFile}
              className="px-4 py-2 text-main border-2 uppercase font-medium hover:bg-main hover:text-white rounded-lg transition"
            >
              Сохранить
            </button>
            <button
              onClick={handleViewModeToggle}
              className="px-4 py-2 text-main border-2 uppercase font-medium hover:bg-main hover:text-white rounded-lg transition"
            >
              {viewMode === 'view' ? 'Режим правки' : 'Режим просмотра'}
            </button>
            {selectedFile && (
              <button
                onClick={() => generateShareLink(selectedFile)}
                className="px-4 py-2 text-green-600 border-2 border-green-600 uppercase font-medium hover:bg-green-600 hover:text-white rounded-lg transition"
              >
                🔗 Поделиться
              </button>
            )}

            {user && (
              <>
                <button
                  onClick={() => selectedFile && showUploadSelectionDialog([selectedFile])}
                  className="px-4 py-2 text-blue-600 border-2 border-blue-600 uppercase font-medium hover:bg-blue-600 hover:text-white rounded-lg transition"
                >
                  ☁️ Загрузить файл
                </button>
                <button
                  onClick={() => files.length > 0 && showUploadSelectionDialog(files)}
                  className="px-4 py-2 text-purple-600 border-2 border-purple-600 uppercase font-medium hover:bg-purple-600 hover:text-white rounded-lg transition"
                >
                  📦 Загрузить всё
                </button>
                <button
                  onClick={() => setShowServerFiles(true)}
                  className="px-4 py-2 text-orange-600 border-2 border-orange-600 uppercase font-medium hover:bg-orange-600 hover:text-white rounded-lg transition"
                >
                  ☁️ Мои файлы
                </button>
              </>
            )}
          </div>

          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
            onChange={handleFileOpen}
            className="hidden"
          />

          {/* File List */}
          <FileList
            files={files}
            selectedFileId={selectedFile?.id || null}
            onSelectFile={handleSelectFile}
            onRenameFile={handleRenameFile}
            onDeleteFile={handleDeleteFile}
            className="mb-6"
          />

          {/* Editor Area */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-sm text-gray-500 mb-3 pb-2 border-b flex justify-between items-center">
              <div>
                {selectedFile ? (
                  <>
                    {selectedFile.name}
                    <span className="ml-2 text-gray-400">
                      ({viewMode === 'edit' ? 'режим правки' : 'режим просмотра'})
                    </span>
                    <span className="ml-2 text-xs text-gray-400">
                      {selectedFile.type === 'word' && '📝 Текстовый документ'}
                      {selectedFile.type === 'excel' && '📊 Электронная таблица'}
                      {selectedFile.type === 'powerpoint' && '📽️ Презентация'}
                    </span>
                    {selectedFile.serverId && (
                      <span className="ml-2 text-xs text-blue-500">☁️ на сервере</span>
                    )}
                  </>
                ) : 'Нет открытого файла'}
              </div>
              {selectedFile && (
                <div className="text-xs text-gray-400">
                  Создан: {new Date(selectedFile.createdAt).toLocaleString('ru-RU')}
                </div>
              )}
            </div>
            {renderFileContent()}
          </div>
        </div>
      </div>

      {/* Модальные окна */}
      <FileActionDialog />
      <ServerFilesDialog />
      <ServerImagesDialog />
      <UploadDialog />
      <ZipFileSelector />
      <ZipExtractProgress />
      <UploadProgress />
    </MainLayout>
  );
}
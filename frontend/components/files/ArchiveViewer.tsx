'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/authContext';
import {
    Download, X, Loader2, Archive, Eye,
    FileText, FileSpreadsheet, Presentation, Image as ImageIcon, Copy
} from 'lucide-react';
import JSZip from 'jszip';
import mammoth from 'mammoth';

// Переименовываем импортированный File чтобы избежать конфликта
import { File as FileIcon } from 'lucide-react';
import { NEXT_PUBLIC_API_URL } from '@/lib/axios.config';

interface ArchiveViewerProps {
    archive: any;
    onClose: () => void;
    onFileOpen: (file: any) => void;
    onFileExtracted?: (newFile: any) => void;
}

export default function ArchiveViewer({ archive, onClose, onFileOpen, onFileExtracted }: ArchiveViewerProps) {
    const auth = useAuth();
    const { user, get, post } = auth || {};
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [extractingId, setExtractingId] = useState<string | null>(null);
    const [archiveBlob, setArchiveBlob] = useState<Blob | null>(null);

    useEffect(() => {
        loadArchiveContents();
    }, [archive.id]);

    const getFileIcon = (type: string) => {
        switch (type) {
            case 'image': return <ImageIcon size={20} className="text-main" />;
            case 'word': return <FileText size={20} className="text-blue-500" />;
            case 'excel': return <FileSpreadsheet size={20} className="text-green-500" />;
            case 'powerpoint': return <Presentation size={20} className="text-orange-500" />;
            default: return <FileIcon size={20} className="text-gray-500" />;
        }
    };

    const getMimeType = (extension: string): string => {
        const mimeTypes: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'bmp': 'image/bmp',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'doc': 'application/msword',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'xls': 'application/vnd.ms-excel',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'ppt': 'application/vnd.ms-powerpoint',
            'pdf': 'application/pdf',
            'txt': 'text/plain',
            'csv': 'text/csv',
            'json': 'application/json',
            'xml': 'application/xml',
        };
        return mimeTypes[extension] || 'application/octet-stream';
    };

    const getFileTypeFromExtension = (extension: string): string => {
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) return 'image';
        if (['doc', 'docx'].includes(extension)) return 'word';
        if (['xls', 'xlsx'].includes(extension)) return 'excel';
        if (['ppt', 'pptx'].includes(extension)) return 'powerpoint';
        if (['pdf'].includes(extension)) return 'pdf';
        if (['txt', 'csv', 'json', 'xml', 'html', 'css', 'js'].includes(extension)) return 'text';
        return 'unknown';
    };

    const readFileContent = async (zipEntry: any, fileName: string, extension: string): Promise<any> => {
        try {
            const blob = await zipEntry.async('blob');
            const mimeType = getMimeType(extension);
            const fileType = getFileTypeFromExtension(extension);

            // Для изображений - конвертируем в base64 для отображения
            if (fileType === 'image') {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        let base64 = reader.result as string;
                        // Исправляем mime type если нужно
                        if (base64.startsWith('data:application/octet-stream')) {
                            base64 = base64.replace('data:application/octet-stream', `data:${mimeType}`);
                        }
                        resolve({
                            type: fileType,
                            content: base64,
                            blob: blob,
                            original_name: fileName,
                            mime_type: mimeType
                        });
                    };
                    reader.onerror = () => {
                        resolve({
                            type: fileType,
                            content: null,
                            blob: blob,
                            original_name: fileName,
                            mime_type: mimeType
                        });
                    };
                    reader.readAsDataURL(blob);
                });
            }

            // Для PDF
            if (fileType === 'pdf') {
                const pdfUrl = URL.createObjectURL(blob);
                return {
                    type: fileType,
                    content: pdfUrl,
                    blob: blob,
                    original_name: fileName,
                    mime_type: mimeType
                };
            }

            // Для DOCX - используем mammoth для извлечения HTML
            if (extension === 'docx') {
                try {
                    const arrayBuffer = await blob.arrayBuffer();
                    const result = await mammoth.convertToHtml({ arrayBuffer });
                    const htmlContent = result.value || `<p>${fileName}</p>`;
                    return {
                        type: fileType,
                        content: htmlContent,  // HTML для отображения
                        blob: blob,
                        original_name: fileName,
                        mime_type: mimeType,
                        file_type: fileType  // Добавляем file_type
                    };
                } catch (error) {
                    console.error('DOCX parsing error:', error);
                    return {
                        type: fileType,
                        content: `<p>${fileName}</p><p>Не удалось загрузить содержимое документа.</p>`,
                        blob: blob,
                        original_name: fileName,
                        mime_type: mimeType,
                        file_type: fileType
                    };
                }
            }

            // Для XLSX
            if (extension === 'xlsx') {
                try {
                    const arrayBuffer = await blob.arrayBuffer();
                    // Используем библиотеку для парсинга XLSX
                    const XLSX = await import('xlsx');
                    const workbook = XLSX.read(arrayBuffer);
                    const htmlContent = XLSX.utils.sheet_to_html(workbook.Sheets[workbook.SheetNames[0]]);
                    return {
                        type: fileType,
                        content: htmlContent,
                        blob: blob,
                        original_name: fileName,
                        mime_type: mimeType,
                        file_type: fileType
                    };
                } catch (error) {
                    console.error('XLSX parsing error:', error);
                    return {
                        type: fileType,
                        content: `<p>${fileName}</p><p>Не удалось загрузить содержимое таблицы.</p>`,
                        blob: blob,
                        original_name: fileName,
                        mime_type: mimeType,
                        file_type: fileType
                    };
                }
            }

            // Для текстовых файлов
            if (fileType === 'text') {
                const text = await blob.text();
                return {
                    type: fileType,
                    content: text,
                    blob: blob,
                    original_name: fileName,
                    mime_type: mimeType
                };
            }

            // Для остальных типов - возвращаем blob
            return {
                type: fileType,
                content: blob,
                blob: blob,
                original_name: fileName,
                mime_type: mimeType
            };
        } catch (error) {
            console.error('Error reading file:', error);
            return null;
        }
    };

    const loadArchiveContents = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');

            // 1. Сначала проверяем, что это действительно архив
            const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/files/download/${archive.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/zip,application/octet-stream,*/*',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // 2. Получаем blob и проверяем его тип
            const blob = await response.blob();

            // Проверяем, что blob не пустой
            if (blob.size === 0) {
                throw new Error('Получен пустой файл');
            }

            // 3. Проверяем MIME тип
            const contentType = response.headers.get('content-type') || '';
            console.log('Content-Type:', contentType);

            // 4. Пробуем загрузить как ZIP
            try {
                const zip = await JSZip.loadAsync(blob, {
                    // Добавляем опции для совместимости
                    createFolders: false,
                    checkCRC32: true,
                });

                setArchiveBlob(blob);
                const archiveFiles: any[] = [];

                zip.forEach((relativePath, zipEntry) => {
                    if (zipEntry.dir) return;

                    const extension = relativePath.split('.').pop()?.toLowerCase() || '';
                    const fileType = getFileTypeFromExtension(extension);

                    archiveFiles.push({
                        name: relativePath,
                        type: fileType,
                        extension: extension,
                        zipEntry: zipEntry
                    });
                });

                archiveFiles.sort((a, b) => a.name.localeCompare(b.name));
                setFiles(archiveFiles);

                console.log(`✅ Архив успешно загружен, найдено ${archiveFiles.length} файлов`);

            } catch (zipError: any) {
                console.error('ZIP parsing error:', zipError);

                // 5. Если не удалось открыть как ZIP, проверяем другие форматы
                if (zipError.message.includes('end of central directory')) {
                    // Пробуем как RAR или другой архивный формат
                    alert('Этот формат архива не поддерживается. Пожалуйста, используйте ZIP формат.');
                } else if (zipError.message.includes('Corrupted zip')) {
                    alert('Архив поврежден или имеет неверный формат.');
                } else {
                    alert(`Ошибка чтения архива: ${zipError.message}`);
                }

                setFiles([]);
            }

        } catch (error: any) {
            console.error('Error loading archive:', error);

            if (error.message.includes('404')) {
                alert('Файл архива не найден на сервере');
            } else if (error.message.includes('401') || error.message.includes('403')) {
                alert('Ошибка авторизации при загрузке архива');
            } else {
                alert(`Ошибка загрузки архива: ${error.message}`);
            }

            setFiles([]);
        } finally {
            setLoading(false);
        }
    };
    const extractAndOpenFile = async (file: any) => {
        setExtractingId(file.name);
        try {
            const fileContent = await readFileContent(file.zipEntry, file.name, file.extension);

            if (fileContent) {
                const fileToOpen = {
                    id: `temp_${Date.now()}_${Math.random()}`,  
                    original_name: file.name,
                    file_type: file.type,
                    mime_type: fileContent.mime_type,
                    size: fileContent.blob?.size || 0,
                    content: fileContent.content,     
                    blob: fileContent.blob,           
                    is_temp: true,                     
                    from_archive: true,               
                    archive_id: archive.id
                };

                // Сначала закрываем архив
                onClose();

                // Затем открываем файл через onFileOpen
                setTimeout(() => {
                    onFileOpen(fileToOpen);
                }, 100);
            } else {
                alert('Не удалось открыть этот файл');
            }
        } catch (error) {
            console.error('Error extracting file:', error);
            alert('Ошибка при извлечении файла');
        } finally {
            setExtractingId(null);
        }
    };

    const previewFile = async (file: any) => {
        setExtractingId(file.name);
        try {
            const fileContent = await readFileContent(file.zipEntry, file.name, file.extension);

            if (fileContent) {
                const fileToPreview = {
                    id: `preview_${Date.now()}_${Math.random()}`,
                    original_name: file.name,
                    file_type: file.type,
                    path: null,
                    mime_type: fileContent.mime_type,
                    size: fileContent.blob?.size || 0,
                    content: fileContent.content,
                    blob: fileContent.blob,
                    is_preview: true,
                    from_archive: true,
                    archive_id: archive.id
                };

                onFileOpen(fileToPreview);
            } else {
                alert('Не удалось открыть этот файл для просмотра');
            }
        } catch (error) {
            console.error('Error previewing file:', error);
            alert('Ошибка при предпросмотре файла');
        } finally {
            setExtractingId(null);
        }
    };

    const downloadFile = async (file: any) => {
        try {
            const blob = await file.zipEntry.async('blob');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading file:', error);
        }
    };

    // Форматирование размера файла (приблизительное)
    const formatFileSize = (zipEntry: any) => {
        if (zipEntry._data && zipEntry._data.uncompressedSize) {
            const size = zipEntry._data.uncompressedSize;
            if (size < 1024) return `${size} B`;
            if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
            return `${(size / (1024 * 1024)).toFixed(1)} MB`;
        }
        return '';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-3/4 h-3/4 flex flex-col shadow-xl">
                <div className="border-b p-4 flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <div className="flex items-center gap-2">
                        <Archive size={24} className="text-main" />
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800">{archive.original_name}</h2>
                            <p className="text-sm text-gray-500">{files.length} файлов в архиве</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="animate-spin text-blue-500" size={48} />
                        </div>
                    ) : files.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                            <FileIcon size={48} className="mx-auto mb-2 opacity-50" />
                            <p>Архив пуст</p>
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            {files.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {getFileIcon(file.type)}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-800 truncate">{file.name}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>{file.type || 'unknown'}</span>
                                                {file.extension && <span>• {file.extension.toUpperCase()}</span>}
                                                {formatFileSize(file.zipEntry) && <span>• {formatFileSize(file.zipEntry)}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => previewFile(file)}
                                            disabled={extractingId === file.name}
                                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm flex items-center gap-2 transition-colors"
                                            title="Предпросмотр"
                                        >
                                            {extractingId === file.name ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                                            Просмотр
                                        </button>
                                        <button
                                            onClick={() => extractAndOpenFile(file)}
                                            disabled={extractingId === file.name}
                                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm flex items-center gap-2 transition-colors"
                                            title="Извлечь и открыть"
                                        >
                                            <Copy size={14} />
                                            Извлечь
                                        </button>
                                        <button
                                            onClick={() => downloadFile(file)}
                                            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm flex items-center gap-2 transition-colors"
                                            title="Скачать"
                                        >
                                            <Download size={14} />
                                            Скачать
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="border-t p-3 bg-gray-50 text-xs text-gray-500 rounded-b-lg">
                    <p>💡 Для просмотра файла нажмите "Просмотр". Для редактирования - "Извлечь" (создаст копию файла). Оригинальный архив остается неизменным.</p>
                </div>
            </div>
        </div>
    );
}
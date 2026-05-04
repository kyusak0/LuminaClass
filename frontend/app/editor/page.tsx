'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/authContext';
import FileList from '@/components/files/FileList';
import FileEditor from '@/components/files/FileEditor';
import FileUploader from '@/components/files/FileUploader';
import ArchiveViewer from '@/components/files/ArchiveViewer';
import { ChevronLeft, ChevronRight, Menu, Trash2 } from 'lucide-react';
import MainLayout from '@/layouts/MainLayout';
import { notFound } from 'next/navigation';

interface TempFile {
    id: string;
    original_name: string;
    file_type: string;
    mime_type: string;
    size: number;
    content: any;
    blob?: Blob;
    is_temp: boolean;
    created_at: string;
}

export default function FilesPage() {
    const auth = useAuth();
    if (!auth) return null;
    const { user, get, post, loading: authLoading } = auth;
    const [files, setFiles] = useState<any[]>([]);
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [isArchiveViewerOpen, setIsArchiveViewerOpen] = useState(false);
    const [currentArchive, setCurrentArchive] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [tempFiles, setTempFiles] = useState<TempFile[]>([]);

    useEffect(() => {
        loadFiles();
        // Загружаем состояние панели из localStorage
        const savedState = localStorage.getItem('sidebar_files_open');
        if (savedState !== null) {
            setIsSidebarOpen(savedState === 'true');
        }

        // Очищаем временные файлы при закрытии страницы
        return () => {
            cleanupTempFiles();
        };
    }, []);

    const cleanupTempFiles = useCallback(async () => {
        // Удаляем все временные файлы с сервера
        for (const tempFile of tempFiles) {
            if (tempFile.id && !tempFile.id.startsWith('temp_')) {
                try {
                    await post('/delete-temp-file', { file_id: tempFile.id });
                } catch (error) {
                    console.error('Error deleting temp file:', error);
                }
            }
        }
        setTempFiles([]);
    }, [tempFiles, post]);

    const loadFiles = async () => {
        setLoading(true);
        try {
            const response = await get('/get-files');
            if (response && response.data) {
                const filesWithType = response.data.map((file: any) => ({
                    ...file,
                    is_archive: file.mime_type === 'application/zip' ||
                        file.mime_type === 'application/x-rar-compressed',
                    file_type: getFileTypeFromMime(file.mime_type, file.original_name)
                }));
                setFiles(filesWithType);
            }
        } catch (error) {
            console.error('Error loading files:', error);
        }
        setLoading(false);
    };

    const getFileTypeFromMime = (mimeType: string, fileName: string) => {
        const extension = fileName.split('.').pop()?.toLowerCase();

        if (mimeType?.startsWith('image/')) return 'image';
        if (mimeType?.includes('word') || extension === 'doc' || extension === 'docx') return 'word';
        if (mimeType?.includes('excel') || extension === 'xls' || extension === 'xlsx') return 'excel';
        if (mimeType?.includes('presentation') || extension === 'ppt' || extension === 'pptx') return 'powerpoint';
        if (mimeType?.includes('text') || extension === 'txt') return 'text';
        if (mimeType?.includes('zip') || extension === 'zip' || extension === 'rar') return 'archive';
        return 'unknown';
    };

    const handleFileSelect = (file: any) => {
        if (file.is_archive) {
            setCurrentArchive(file);
            setIsArchiveViewerOpen(true);
        } else {
            setSelectedFile(file);
        }
    };

    const handleFileSave = async (fileId: number | string, content: any, isTemp: boolean = false) => {
        if (isTemp) {
            // Для временных файлов просто обновляем локальное состояние
            setTempFiles(prev => prev.map(f =>
                f.id === fileId ? { ...f, content, saved: true } : f
            ));
            return { success: true, isTemp: true };
        }

        const formData = new FormData();
        const blob = new Blob([JSON.stringify(content)], { type: 'application/json' });
        formData.append('file', blob, `content_${fileId}.json`);
        formData.append('author_id', user.id);

        const result = await post('/save-file', formData);
        if (result && result.message) {
            await loadFiles();
            return { success: true };
        }
        return { success: false };
    };

    const handleSaveAsPermanent = async (tempFile: TempFile) => {
        try {
            // Создаём постоянный файл из временного
            const formData = new FormData();

            let blobToUpload: Blob;
            let mimeType = tempFile.mime_type || 'application/octet-stream';
            let fileName = tempFile.original_name.replace('_temp_', '_');

            if (tempFile.blob) {
                blobToUpload = tempFile.blob;
            } else if (tempFile.content) {
                if (typeof tempFile.content === 'string') {
                    blobToUpload = new Blob([tempFile.content], { type: mimeType });
                } else {
                    blobToUpload = new Blob([JSON.stringify(tempFile.content)], { type: 'application/json' });
                }
            } else {
                throw new Error('No content to save');
            }

            const fileToUpload = new File([blobToUpload], fileName, { type: mimeType });
            formData.append('file', fileToUpload);
            formData.append('author_id', user.id);

            const result = await post('/save-file', formData);

            if (result && result.file_id) {
                setTempFiles(prev => prev.filter(f => f.id !== tempFile.id));
                await loadFiles();
                setSelectedFile(null);
                alert('Файл успешно сохранён!');
                return { success: true };
            }
            return { success: false };
        } catch (error) {
            console.error('Error saving permanent file:', error);
            alert('Ошибка при сохранении файла');
            return { success: false };
        }
    };

    const discardTempFile = (tempFileId: string) => {
        setTempFiles(prev => prev.filter(f => f.id !== tempFileId));
        if (selectedFile?.id === tempFileId) {
            setSelectedFile(null);
        }
    };

    const toggleSidebar = () => {
        const newState = !isSidebarOpen;
        setIsSidebarOpen(newState);
        localStorage.setItem('sidebar_files_open', String(newState));
    };

    const handleFileExtracted = (newFile: any) => {
        // Создаём временный файл
        const tempFile: TempFile = {
            id: newFile.id || `temp_${Date.now()}_${Math.random()}`,
            original_name: newFile.original_name,
            file_type: newFile.file_type,
            mime_type: newFile.mime_type,
            size: newFile.size || 0,
            content: newFile.content,
            blob: newFile.blob,
            is_temp: true,
            created_at: new Date().toISOString()
        };

        // Добавляем в список временных файлов
        setTempFiles(prev => [tempFile, ...prev]);

        // Открываем файл для редактирования
        setSelectedFile(tempFile);
    };

    // Объединяем постоянные и временные файлы для отображения
    const allFiles = [...tempFiles, ...files];

    if (!authLoading && !user) {
        return notFound()
    }

    return (
        <MainLayout>
            <div className="flex max-lg:flex-col lg:h-[90vh] bg-gray-100">
                {/* Sidebar */}
                <div
                    className={`max-lg:fixed bg-white border-r transition-all duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'w-80' : 'w-12'
                        }`}
                >
                    <div className="border-b p-2 flex items-center justify-between">
                        {isSidebarOpen && (
                            <h2 className="font-semibold text-gray-700 px-2">Файлы</h2>
                        )}
                        <button
                            onClick={toggleSidebar}
                            className={`p-1.5 hover:bg-gray-100 rounded transition-colors ${!isSidebarOpen ? 'mx-auto' : ''
                                }`}
                            title={isSidebarOpen ? 'Скрыть' : 'Развернуть'}
                        >
                            {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                        </button>
                    </div>

                    {isSidebarOpen && (
                        <FileUploader onUpload={loadFiles} userId={user?.id} />
                    )}

                    {isSidebarOpen && tempFiles.length > 0 && (
                        <div className="border-b border-yellow-200 bg-yellow-50 p-2">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-semibold text-yellow-800 flex items-center gap-1">
                                    <span>📝</span> Временные файлы
                                </h3>
                                <button
                                    onClick={cleanupTempFiles}
                                    className="text-xs text-yellow-600 hover:text-yellow-800"
                                    title="Очистить все временные файлы"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <div className="space-y-1">
                                {tempFiles.map(tempFile => (
                                    <div
                                        key={tempFile.id}
                                        className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-yellow-100 transition-colors ${selectedFile?.id === tempFile.id ? 'bg-yellow-200' : ''
                                            }`}
                                        onClick={() => setSelectedFile(tempFile)}
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <div className="text-sm">
                                                {tempFile.file_type === 'image' && '🖼️'}
                                                {tempFile.file_type === 'word' && '📝'}
                                                {tempFile.file_type === 'excel' && '📊'}
                                                {tempFile.file_type === 'powerpoint' && '📽️'}
                                                {tempFile.file_type === 'text' && '📃'}
                                                {!tempFile.file_type && '📄'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-800 truncate">
                                                    {tempFile.original_name}
                                                </p>
                                                <p className="text-xs text-yellow-600">Временный файл</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                discardTempFile(tempFile.id);
                                            }}
                                            className="text-red-500 hover:text-red-700 p-1"
                                            title="Отменить"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {isSidebarOpen ? (
                        <div className="flex-1 overflow-auto">
                            <FileList
                                files={allFiles}
                                onSelect={handleFileSelect}
                                onFilesUpdate={loadFiles}
                                selectedId={selectedFile?.id}
                                loading={loading}
                            />
                        </div>
                    ) : (
                        <div className="flex-1 overflow-auto py-4">
                            <div className="flex flex-col items-center gap-4">
                                <button
                                    onClick={() => {
                                        setIsSidebarOpen(true);
                                        localStorage.setItem('sidebar_files_open', 'true');
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                                    title="Show files"
                                >
                                    <Menu size={20} />
                                </button>
                                <div className="text-xs text-gray-400 writing-mode-vertical">
                                    Файлы
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Editor Area */}
                <div className="flex-1">
                    {selectedFile && (
                        <FileEditor
                            file={selectedFile}
                            onSave={handleFileSave}
                            onClose={() => setSelectedFile(null)}
                            userId={user?.id}
                            {...(selectedFile.is_temp && {
                                onSaveAsPermanent: (() => handleSaveAsPermanent(selectedFile)) as any,
                                onDiscard: (() => discardTempFile(selectedFile.id)) as any
                            })}
                        />
                    )}
                    {!selectedFile && (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            <div className="text-center">
                                <div className="text-6xl mb-4">📁</div>
                                <p>Выберите файл для просмотра или редактирования</p>
                                <p className="text-sm mt-2">Временные файлы из архивов будут автоматически удалены при закрытии</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Archive Viewer */}
                {isArchiveViewerOpen && currentArchive && (
                    <ArchiveViewer
                        archive={currentArchive}
                        onClose={() => {
                            setIsArchiveViewerOpen(false);
                            setCurrentArchive(null);
                        }}
                        onFileOpen={handleFileExtracted}
                    />
                )}
            </div>
        </MainLayout>
    );
}
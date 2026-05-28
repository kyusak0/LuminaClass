'use client';

import {
    FileText, FileSpreadsheet, Presentation, FileArchive,
    File, Loader2, Download, Trash2, CheckSquare, Square,
    Archive, Plus, Image, X
} from 'lucide-react';
import { useAuth } from '@/context/authContext';
import { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import CreateFileModal from './NewFileCreator';
import { NEXT_PUBLIC_API_URL } from '@/lib/axios.config';
import Loader from '../loader/Loader';

interface FileListProps {
    files: any[];
    onSelect: (file: any) => void;
    onFilesUpdate: () => void;
    selectedId?: number;
    loading?: boolean;
    onClose?: () => void; // Функция для закрытия панели
}

export default function FileList({ files, onSelect, onFilesUpdate, selectedId, loading, onClose }: FileListProps) {
    const auth = useAuth();
    if (!auth) return null;
    const { user, get, post } = auth;
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
    const [isArchiving, setIsArchiving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Закрытие панели при клике вне области
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node) && onClose) {
                onClose();
            }
        };

        if (onClose) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [onClose]);

    const getFileIcon = (fileType: string, mimeType?: string) => {
        switch (fileType) {
            case 'image':
                return <Image className="text-purple-600" size={20} />;
            case 'excel':
                return <FileSpreadsheet className="text-green-600" size={20} />;
            case 'word':
                return <FileText className="text-blue-600" size={20} />;
            case 'powerpoint':
                return <Presentation className="text-orange-600" size={20} />;
            case 'archive':
                return <FileArchive className="text-purple-600" size={20} />;
            default:
                if (mimeType?.includes('zip') || mimeType?.includes('rar')) {
                    return <FileArchive className="text-purple-600" size={20} />;
                }
                return <File className="text-gray-600" size={20} />;
        }
    };

    const formatFileSize = (bytes: number) => {
        if (!bytes) return '0 Б';
        if (bytes < 1024) return bytes + ' Б';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
        return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
    };

    const handleSelectFile = (fileId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSelected = new Set(selectedFiles);
        if (newSelected.has(fileId)) {
            newSelected.delete(fileId);
        } else {
            newSelected.add(fileId);
        }
        setSelectedFiles(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedFiles.size === files.length) {
            setSelectedFiles(new Set());
        } else {
            setSelectedFiles(new Set(files.map(f => f.id)));
        }
    };

    const handleDownload = async (file: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setDownloadingId(file.id);
        try {
            window.open(`${NEXT_PUBLIC_API_URL}/api/files/download/${file.id}`, '_blank');
        } catch (error) {
            console.error('Ошибка скачивания:', error);
        } finally {
            setDownloadingId(null);
        }
    };

    const handleDelete = async (file: any, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`Удалить "${file.original_name}"?`)) return;

        setDeletingId(file.id);
        try {
            const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/delete-file/${file.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                onFilesUpdate();
            }
        } catch (error) {
            console.error('Ошибка удаления:', error);
        } finally {
            setDeletingId(null);
        }
    };

    const handleArchiveSelected = async () => {
        if (selectedFiles.size === 0) {
            alert('Выберите файлы для архивации');
            return;
        }

        setIsArchiving(true);
        try {
            const zip = new JSZip();
            const filesToArchive = files.filter(f => selectedFiles.has(f.id));

            for (const file of filesToArchive) {
                const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/files/download/${file.id}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                const blob = await response.blob();
                zip.file(file.original_name, blob);
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const archiveName = `архив_${Date.now()}.zip`;

            const formData = new FormData();
            formData.append('file', zipBlob, archiveName);
            formData.append('author_id', localStorage.getItem('userId') || '1');

            const uploadResponse = await fetch(`${NEXT_PUBLIC_API_URL}/api/save-file`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (uploadResponse.ok) {
                for (const file of filesToArchive) {
                    await fetch(`${NEXT_PUBLIC_API_URL}/api/delete-file/${file.id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });
                }

                alert(`Архивировано ${filesToArchive.length} файлов!`);
                setSelectedFiles(new Set());
                onFilesUpdate();
            }
        } catch (error) {
            console.error('Ошибка архивации:', error);
            alert('Ошибка при создании архива');
        } finally {
            setIsArchiving(false);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedFiles.size === 0) {
            alert('Выберите файлы для удаления');
            return;
        }

        if (!confirm(`Удалить ${selectedFiles.size} выбранных файлов?`)) return;

        setIsDeleting(true);
        try {
            for (const fileId of selectedFiles) {
                await fetch(`${NEXT_PUBLIC_API_URL}/api/delete-file/${fileId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
            }

            alert(`Удалено ${selectedFiles.size} файлов!`);
            setSelectedFiles(new Set());
            onFilesUpdate();
        } catch (error) {
            console.error('Ошибка удаления:', error);
            alert('Ошибка при удалении файлов');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleFileSelect = (file: any) => {
        onSelect(file);
        // Закрываем панель на мобильных устройствах
        if (window.innerWidth < 1024 && onClose) {
            onClose();
        }
    };

    if (loading) {
        return <Loader />;
    }

    return (
        <div ref={panelRef} className="flex flex-col h-full">
            {/* Кнопка закрытия для мобильных устройств */}
            {onClose && (
                <div className="lg:hidden absolute top-2 right-2 z-10">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        title="Закрыть"
                    >
                        <X size={20} />
                    </button>
                </div>
            )}

            {/* Массовые действия */}
            {selectedFiles.size > 0 && (
                <div className="p-3 bg-blue-50 border-b flex items-center justify-between">
                    <span className="text-sm text-blue-700">
                        Выбрано {selectedFiles.size} файл(ов)
                    </span>

                    <div className="flex gap-2">
                        <button
                            onClick={handleArchiveSelected}
                            disabled={isArchiving}
                            className="px-3 py-1 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm flex items-center gap-1 disabled:opacity-50 transition-colors"
                        >
                            {isArchiving ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                            Архивировать
                        </button>
                        <button
                            onClick={handleDeleteSelected}
                            disabled={isDeleting}
                            className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm flex items-center gap-1 disabled:opacity-50 transition-colors"
                        >
                            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            Удалить
                        </button>
                    </div>
                </div>
            )}

            {/* Кнопка создания нового файла */}
            <div className="p-3 border-b">
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center gap-2 font-medium shadow-sm"
                >
                    <Plus size={18} />
                    Новый файл
                </button>
            </div>

            {/* Список файлов */}
            <div className="flex-1 overflow-auto p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-700">Мои файлы</h3>
                    {files.length > 0 && (
                        <button
                            onClick={handleSelectAll}
                            className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                        >
                            {selectedFiles.size === files.length ? (
                                <CheckSquare size={14} />
                            ) : (
                                <Square size={14} />
                            )}
                            {selectedFiles.size === files.length ? 'Снять выделение' : 'Выбрать всё'}
                        </button>
                    )}
                </div>

                <div className="space-y-2">
                    {files.map((file) => (
                        <div
                            key={file.id}
                            className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                                selectedId === file.id
                                    ? 'bg-blue-100 border-blue-300 shadow-sm'
                                    : 'hover:bg-gray-50 border border-transparent hover:border-gray-200'
                            } ${selectedFiles.has(file.id) ? 'bg-blue-50 border-blue-300' : ''}`}
                            onClick={() => handleFileSelect(file)}
                        >
                            <div className="flex items-center gap-3">
                                {/* Чекбокс */}
                                <div 
                                    onClick={(e) => handleSelectFile(file.id, e)} 
                                    className="cursor-pointer hover:opacity-70 transition-opacity"
                                >
                                    {selectedFiles.has(file.id) ? (
                                        <CheckSquare size={20} className="text-blue-500" />
                                    ) : (
                                        <Square size={20} className="text-gray-400" />
                                    )}
                                </div>

                                {/* Иконка файла */}
                                {getFileIcon(file.file_type, file.mime_type)}
                                
                                {/* Информация о файле */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate text-gray-800">
                                        {file.original_name}
                                        {file.is_temp && (
                                            <span className="ml-2 text-xs text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded">
                                                Временный
                                            </span>
                                        )}
                                    </p>
                                    <div className="flex gap-2 text-xs text-gray-500">
                                        <span>{formatFileSize(file.size)}</span>
                                        <span>•</span>
                                        <span>{new Date(file.created_at).toLocaleDateString('ru-RU')}</span>
                                    </div>
                                </div>
                                
                                {/* Кнопки действий */}
                                <div className="flex gap-1">
                                    <button
                                        onClick={(e) => handleDownload(file, e)}
                                        className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                                        disabled={downloadingId === file.id}
                                        title="Скачать"
                                    >
                                        {downloadingId === file.id ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Download size={16} className="text-gray-500" />
                                        )}
                                    </button>
                                    <button
                                        onClick={(e) => handleDelete(file, e)}
                                        className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                                        disabled={deletingId === file.id}
                                        title="Удалить"
                                    >
                                        {deletingId === file.id ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Trash2 size={16} className="text-red-500" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {files.length === 0 && (
                        <div className="text-center text-gray-500 py-12">
                            <File size={48} className="mx-auto mb-3 opacity-50" />
                            <p className="font-medium">Нет файлов</p>
                            <p className="text-sm mt-1">Загрузите ваш первый файл!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Модальное окно создания файла */}
            <CreateFileModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onFileCreated={onFilesUpdate}
                userId={user?.id || 1}
            />
        </div>
    );
}
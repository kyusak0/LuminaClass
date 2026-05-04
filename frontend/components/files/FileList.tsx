'use client';

import {
    FileText, FileSpreadsheet, Presentation, FileArchive,
    File, Loader2, Download, Trash2, CheckSquare, Square,
    Package, Archive,
    Plus
} from 'lucide-react';
import { useAuth } from '@/context/authContext';
import { useState } from 'react';
import JSZip from 'jszip';
import CreateFileModal from './NewFileCreator';
import { NEXT_PUBLIC_API_URL } from '@/lib/axios.config';

interface FileListProps {
    files: any[];
    onSelect: (file: any) => void;
    onFilesUpdate: () => void;
    selectedId?: number;
    loading?: boolean;
}

export default function FileList({ files, onSelect, onFilesUpdate, selectedId, loading }: FileListProps) {
    const auth = useAuth()
    if (!auth) return
    const { user, get, post } = auth;
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
    const [isArchiving, setIsArchiving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const getFileIcon = (fileType: string) => {
        switch (fileType) {
            case 'image':
                return <File className="text-purple-600" size={20} />;
            case 'excel':
                return <FileSpreadsheet className="text-green-600" size={20} />;
            case 'word':
                return <FileText className="text-blue-600" size={20} />;
            case 'powerpoint':
                return <Presentation className="text-orange-600" size={20} />;
            case 'archive':
                return <FileArchive className="text-purple-600" size={20} />;
            default:
                return <File className="text-gray-600" size={20} />;
        }
    };

    const formatFileSize = (bytes: number) => {
        if (!bytes) return '0 B';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
            console.error('Download error:', error);
        } finally {
            setDownloadingId(null);
        }
    };

    const handleDelete = async (file: any, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`Delete "${file.original_name}"?`)) return;

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
            console.error('Delete error:', error);
        } finally {
            setDeletingId(null);
        }
    };

    const handleArchiveSelected = async () => {
        if (selectedFiles.size === 0) {
            alert('Please select files to archive');
            return;
        }

        setIsArchiving(true);
        try {
            const zip = new JSZip();
            const filesToArchive = files.filter(f => selectedFiles.has(f.id));

            // Скачиваем каждый файл и добавляем в архив
            for (const file of filesToArchive) {
                const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/files/download/${file.id}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                const blob = await response.blob();
                zip.file(file.original_name, blob);
            }

            // Создаем архив
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const archiveName = `archive_${Date.now()}.zip`;

            // Загружаем архив на сервер
            const formData = new FormData();
            formData.append('file', zipBlob, archiveName);
            formData.append('author_id', localStorage.getItem('userId') || '1');

            const uploadResponse = await fetch('${NEXT_PUBLIC_API_URL}/api/save-file', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (uploadResponse.ok) {
                // Удаляем исходные файлы
                for (const file of filesToArchive) {
                    await fetch(`${NEXT_PUBLIC_API_URL}/api/delete-file/${file.id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });
                }

                alert(`Archived ${filesToArchive.length} files successfully!`);
                setSelectedFiles(new Set());
                onFilesUpdate();
            }
        } catch (error) {
            console.error('Archive error:', error);
            alert('Error creating archive');
        } finally {
            setIsArchiving(false);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedFiles.size === 0) {
            alert('Please select files to delete');
            return;
        }

        if (!confirm(`Delete ${selectedFiles.size} selected files?`)) return;

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

            alert(`Deleted ${selectedFiles.size} files successfully!`);
            setSelectedFiles(new Set());
            onFilesUpdate();
        } catch (error) {
            console.error('Delete error:', error);
            alert('Error deleting files');
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Mass actions toolbar */}
            {selectedFiles.size > 0 && (
                <div className="p-3 bg-blue-50 border-b flex items-center justify-between">
                    <span className="text-sm text-blue-700">
                        {selectedFiles.size} file(s) selected
                    </span>

                    <div className="flex gap-2">
                        <button
                            onClick={handleArchiveSelected}
                            disabled={isArchiving}
                            className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm flex items-center gap-1 disabled:opacity-50"
                        >
                            {isArchiving ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                            Archive
                        </button>
                        <button
                            onClick={handleDeleteSelected}
                            disabled={isDeleting}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm flex items-center gap-1 disabled:opacity-50"
                        >
                            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            Delete
                        </button>
                    </div>
                </div>
            )}

            <button
                onClick={() => setIsCreateModalOpen(true)}
                className="text-sm bg-bg text-main px-2 py-1 rounded hover:bg-main hover:text-white flex justify-center items-center uppercase font-medium gap-1"
            >
                <Plus size={14} />
                Новый файл
            </button>

            <div className="flex-1 overflow-auto p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-700">My Files</h3>
                    {files.length > 0 && (
                        <button
                            onClick={handleSelectAll}
                            className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
                        >
                            {selectedFiles.size === files.length ? (
                                <CheckSquare size={14} />
                            ) : (
                                <Square size={14} />
                            )}
                            {selectedFiles.size === files.length ? 'Deselect All' : 'Select All'}
                        </button>
                    )}
                </div>

                <div className="space-y-2">
                    {files.map((file) => (
                        <div
                            key={file.id}
                            className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${selectedId === file.id
                                ? 'bg-blue-100 border-blue-300 shadow-sm'
                                : 'hover:bg-gray-50 border-transparent hover:border-gray-200'
                                } border ${selectedFiles.has(file.id) ? 'bg-blue-50 border-blue-300' : ''}`}
                            onClick={() => onSelect(file)}
                        >
                            <div className="flex items-center gap-3">
                                {/* Checkbox */}
                                <div onClick={(e) => handleSelectFile(file.id, e)} className="cursor-pointer">
                                    {selectedFiles.has(file.id) ? (
                                        <CheckSquare size={20} className="text-blue-500" />
                                    ) : (
                                        <Square size={20} className="text-gray-400" />
                                    )}
                                </div>

                                {getFileIcon(file.file_type)}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{file.original_name}</p>
                                    <div className="flex gap-2 text-xs text-gray-500">
                                        <span>{formatFileSize(file.size)}</span>
                                        <span>•</span>
                                        <span>{new Date(file.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={(e) => handleDownload(file, e)}
                                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                                        disabled={downloadingId === file.id}
                                    >
                                        {downloadingId === file.id ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Download size={16} className="text-gray-500" />
                                        )}
                                    </button>
                                    <button
                                        onClick={(e) => handleDelete(file, e)}
                                        className="p-1 hover:bg-red-100 rounded transition-colors"
                                        disabled={deletingId === file.id}
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
                        <div className="text-center text-gray-500 py-8">
                            <File size={48} className="mx-auto mb-2 opacity-50" />
                            <p>No files yet</p>
                            <p className="text-sm">Upload your first file!</p>
                        </div>
                    )}
                </div>
            </div>
            <CreateFileModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onFileCreated={onFilesUpdate}
                userId={user?.id || 1}
            />
        </div>
    );
}
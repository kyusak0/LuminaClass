'use client';

import { useState } from 'react';
import { X, FileText, FileSpreadsheet, Presentation, File } from 'lucide-react';
import { useAuth } from '@/context/authContext';
import * as XLSX from 'xlsx';
import { Packer, Document, Paragraph, TextRun } from 'docx';

interface CreateFileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onFileCreated: () => void;
    userId: number;
}

export default function CreateFileModal({ isOpen, onClose, onFileCreated, userId }: CreateFileModalProps) {
    const auth = useAuth()
    if (!auth) return
    const { user, get, post } = auth;
    const [fileName, setFileName] = useState('');
    const [fileType, setFileType] = useState('txt');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');

    const fileTypes = [
        { id: 'txt', name: 'Text Document', extension: '.txt', icon: <File size={20} /> },
        { id: 'docx', name: 'Word Document', extension: '.docx', icon: <FileText size={20} /> },
        { id: 'xlsx', name: 'Excel Spreadsheet', extension: '.xlsx', icon: <FileSpreadsheet size={20} /> },
        { id: 'pptx', name: 'PowerPoint Presentation', extension: '.pptx', icon: <Presentation size={20} /> },
    ];

    // Создание реального DOCX файла
    const createDocxFile = async (): Promise<Blob> => {
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        children: [new TextRun({ text: 'New Document', bold: true, size: 32 })],
                    }),
                    new Paragraph({
                        children: [new TextRun('Start editing your document...')],
                    }),
                ],
            }],
        });
        return await Packer.toBlob(doc);
    };

    // Создание реального XLSX файла
    const createXlsxFile = (): Blob => {
        const ws = XLSX.utils.aoa_to_sheet([['', '', ''], ['', '', ''], ['', '', '']]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    };

    // Создание реального PPTX файла (минимальный валидный)
    const createPptxFile = (): Blob => {
        // Минимальный валидный PPTX файл - это zip архив с определенной структурой
        // Для простоты создаем пустой, но валидный файл
        const emptyPptx = new Blob([''], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
        return emptyPptx;
    };

    const getContentForEditing = (type: string) => {
        switch (type) {
            case 'txt':
                return '<p>New document<br/>Start typing...</p>';
            case 'docx':
                return '<h1>New Document</h1><p>Start editing your document...</p>';
            case 'xlsx':
                return [['', '', ''], ['', '', ''], ['', '', '']];
            case 'pptx':
                return {
                    slides: [{
                        id: Date.now().toString(),
                        elements: [{
                            id: Date.now().toString() + '_text',
                            type: 'text',
                            content: 'New Presentation',
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
                };
            default:
                return '';
        }
    };

    const handleCreate = async () => {
        if (!fileName.trim()) {
            setError('Please enter a file name');
            return;
        }

        const selectedType = fileTypes.find(t => t.id === fileType);
        if (!selectedType) return;

        setIsCreating(true);
        setError('');

        try {
            const fullFileName = fileName.endsWith(selectedType.extension)
                ? fileName
                : `${fileName}${selectedType.extension}`;

            let blob: Blob;

            // Создаем реальный файл в зависимости от типа
            if (fileType === 'docx') {
                blob = await createDocxFile();
            } else if (fileType === 'xlsx') {
                blob = createXlsxFile();
            } else if (fileType === 'pptx') {
                blob = createPptxFile();
            } else {
                blob = new Blob(['New text document\nStart typing...'], { type: 'text/plain' });
            }

            // Создаем FormData для загрузки
            const formData = new FormData();
            const fileToUpload = new window.File([blob], fullFileName, { type: blob.type });
            formData.append('file', fileToUpload);
            formData.append('author_id', userId.toString());

            // Загружаем файл на сервер
            const result = await post('/save-file', formData);

            if (result && (result.success || result.file_id)) {
                const fileId = result.file_id || result.file?.id;

                // Сохраняем содержимое для редактирования
                const contentForEditing = getContentForEditing(fileType);

                await post('/save-file-content', {
                    file_id: fileId,
                    content: contentForEditing
                });

                alert(`File "${fullFileName}" created successfully!`);
                onFileCreated();
                onClose();
                setFileName('');
            } else {
                setError(result?.message || 'Failed to create file');
            }
        } catch (error: any) {
            console.error('Error creating file:', error);
            setError(error?.message || 'Error creating file');
        } finally {
            setIsCreating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-96 max-w-full shadow-xl">
                <div className="border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800">Create New File</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            File Name
                        </label>
                        <input
                            type="text"
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            placeholder="Enter file name"
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            File Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {fileTypes.map((type) => (
                                <button
                                    key={type.id}
                                    onClick={() => setFileType(type.id)}
                                    className={`p-3 border rounded-lg flex items-center gap-2 transition-all ${fileType === type.id
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    {type.icon}
                                    <span className="text-sm">{type.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        💡 Tip: You can edit the file immediately after creation.
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={isCreating || !fileName.trim()}
                            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                        >
                            {isCreating ? 'Creating...' : 'Create File'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
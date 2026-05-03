'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ImageItem, ParagraphStyle } from '@/types/office';
import { PARAGRAPH_STYLES, FONTS, FONT_SIZES } from '@/lib/data/EditorData'

interface ContentBlock {
    index: number;
    type: 'text' | 'image';
    content: string;
    style?: ParagraphStyle
}

interface WordEditorProps {
    initialContent?: ContentBlock[];
    initialImages?: ImageItem[];
    viewMode: 'view' | 'edit';
    onSave?: (content: ContentBlock[], images: ImageItem[]) => void;
    onContentChange?: (content: ContentBlock[], images: ImageItem[]) => void;
    onInsertImage?: (callback: (imageUrl: string) => void) => void;
}

const defaultStyle: ParagraphStyle = { name: 'Обычный', fontSize: 14, fontFamily: 'Arial', bold: false, italic: false, alignment: 'left', lineHeight: 1.5, marginTop: 0, marginBottom: 8, color: '#000000', listType: null, listLevel: 0 }

export default function WordEditor({
    initialContent = [],
    initialImages = [],
    viewMode,
    onContentChange,
    onInsertImage
}: WordEditorProps) {
    const [blocks, setBlocks] = useState<ContentBlock[]>(() => {
        if (initialContent.length > 0) return initialContent;
        return [{
            index: 0,
            type: 'text',
            content: '',
            style: { ...defaultStyle }
        }];
    });

    const [wordImages, setWordImages] = useState<ImageItem[]>(initialImages);
    const [editingIndex, setEditingIndex] = useState<number | null>(0);
    const [editingText, setEditingText] = useState('');
    const [currentStyle, setCurrentStyle] = useState(defaultStyle);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const blockRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const imageInputRef = useRef<HTMLInputElement>(null);

    // Сохранение изменений - ВЫЗЫВАЕТ onContentChange
    const saveChanges = useCallback((newBlocks: ContentBlock[], newImages?: ImageItem[]) => {
        setBlocks(newBlocks);
        onContentChange?.(newBlocks, newImages || wordImages);
    }, [onContentChange, wordImages]);

    // Обновление блока с сохранением
    const updateBlock = useCallback((index: number, updates: Partial<ContentBlock>) => {
        setBlocks(prev => {
            const newBlocks = [...prev];
            const blockIndex = newBlocks.findIndex(b => b.index === index);
            if (blockIndex !== -1) {
                newBlocks[blockIndex] = { ...newBlocks[blockIndex], ...updates };
            }
            // Сохраняем после обновления
            setTimeout(() => {
                saveChanges(newBlocks);
            }, 0);
            return newBlocks;
        });
    }, [saveChanges]);

    // Добавление нового блока с сохранением
    const addNewBlock = useCallback((afterIndex: number) => {
        const newBlock: ContentBlock = {
            index: Date.now(),
            type: 'text',
            content: '',
            style: { ...currentStyle }
        };

        setBlocks(prev => {
            const newBlocks = [...prev];
            const insertPosition = newBlocks.findIndex(b => b.index === afterIndex);
            if (insertPosition !== -1) {
                newBlocks.splice(insertPosition + 1, 0, newBlock);
            } else {
                newBlocks.push(newBlock);
            }
            // Сохраняем после добавления
            setTimeout(() => {
                saveChanges(newBlocks);
            }, 0);
            return newBlocks;
        });

        setTimeout(() => {
            setEditingIndex(newBlock.index);
            setEditingText('');
            setCurrentStyle({ ...currentStyle });
            textareaRef.current?.focus();
        }, 10);
    }, [currentStyle, saveChanges]);

    // Удаление блока с сохранением
    const deleteBlock = useCallback((index: number) => {
        if (blocks.length === 1) {
            updateBlock(index, { content: '', type: 'text' });
            setEditingIndex(index);
            setEditingText('');
        } else {
            setBlocks(prev => {
                const newBlocks = prev.filter(b => b.index !== index);
                setTimeout(() => {
                    saveChanges(newBlocks);
                }, 0);
                return newBlocks;
            });
            setEditingIndex(null);
        }
    }, [blocks.length, updateBlock, saveChanges]);

    // Начало редактирования
    const startEditing = useCallback((index: number, text: string) => {
        setEditingIndex(index);
        setEditingText(text);
        const block = blocks.find(b => b.index === index);
        setCurrentStyle(block?.style || defaultStyle);
        setTimeout(() => {
            textareaRef.current?.focus();
            if (textareaRef.current) {
                const length = textareaRef.current.value.length;
                textareaRef.current.setSelectionRange(length, length);
            }
        }, 10);
    }, [blocks]);

    // Завершение редактирования с сохранением
    const finishEditing = useCallback(() => {
        if (editingIndex !== null) {
            if (editingText.trim() === '') {
                deleteBlock(editingIndex);
            } else {
                updateBlock(editingIndex, {
                    content: editingText,
                    type: 'text',
                    style: currentStyle
                });
            }
        }
        setEditingIndex(null);
        setEditingText('');
    }, [editingIndex, editingText, currentStyle, deleteBlock, updateBlock]);

    // Применение стиля с сохранением
    const applyStyle = useCallback((styleUpdates: Partial<ContentBlock['style']>) => {
        if (editingIndex !== null) {
            const newStyle = { ...currentStyle, ...styleUpdates };
            setCurrentStyle(newStyle);
            updateBlock(editingIndex, {
                style: newStyle
            });
        }
    }, [editingIndex, currentStyle, updateBlock]);

    // Вставка изображения с устройства
    const insertImageFromDevice = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Пожалуйста, выберите изображение');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            addImageBlock(dataUrl, file.name);
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    }, []);

    // Вставка изображения с сервера
    const insertImageFromServer = useCallback((imageUrl: string) => {
        addImageBlock(imageUrl, imageUrl.split('/').pop() || 'image');
    }, []);

    useEffect(() => {
        if (initialContent.length > 0) {
            // Не вызываем saveChanges, чтобы не зациклиться
            setBlocks(initialContent);
            setWordImages(initialImages);
        }
    }, [initialContent, initialImages]);

    // Общая функция добавления изображения
    const addImageBlock = useCallback((imageUrl: string, imageName: string) => {
        const newImageBlock: ContentBlock = {
            index: Date.now(),
            type: 'image',
            content: imageUrl,
            style: { ...defaultStyle }
        };

        const newImageItem: ImageItem = {
            id: `img_${Date.now()}`,
            dataUrl: imageUrl,
            width: 400,
            height: 300,
            name: imageName,
        };

        setWordImages(prev => {
            const newImages = [...prev, newImageItem];
            return newImages;
        });

        setBlocks(prev => {
            let newBlocks;
            if (editingIndex !== null) {
                newBlocks = [...prev];
                const insertPosition = newBlocks.findIndex(b => b.index === editingIndex);
                if (insertPosition !== -1) {
                    newBlocks.splice(insertPosition + 1, 0, newImageBlock);
                } else {
                    newBlocks.push(newImageBlock);
                }
            } else {
                newBlocks = [...prev, newImageBlock];
            }
            // Сохраняем после вставки
            setTimeout(() => {
                saveChanges(newBlocks, [...wordImages, newImageItem]);
            }, 0);
            return newBlocks;
        });
    }, [editingIndex, wordImages, saveChanges]);

    // Открытие диалога выбора изображения
    const handleInsertImageClick = useCallback(() => {
        if (onInsertImage) {
            // Если есть callback для вставки с сервера - показываем диалог выбора
            onInsertImage(insertImageFromServer);
        } else {
            // Иначе используем только загрузку с устройства
            imageInputRef.current?.click();
        }
    }, [onInsertImage, insertImageFromServer]);

    // Удаление изображения с сохранением
    const deleteImage = useCallback((index: number) => {
        deleteBlock(index);
    }, [deleteBlock]);

    // Обработка клавиш
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();

            if (editingIndex !== null) {
                // Сохраняем текущий блок
                updateBlock(editingIndex, {
                    content: editingText,
                    style: currentStyle
                });

                const newBlock: ContentBlock = {
                    index: Date.now(),
                    type: 'text',
                    content: '',
                    style: { ...currentStyle }
                };

                setBlocks(prev => {
                    const newBlocks = [...prev];
                    const currentPosition = newBlocks.findIndex(b => b.index === editingIndex);
                    if (currentPosition !== -1) {
                        newBlocks.splice(currentPosition + 1, 0, newBlock);
                    } else {
                        newBlocks.push(newBlock);
                    }
                    // Сохраняем после добавления
                    setTimeout(() => {
                        saveChanges(newBlocks);
                    }, 0);
                    return newBlocks;
                });

                setEditingIndex(newBlock.index);
                setEditingText('');
                setTimeout(() => textareaRef.current?.focus(), 10);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            finishEditing();
        } else if (e.key === 'Tab') {
            e.preventDefault();
            if (e.shiftKey) {
                const newLevel = Math.max((currentStyle.listLevel || 0) - 1, -1);
                if (newLevel === -1) {
                    applyStyle({ listType: null, listLevel: 0 });
                } else {
                    applyStyle({ listLevel: newLevel });
                }
            } else {
                if (!currentStyle.listType) {
                    applyStyle({ listType: 'bullet', listLevel: 0 });
                } else {
                    applyStyle({ listLevel: Math.min((currentStyle.listLevel || 0) + 1, 2) });
                }
            }
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            applyStyle({ bold: !currentStyle.bold });
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
            e.preventDefault();
            applyStyle({ italic: !currentStyle.italic });
        } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (editingIndex !== null && editingText.trim() !== '') {
                updateBlock(editingIndex, {
                    content: editingText,
                    style: currentStyle
                });
            }
        }
    }, [editingIndex, editingText, currentStyle, updateBlock, finishEditing, applyStyle, saveChanges]);

    // Рендер маркера списка
    const renderListMarker = useCallback((block: ContentBlock, index: number): string | null => {
        if (!block.style?.listType) return null;

        const level = block.style.listLevel || 0;
        const indent = '  '.repeat(level);

        if (block.style.listType === 'bullet') {
            const bullets = ['•', '○', '■'];
            return `${indent}${bullets[Math.min(level, bullets.length - 1)]} `;
        } else {
            let number = 1;
            for (let i = index - 1; i >= 0; i--) {
                const prevBlock = blocks[i];
                if (prevBlock.style?.listType === 'numbered' && prevBlock.style.listLevel === level) {
                    number++;
                } else {
                    break;
                }
            }

            if (level === 0) return `${indent}${number}. `;
            if (level === 1) return `${indent}${String.fromCharCode(96 + number)}. `;
            return `${indent}${number}. `;
        }
    }, [blocks]);

    // Функция для установки ref
    const setBlockRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
        if (el) {
            blockRefs.current.set(index, el);
        } else {
            blockRefs.current.delete(index);
        }
    }, []);

    // Рендер блока
    const renderBlock = useCallback((block: ContentBlock, idx: number) => {
        const isEditing = editingIndex === block.index;
        const marker = renderListMarker(block, idx);

        if (block.type === 'image') {
            return (
                <div
                    key={block.index}
                    ref={setBlockRef(block.index)}
                    className="image-block"
                    style={{
                        margin: '10px 0',
                        position: 'relative',
                        display: 'inline-block'
                    }}
                >
                    <img
                        src={block.content}
                        alt={`Image ${block.index}`}
                        style={{
                            maxWidth: '100%',
                            height: 'auto',
                            maxHeight: '300px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                        onClick={() => {
                            if (!isEditing) {
                                startEditing(block.index, '');
                            }
                        }}
                    />
                    {isEditing && (
                        <button
                            onClick={() => deleteImage(idx)}
                            style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                background: 'red',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                zIndex: 10
                            }}
                        >
                            ✕ Удалить
                        </button>
                    )}
                </div>
            );
        }

        return (
            <div
                key={block.index}
                ref={setBlockRef(block.index)}
                className={`text-block ${isEditing ? 'editing' : ''}`}
                style={{
                    fontFamily: block.style?.fontFamily || defaultStyle.fontFamily,
                    fontSize: `${block.style?.fontSize || defaultStyle.fontSize}px`,
                    fontWeight: block.style?.bold ? 'bold' : 'normal',
                    fontStyle: block.style?.italic ? 'italic' : 'normal',
                    color: block.style?.color || defaultStyle.color,
                    textAlign: block.style?.alignment || defaultStyle.alignment,
                    marginBottom: '8px',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    cursor: 'text',
                    backgroundColor: isEditing ? '#f0f9ff' : 'transparent',
                    border: isEditing ? '2px solid #3b82f6' : '1px solid transparent',
                    transition: 'all 0.2s',
                    minHeight: '40px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                }}
                onClick={() => {
                    if (!isEditing) {
                        startEditing(block.index, block.content);
                    }
                }}
            >
                {marker && (
                    <span style={{
                        display: 'inline-block',
                        marginRight: '8px',
                        color: '#666',
                        userSelect: 'none'
                    }}>
                        {marker}
                    </span>
                )}

                {isEditing ? (
                    <textarea
                        ref={textareaRef}
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        style={{
                            width: '100%',
                            minHeight: '60px',
                            fontFamily: currentStyle.fontFamily,
                            fontSize: `${currentStyle.fontSize}px`,
                            fontWeight: currentStyle.bold ? 'bold' : 'normal',
                            fontStyle: currentStyle.italic ? 'italic' : 'normal',
                            color: currentStyle.color,
                            border: 'none',
                            outline: 'none',
                            resize: 'vertical',
                            padding: '4px',
                            backgroundColor: 'transparent',
                            margin: 0
                        }}
                        placeholder="Введите текст..."
                        autoFocus
                    />
                ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                        {block.content || <span style={{ color: '#999', opacity: 0.6 }}>Нажмите для редактирования...</span>}
                    </div>
                )}
            </div>
        );
    }, [editingIndex, editingText, currentStyle, startEditing, handleKeyDown, renderListMarker, deleteImage, setBlockRef]);

    // Автоматическая прокрутка
    useEffect(() => {
        if (editingIndex !== null) {
            const blockElement = blockRefs.current.get(editingIndex);
            if (blockElement) {
                blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [editingIndex]);

    

    // Сохраняем начальное содержимое
    useEffect(() => {
        if (initialContent.length > 0) {
            saveChanges(initialContent, initialImages);
        }
    }, []);

    if (viewMode === 'view') {
        return (
            <div className="bg-gray-50 rounded-lg p-6">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 min-h-[400px]">
                    {blocks.map((block, idx) => {
                        if (block.type === 'image') {
                            return (
                                <img
                                    key={block.index}
                                    src={block.content}
                                    alt={`Image ${block.index}`}
                                    style={{
                                        maxWidth: '100%',
                                        height: 'auto',
                                        margin: '10px 0',
                                        display: 'block'
                                    }}
                                />
                            );
                        }
                        const marker = renderListMarker(block, idx);
                        return (
                            <div
                                key={block.index}
                                style={{
                                    fontFamily: block.style?.fontFamily || defaultStyle.fontFamily,
                                    fontSize: `${block.style?.fontSize || defaultStyle.fontSize}px`,
                                    fontWeight: block.style?.bold ? 'bold' : 'normal',
                                    fontStyle: block.style?.italic ? 'italic' : 'normal',
                                    color: block.style?.color || defaultStyle.color,
                                    textAlign: block.style?.alignment || defaultStyle.alignment,
                                    marginBottom: '8px',
                                    whiteSpace: 'pre-wrap'
                                }}
                            >
                                {marker && <span style={{ marginRight: '8px' }}>{marker}</span>}
                                {block.content || '(пусто)'}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Панель инструментов */}
            {editingIndex !== null && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sticky top-0 z-10">
                    <div className="flex flex-wrap gap-2 items-center">
                        <select
                            onChange={(e) => applyStyle(PARAGRAPH_STYLES[parseInt(e.target.value)].styles as Partial<ParagraphStyle>)}
                            className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                            defaultValue="0"
                        >
                            {PARAGRAPH_STYLES.map((style, idx) => (
                                <option key={idx} value={idx}>{style.name}</option>
                            ))}
                        </select>

                        <div className="w-px h-6 bg-gray-300" />

                        <select
                            value={currentStyle.fontFamily}
                            onChange={(e) => applyStyle({ fontFamily: e.target.value })}
                            className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                        >
                            {FONTS.map(font => <option key={font} value={font}>{font}</option>)}
                        </select>

                        <select
                            value={currentStyle.fontSize}
                            onChange={(e) => applyStyle({ fontSize: parseInt(e.target.value) })}
                            className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white w-16"
                        >
                            {FONT_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
                        </select>

                        <button
                            onClick={() => applyStyle({ bold: !currentStyle.bold })}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition ${currentStyle.bold ? 'bg-main text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                        >
                            <b>Ж</b>
                        </button>

                        <button
                            onClick={() => applyStyle({ italic: !currentStyle.italic })}
                            className={`px-3 py-1.5 rounded-lg text-sm italic transition ${currentStyle.italic ? 'bg-main text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                        >
                            <i>К</i>
                        </button>

                        <input
                            type="color"
                            value={currentStyle.color}
                            onChange={(e) => applyStyle({ color: e.target.value })}
                            className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                        />

                        <div className="w-px h-6 bg-gray-300" />

                        <button
                            onClick={() => applyStyle({ alignment: 'left' })}
                            className={`px-3 py-1.5 rounded-lg text-sm transition ${currentStyle.alignment === 'left' ? 'bg-main text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                        >
                            ⬅️
                        </button>
                        <button
                            onClick={() => applyStyle({ alignment: 'center' })}
                            className={`px-3 py-1.5 rounded-lg text-sm transition ${currentStyle.alignment === 'center' ? 'bg-main text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                        >
                            ⬌
                        </button>
                        <button
                            onClick={() => applyStyle({ alignment: 'right' })}
                            className={`px-3 py-1.5 rounded-lg text-sm transition ${currentStyle.alignment === 'right' ? 'bg-main text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                        >
                            ➡️
                        </button>
                        <button
                            onClick={() => applyStyle({ alignment: 'justify' })}
                            className={`px-3 py-1.5 rounded-lg text-sm transition ${currentStyle.alignment === 'justify' ? 'bg-main text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                        >
                            ⇔
                        </button>

                        <div className="w-px h-6 bg-gray-300" />

                        <button
                            onClick={() => {
                                if (currentStyle.listType === 'bullet') {
                                    applyStyle({ listType: null, listLevel: 0 });
                                } else {
                                    applyStyle({ listType: 'bullet', listLevel: 0 });
                                }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm transition ${currentStyle.listType === 'bullet' ? 'bg-main text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                        >
                            • Список
                        </button>
                        <button
                            onClick={() => {
                                if (currentStyle.listType === 'numbered') {
                                    applyStyle({ listType: null, listLevel: 0 });
                                } else {
                                    applyStyle({ listType: 'numbered', listLevel: 0 });
                                }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm transition ${currentStyle.listType === 'numbered' ? 'bg-main text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                        >
                            1. Список
                        </button>

                        <div className="w-px h-6 bg-gray-300" />

                        <button
                            onClick={handleInsertImageClick}
                            className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition"
                        >
                            🖼️ Вставить изображение
                        </button>

                        <button
                            onClick={finishEditing}
                            className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition ml-auto"
                        >
                            ✓ Завершить редактирование
                        </button>
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                        💡 Enter - новый абзац • Tab/Shift+Tab - отступы • Ctrl+B/I - форматирование • Esc - завершить
                    </div>
                </div>
            )}

            {/* Редактор */}
            <div
                className="bg-white border border-gray-300 rounded-lg p-4 min-h-[500px]"
                onClick={(e) => {
                    e.stopPropagation();
                }}
            >
                {blocks.map((block, idx) => renderBlock(block, idx))}
            </div>

            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={insertImageFromDevice}
                className="hidden"
            />
        </div>
    );
}
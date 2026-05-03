'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Palette, Undo, Redo, Save
} from 'lucide-react';

interface TextEditorProps {
  initialContent: string;
  onChange: (content: string) => void;
}

export default function TextEditor({ initialContent, onChange }: TextEditorProps) {
  const [content, setContent] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Инициализация содержимого
  useEffect(() => {
    if (editorRef.current && initialContent !== undefined) {
      const safeContent = initialContent || '<p>Start typing...</p>';
      if (editorRef.current.innerHTML !== safeContent) {
        editorRef.current.innerHTML = safeContent;
        setContent(safeContent);
      }
    }
  }, [initialContent]);

  // Сохранение изменений с debounce
  const handleContentChange = useCallback(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);

      // Debounce сохранение
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        onChange(newContent);
      }, 300);
    }
  }, [onChange]);

  // Выполнение команды с сохранением фокуса
  const execCommand = useCallback((command: string, value?: string) => {
    if (!editorRef.current) return;

    // Сохраняем выделение
    const selection = window.getSelection();
    const range = selection?.getRangeAt(0);

    // Выполняем команду
    document.execCommand(command, false, value);

    // Восстанавливаем фокус и выделение
    editorRef.current.focus();
    if (range && selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }

    // Обновляем содержимое
    handleContentChange();
  }, [handleContentChange]);

  const handleFontChange = (font: string) => execCommand('fontName', font);
  const handleFontSize = (size: string) => execCommand('fontSize', size);
  const handleColor = (color: string) => {
    execCommand('foreColor', color);
    setShowColorPicker(false);
  };
  const handleUndo = () => execCommand('undo');
  const handleRedo = () => execCommand('redo');

  // Обработка вставки текста
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    handleContentChange();
  }, [handleContentChange]);

  // Обработка клавиш
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl+S для сохранения
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    }

    // Отложенное сохранение после ввода
    setTimeout(handleContentChange, 10);
  }, [handleContentChange, onChange]);

  // Фокус на редакторе при монтировании
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.focus();
      // Ставим курсор в конец
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b p-2 bg-gray-50 flex flex-wrap gap-1 sticky top-0 z-10 shrink-0">
        <button onClick={handleUndo} className="p-2 hover:bg-gray-200 rounded" title="Undo (Ctrl+Z)">
          <Undo size={18} />
        </button>
        <button onClick={handleRedo} className="p-2 hover:bg-gray-200 rounded" title="Redo (Ctrl+Y)">
          <Redo size={18} />
        </button>

        <div className="w-px h-8 bg-gray-300 mx-1" />

        <select
          onChange={(e) => handleFontChange(e.target.value)}
          className="px-2 py-1 border rounded text-sm bg-white"
          defaultValue="Arial"
        >
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
        </select>

        <select
          onChange={(e) => handleFontSize(e.target.value)}
          className="px-2 py-1 border rounded text-sm bg-white"
          defaultValue="3"
        >
          <option value="1">8</option>
          <option value="2">10</option>
          <option value="3">12</option>
          <option value="4">14</option>
          <option value="5">18</option>
          <option value="6">24</option>
          <option value="7">36</option>
        </select>

        <div className="w-px h-8 bg-gray-300 mx-1" />

        <button onClick={() => execCommand('bold')} className="p-2 hover:bg-gray-200 rounded" title="Полужирный (Ctrl+B)">
          <Bold size={18} />
        </button>
        <button onClick={() => execCommand('italic')} className="p-2 hover:bg-gray-200 rounded" title="Курсив (Ctrl+I)">
          <Italic size={18} />
        </button>
        <button onClick={() => execCommand('underline')} className="p-2 hover:bg-gray-200 rounded" title="Подчеркнутый (Ctrl+U)">
          <Underline size={18} />
        </button>

        <div className="w-px h-8 bg-gray-300 mx-1" />

        <button onClick={() => execCommand('justifyLeft')} className="p-2 hover:bg-gray-200 rounded" title="По левому краю">
          <AlignLeft size={18} />
        </button>
        <button onClick={() => execCommand('justifyCenter')} className="p-2 hover:bg-gray-200 rounded" title="По центру">
          <AlignCenter size={18} />
        </button>
        <button onClick={() => execCommand('justifyRight')} className="p-2 hover:bg-gray-200 rounded" title="По правому краю">
          <AlignRight size={18} />
        </button>

        <div className="w-px h-8 bg-gray-300 mx-1" />

        <button onClick={() => execCommand('insertUnorderedList')} className="p-2 hover:bg-gray-200 rounded" title="Маркированный список">
          <List size={18} />
        </button>
        <button onClick={() => execCommand('insertOrderedList')} className="p-2 hover:bg-gray-200 rounded" title="Нумерованный список">
          <ListOrdered size={18} />
        </button>

        <div className="w-px h-8 bg-gray-300 mx-1" />

        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-2 hover:bg-gray-200 rounded"
            title="Text Color"
          >
            <Palette size={18} />
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white border rounded shadow-lg z-20">
              <input
                type="color"
                onChange={(e) => handleColor(e.target.value)}
                className="w-32 h-8 cursor-pointer"
                defaultValue="#000000"
              />
            </div>
          )}
        </div>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="flex-1 p-4 overflow-auto focus:outline-none bg-white"
        onInput={handleContentChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => {
          if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
          }
        }}
      />
    </div>
  );
}
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Palette, Undo, Redo, Eye, Type
} from 'lucide-react';

interface TextEditorProps {
  initialContent: string;
  onChange: (content: string) => void;
}

export default function TextEditor({ initialContent, onChange }: TextEditorProps) {
  const [content, setContent] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Очистка HTML и нормализация содержимого
  const normalizeContent = useCallback((html: string): string => {
    if (!html || html === 'null' || html === 'undefined') {
      return '<p>Начните печатать...</p>';
    }
    
    // Если это просто текст без HTML тегов
    if (!html.includes('<') && !html.includes('>')) {
      // Заменяем переносы строк на параграфы
      const paragraphs = html.split(/\n/).filter(p => p.trim());
      if (paragraphs.length > 0) {
        return paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('');
      }
      return `<p>${escapeHtml(html)}</p>`;
    }
    
    return html;
  }, []);

  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Инициализация содержимого
  useEffect(() => {
    if (editorRef.current && initialContent !== undefined && !isInitializedRef.current) {
      const safeContent = normalizeContent(initialContent);
      
      // Принудительно устанавливаем содержимое
      editorRef.current.innerHTML = safeContent;
      setContent(safeContent);
      isInitializedRef.current = true;
      
      console.log('TextEditor initialized with:', safeContent.substring(0, 100));
    }
  }, [initialContent, normalizeContent]);

  // Сохранение изменений с debounce
  const handleContentChange = useCallback(() => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        onChange(newContent);
      }, 300);
    }
  }, [onChange]);

  // Применение форматирования
  const applyFormatting = useCallback((command: string, value?: string) => {
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    
    try {
      // Пробуем использовать execCommand как запасной вариант
      if (document.execCommand) {
        document.execCommand(command, false, value);
        handleContentChange();
        return;
      }
      
      // Современный подход для основных команд
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();
      
      if (!selectedText) return;
      
      const span = document.createElement('span');
      
      switch (command) {
        case 'bold':
          span.style.fontWeight = 'bold';
          break;
        case 'italic':
          span.style.fontStyle = 'italic';
          break;
        case 'underline':
          span.style.textDecoration = 'underline';
          break;
        case 'foreColor':
          span.style.color = value || '#000000';
          break;
        default:
          return;
      }
      
      span.textContent = selectedText;
      range.deleteContents();
      range.insertNode(span);
      
      // Восстанавливаем выделение
      range.selectNodeContents(span);
      selection.removeAllRanges();
      selection.addRange(range);
      
      handleContentChange();
    } catch (error) {
      console.error('Formatting error:', error);
    }
  }, [handleContentChange]);

  const handleUndo = () => {
    try {
      document.execCommand('undo');
      setTimeout(handleContentChange, 10);
    } catch (error) {
      console.error('Undo error:', error);
    }
  };

  const handleRedo = () => {
    try {
      document.execCommand('redo');
      setTimeout(handleContentChange, 10);
    } catch (error) {
      console.error('Redo error:', error);
    }
  };

  const handleFontChange = (font: string) => {
    if (!editorRef.current) return;
    editorRef.current.style.fontFamily = font;
    handleContentChange();
  };

  const handleFontSize = (size: string) => {
    if (!editorRef.current) return;
    const sizeMap: Record<string, string> = {
      '1': '12px', '2': '14px', '3': '16px', 
      '4': '18px', '5': '24px', '6': '32px', '7': '48px'
    };
    editorRef.current.style.fontSize = sizeMap[size] || '16px';
    handleContentChange();
  };

  const handleColor = (color: string) => {
    applyFormatting('foreColor', color);
    setShowColorPicker(false);
  };

  const handleAlign = (alignment: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    try {
      document.execCommand(`justify${alignment.charAt(0).toUpperCase() + alignment.slice(1)}`);
      handleContentChange();
    } catch (error) {
      console.error('Align error:', error);
    }
  };

  const handleList = (type: 'unordered' | 'ordered') => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    try {
      const command = type === 'unordered' ? 'insertUnorderedList' : 'insertOrderedList';
      document.execCommand(command);
      handleContentChange();
    } catch (error) {
      console.error('List error:', error);
    }
  };

  // Обработка вставки текста
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    
    try {
      document.execCommand('insertText', false, text);
      handleContentChange();
    } catch (error) {
      // Fallback
      const selection = window.getSelection();
      if (selection && selection.rangeCount) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        handleContentChange();
      }
    }
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

    // Горячие клавиши для форматирования
    if (e.ctrlKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          applyFormatting('bold');
          break;
        case 'i':
          e.preventDefault();
          applyFormatting('italic');
          break;
        case 'u':
          e.preventDefault();
          applyFormatting('underline');
          break;
      }
    }

    setTimeout(handleContentChange, 10);
  }, [applyFormatting, handleContentChange, onChange]);

  // Фокус на редакторе при монтировании
  useEffect(() => {
    if (editorRef.current && !isPreviewMode) {
      editorRef.current.focus();
      
      // Ставим курсор в конец, если контент не пустой
      if (editorRef.current.innerHTML && editorRef.current.innerHTML !== '<p>Начните печатать...</p>') {
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  }, [isPreviewMode]);

  // Отслеживаем изменения initialContent извне
  useEffect(() => {
    if (editorRef.current && initialContent && initialContent !== content) {
      const safeContent = normalizeContent(initialContent);
      if (editorRef.current.innerHTML !== safeContent) {
        editorRef.current.innerHTML = safeContent;
        setContent(safeContent);
      }
    }
  }, [initialContent, content, normalizeContent]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b p-2 bg-gray-50 flex flex-wrap gap-1 sticky top-0 z-10 shrink-0">
        <button 
          onClick={handleUndo} 
          className="p-2 hover:bg-gray-200 rounded transition-colors" 
          title="Отменить (Ctrl+Z)"
          type="button"
        >
          <Undo size={18} />
        </button>
        <button 
          onClick={handleRedo} 
          className="p-2 hover:bg-gray-200 rounded transition-colors" 
          title="Повторить (Ctrl+Y)"
          type="button"
        >
          <Redo size={18} />
        </button>

        <div className="w-px h-8 bg-gray-300 mx-1" />

        <select
          onChange={(e) => handleFontChange(e.target.value)}
          className="px-2 py-1 border rounded text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="px-2 py-1 border rounded text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          defaultValue="3"
        >
          <option value="1">8px</option>
          <option value="2">10px</option>
          <option value="3">12px</option>
          <option value="4">14px</option>
          <option value="5">18px</option>
          <option value="6">24px</option>
          <option value="7">36px</option>
        </select>

        <div className="w-px h-8 bg-gray-300 mx-1" />

        <button 
          onClick={() => applyFormatting('bold')} 
          className="p-2 hover:bg-gray-200 rounded transition-colors" 
          title="Полужирный (Ctrl+B)"
          type="button"
        >
          <Bold size={18} />
        </button>
        <button 
          onClick={() => applyFormatting('italic')} 
          className="p-2 hover:bg-gray-200 rounded transition-colors" 
          title="Курсив (Ctrl+I)"
          type="button"
        >
          <Italic size={18} />
        </button>
        <button 
          onClick={() => applyFormatting('underline')} 
          className="p-2 hover:bg-gray-200 rounded transition-colors" 
          title="Подчеркнутый (Ctrl+U)"
          type="button"
        >
          <Underline size={18} />
        </button>

        <div className="w-px h-8 bg-gray-300 mx-1" />

        <button 
          onClick={() => handleAlign('left')} 
          className="p-2 hover:bg-gray-200 rounded transition-colors" 
          title="По левому краю"
          type="button"
        >
          <AlignLeft size={18} />
        </button>
        <button 
          onClick={() => handleAlign('center')} 
          className="p-2 hover:bg-gray-200 rounded transition-colors" 
          title="По центру"
          type="button"
        >
          <AlignCenter size={18} />
        </button>
        <button 
          onClick={() => handleAlign('right')} 
          className="p-2 hover:bg-gray-200 rounded transition-colors" 
          title="По правому краю"
          type="button"
        >
          <AlignRight size={18} />
        </button>

        <div className="w-px h-8 bg-gray-300 mx-1" />

        <button 
          onClick={() => handleList('unordered')} 
          className="p-2 hover:bg-gray-200 rounded transition-colors" 
          title="Маркированный список"
          type="button"
        >
          <List size={18} />
        </button>
        <button 
          onClick={() => handleList('ordered')} 
          className="p-2 hover:bg-gray-200 rounded transition-colors" 
          title="Нумерованный список"
          type="button"
        >
          <ListOrdered size={18} />
        </button>

        <div className="w-px h-8 bg-gray-300 mx-1" />

        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Цвет текста"
            type="button"
          >
            <Palette size={18} />
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white border rounded-lg shadow-lg z-20">
              <input
                type="color"
                onChange={(e) => handleColor(e.target.value)}
                className="w-32 h-8 cursor-pointer rounded"
                defaultValue="#000000"
              />
            </div>
          )}
        </div>

        <div className="w-px h-8 bg-gray-300 mx-1" />

        <button
          onClick={() => setIsPreviewMode(!isPreviewMode)}
          className={`p-2 rounded transition-colors ${isPreviewMode ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}
          title={isPreviewMode ? 'Режим редактирования' : 'Режим предпросмотра'}
          type="button"
        >
          <Eye size={18} />
        </button>
      </div>

      {/* Editable/Preview area */}
      {isPreviewMode ? (
        <div 
          className="flex-1 p-4 overflow-auto bg-white prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      ) : (
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
      )}
    </div>
  );
}
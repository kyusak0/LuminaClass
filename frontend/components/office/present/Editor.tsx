'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { FONTS, FONT_SIZES } from '@/lib/data/EditorData'
import { SlideElement, Slide } from '@/types/office';

interface PowerPointEditorProps {
  initialSlides?: Slide[];
  viewMode: 'view' | 'edit';
  onSlidesChange?: (slides: Slide[]) => void;
}

// Fixed dimensions for consistent slide size
const SLIDE_WIDTH = 900;
const SLIDE_HEIGHT = 506; // 16:9 aspect ratio

const DEFAULT_TEXT_STYLE = {
  fontSize: 20,
  fontFamily: 'Arial',
  color: '#000000',
  textAlign: 'left' as any,
  bold: false,
  italic: false
};

export default function PowerPointEditor({
  initialSlides = [
    {
      id: 1,
      title: 'Титульный слайд',
      elements: [
        { id: 't1', type: 'text', content: 'Название презентации', x: 200, y: 250, width: 400, height: 60, zIndex: 0, ...DEFAULT_TEXT_STYLE, fontSize: 32 }
      ]
    },
    {
      id: 2,
      title: 'Слайд 2',
      elements: [
        { id: 't2', type: 'text', content: 'Ваш текст здесь', x: 200, y: 250, width: 400, height: 60, zIndex: 0, ...DEFAULT_TEXT_STYLE }
      ]
    },
    {
      id: 3,
      title: 'Слайд 3',
      elements: [
        { id: 't3', type: 'text', content: 'Заключение', x: 200, y: 250, width: 400, height: 60, zIndex: 0, ...DEFAULT_TEXT_STYLE, fontSize: 28 }
      ]
    }
  ],
  viewMode,
  onSlidesChange
}: PowerPointEditorProps) {
  const [slides, setSlides] = useState<Slide[]>(initialSlides);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [currentElementStyle, setCurrentElementStyle] = useState(DEFAULT_TEXT_STYLE);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const pptImageInputRef = useRef<HTMLInputElement>(null);
  const slideContainerRef = useRef<HTMLDivElement>(null);
  const slideInnerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Calculate scale based on container width
  useEffect(() => {
    const calculateScale = () => {
      if (slideContainerRef.current) {
        const containerWidth = slideContainerRef.current.clientWidth;
        const newScale = Math.min(1, containerWidth / SLIDE_WIDTH);
        setScale(newScale);
      }
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  // Update current element style when selection changes
  useEffect(() => {
    if (selectedElementId && slides[currentSlide]) {
      const element = slides[currentSlide].elements.find(el => el.id === selectedElementId);
      if (element && element.type === 'text') {
        setCurrentElementStyle({
          fontSize: element.fontSize || DEFAULT_TEXT_STYLE.fontSize,
          fontFamily: element.fontFamily || DEFAULT_TEXT_STYLE.fontFamily,
          color: element.color || DEFAULT_TEXT_STYLE.color,
          textAlign: element.textAlign || DEFAULT_TEXT_STYLE.textAlign,
          bold: element.bold || false,
          italic: element.italic || false
        });
      }
    }
  }, [selectedElementId, slides, currentSlide]);

  const addSlide = () => {
    const newSlides: Slide[] = [...slides, {
      id: slides.length + 1,
      title: `Новый слайд ${slides.length + 1}`,
      elements: [{
        id: Date.now().toString(),
        type: 'text',
        content: 'Новый слайд',
        x: 200,
        y: 250,
        width: 400,
        height: 60,
        zIndex: 0,
        ...DEFAULT_TEXT_STYLE,
        fontSize: 28
      }]
    }];
    setSlides(newSlides);
    setCurrentSlide(slides.length);
    onSlidesChange?.(newSlides);
  };

  const deleteSlide = (index: number) => {
    if (slides.length <= 1) {
      alert('Нельзя удалить последний слайд');
      return;
    }
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
    if (currentSlide >= slides.length - 1) {
      setCurrentSlide(Math.max(0, slides.length - 2));
    }
    onSlidesChange?.(newSlides);
  };

  const updateSlideTitle = (index: number, title: string) => {
    const newSlides = slides.map((s, i) => i === index ? { ...s, title } : s);
    setSlides(newSlides);
    onSlidesChange?.(newSlides);
  };

  const addTextElement = () => {
    if (!slides[currentSlide]) return;
    const newElement: SlideElement = {
      id: Date.now().toString(),
      type: 'text',
      content: 'Новый текст',
      x: 100,
      y: 100,
      width: 300,
      height: 60,
      zIndex: slides[currentSlide].elements.length,
      ...DEFAULT_TEXT_STYLE
    };
    const newSlides = [...slides];
    newSlides[currentSlide].elements.push(newElement);
    setSlides(newSlides);
    setSelectedElementId(newElement.id);
    onSlidesChange?.(newSlides);
  };

  const addImageToSlide = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !slides[currentSlide]) return;

    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const newElement: SlideElement = {
          id: Date.now().toString(),
          type: 'image',
          content: dataUrl,
          x: 100,
          y: 100,
          width: Math.min(img.width, 400),
          height: Math.min(img.height, 300),
          zIndex: slides[currentSlide].elements.length,
          imageName: file.name
        };
        const newSlides = [...slides];
        newSlides[currentSlide].elements.push(newElement);
        setSlides(newSlides);
        setSelectedElementId(newElement.id);
        onSlidesChange?.(newSlides);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const updateElement = useCallback((elementId: string, updates: Partial<SlideElement>) => {
    const newSlides = [...slides];
    const element = newSlides[currentSlide].elements.find(el => el.id === elementId);
    if (element) {
      Object.assign(element, updates);
      setSlides(newSlides);
      onSlidesChange?.(newSlides);
    }
  }, [slides, currentSlide, onSlidesChange]);

  const deleteElement = (elementId: string) => {
    const newSlides = [...slides];
    newSlides[currentSlide].elements = newSlides[currentSlide].elements.filter(el => el.id !== elementId);
    setSlides(newSlides);
    if (selectedElementId === elementId) setSelectedElementId(null);
    onSlidesChange?.(newSlides);
  };

  const moveElementUp = (elementId: string) => {
    const newSlides = [...slides];
    const elements = newSlides[currentSlide].elements;
    const index = elements.findIndex(el => el.id === elementId);
    if (index < elements.length - 1) {
      [elements[index], elements[index + 1]] = [elements[index + 1], elements[index]];
      elements.forEach((el, i) => el.zIndex = i);
      setSlides(newSlides);
      onSlidesChange?.(newSlides);
    }
  };

  const moveElementDown = (elementId: string) => {
    const newSlides = [...slides];
    const elements = newSlides[currentSlide].elements;
    const index = elements.findIndex(el => el.id === elementId);
    if (index > 0) {
      [elements[index], elements[index - 1]] = [elements[index - 1], elements[index]];
      elements.forEach((el, i) => el.zIndex = i);
      setSlides(newSlides);
      onSlidesChange?.(newSlides);
    }
  };

  const handleElementMouseDown = (e: React.MouseEvent, element: SlideElement) => {
    e.stopPropagation();
    setSelectedElementId(element.id);
    setIsDragging(true);
    setDragStart({
      x: e.clientX - element.x * scale,
      y: e.clientY - element.y * scale
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isResizing && selectedElementId && slideInnerRef.current) {
      const element = slides[currentSlide].elements.find(el => el.id === selectedElementId);
      if (element) {
        const deltaX = (e.clientX - resizeStart.x) / scale;
        const deltaY = (e.clientY - resizeStart.y) / scale;
        const newWidth = Math.max(50, resizeStart.width + deltaX);
        const newHeight = Math.max(30, resizeStart.height + deltaY);
        updateElement(selectedElementId, {
          width: newWidth,
          height: newHeight
        });
      }
    } else if (isDragging && selectedElementId && slideInnerRef.current) {
      const newX = Math.max(0, Math.min(SLIDE_WIDTH - 50, (e.clientX - dragStart.x) / scale));
      const newY = Math.max(0, Math.min(SLIDE_HEIGHT - 50, (e.clientY - dragStart.y) / scale));
      updateElement(selectedElementId, {
        x: newX,
        y: newY
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const updateSlideBackground = (color: string) => {
    const newSlides = [...slides];
    newSlides[currentSlide].background = color;
    setSlides(newSlides);
    onSlidesChange?.(newSlides);
  };

  const applyStyleToElement = useCallback((styleUpdates: Partial<SlideElement>) => {
    if (selectedElementId) {
      updateElement(selectedElementId, styleUpdates);
    }
  }, [selectedElementId, updateElement]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const element = slides[currentSlide].elements.find(el => el.id === selectedElementId);
    if (element) {
      setIsResizing(true);
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: element.width,
        height: element.height
      });
    }
  };

  // Clear selection when clicking outside
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // Don't clear if clicking on toolbar or its children
    if (toolbarRef.current && toolbarRef.current.contains(e.target as Node)) {
      return;
    }
    // Don't clear if clicking on form elements
    const target = e.target as HTMLElement;
    if (target.closest('.slide-element') || 
        target.closest('.resize-handle') ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'BUTTON') {
      return;
    }
    setSelectedElementId(null);
  }, []);

  // Navigation component
  const Navigation = () => (
    <div className="bg-white border-b border-gray-200 px-4 py-2 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
            disabled={currentSlide === 0}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
          >
            ◀
          </button>
          <span className="text-sm font-medium text-gray-700">
            Слайд {currentSlide + 1} / {slides.length}
          </span>
          <button
            onClick={() => setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1))}
            disabled={currentSlide === slides.length - 1}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
          >
            ▶
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-[50%]">
          {slides.map((slide, idx) => (
            <button
              key={slide.id}
              onClick={() => setCurrentSlide(idx)}
              className={`flex-shrink-0 rounded border-2 transition-all overflow-hidden ${currentSlide === idx ? 'border-blue-600 ring-2 ring-blue-600/50 scale-105' : 'border-gray-300 hover:border-blue-400'}`}
              style={{ width: 64, height: 36, backgroundColor: slide.background || '#ffffff' }}
            >
              <div className="text-[6px] text-gray-500 truncate px-0.5">{slide.title}</div>
            </button>
          ))}
        </div>

        {viewMode === 'edit' && (
          <div className="flex items-center gap-2">
            <button
              onClick={addSlide}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
            >
              + Слайд
            </button>
            <button
              onClick={() => pptImageInputRef.current?.click()}
              className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm"
            >
              📷 Изобр.
            </button>
            <button
              onClick={addTextElement}
              className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm"
            >
              📝 Текст
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Formatting toolbar
  const FormattingToolbar = () => {
    const selectedElement = selectedElementId
      ? slides[currentSlide]?.elements.find(el => el.id === selectedElementId)
      : null;
    const isTextSelected = selectedElement?.type === 'text';

    return (
      <div ref={toolbarRef} className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg sticky top-16 z-10">
        <div className="flex flex-wrap gap-2 items-center">
          {isTextSelected ? (
            <>
              <select
                value={currentElementStyle.fontFamily}
                onChange={(e) => applyStyleToElement({ fontFamily: e.target.value })}
                className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {FONTS.map(font => <option key={font} value={font}>{font}</option>)}
              </select>

              <select
                value={currentElementStyle.fontSize}
                onChange={(e) => applyStyleToElement({ fontSize: parseInt(e.target.value) })}
                className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white w-16"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {FONT_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
              </select>

              <button
                onClick={() => applyStyleToElement({ bold: !currentElementStyle.bold })}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition ${currentElementStyle.bold ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                onMouseDown={(e) => e.preventDefault()}
              >
                <b>Ж</b>
              </button>

              <button
                onClick={() => applyStyleToElement({ italic: !currentElementStyle.italic })}
                className={`px-3 py-1.5 rounded-lg text-sm italic transition ${currentElementStyle.italic ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                onMouseDown={(e) => e.preventDefault()}
              >
                <i>К</i>
              </button>

              <div className="flex items-center gap-1">
                <input
                  type="color"
                  value={currentElementStyle.color}
                  onChange={(e) => {
                    applyStyleToElement({ color: e.target.value });
                    e.stopPropagation();
                  }}
                  className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  title='Цвет текста'
                />
                <span className="text-xs text-gray-500">Текст</span>
              </div>

              <div className="w-px h-6 bg-gray-300" />

              <button
                onClick={() => applyStyleToElement({ textAlign: 'left' })}
                className={`px-3 py-1.5 rounded-lg text-sm transition ${currentElementStyle.textAlign === 'left' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                onMouseDown={(e) => e.preventDefault()}
              >
                ⬅️
              </button>
              <button
                onClick={() => applyStyleToElement({ textAlign: 'center' })}
                className={`px-3 py-1.5 rounded-lg text-sm transition ${currentElementStyle.textAlign === 'center' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                onMouseDown={(e) => e.preventDefault()}
              >
                ⬌
              </button>
              <button
                onClick={() => applyStyleToElement({ textAlign: 'right' })}
                className={`px-3 py-1.5 rounded-lg text-sm transition ${currentElementStyle.textAlign === 'right' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                onMouseDown={(e) => e.preventDefault()}
              >
                ➡️
              </button>
            </>
          ) : selectedElementId ? (
            <div className="text-sm text-gray-600 px-2">
              {selectedElement?.type === 'image' ? '🖼️ Изображение выбрано' : '📝 Текст выбран'}
            </div>
          ) : (
            <div className="text-sm text-gray-500 px-2">
              Выберите элемент для редактирования
            </div>
          )}

          <div className="w-px h-6 bg-gray-300" />

          <div className="flex gap-1">
            <button
              onClick={() => selectedElementId && moveElementDown(selectedElementId)}
              disabled={!selectedElementId}
              className={`px-2 py-1.5 bg-gray-200 rounded text-xs hover:bg-gray-300 transition ${!selectedElementId ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Назад"
              onMouseDown={(e) => e.preventDefault()}
            >
              ⬇️ Назад
            </button>
            <button
              onClick={() => selectedElementId && moveElementUp(selectedElementId)}
              disabled={!selectedElementId}
              className={`px-2 py-1.5 bg-gray-200 rounded text-xs hover:bg-gray-300 transition ${!selectedElementId ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Вперед"
              onMouseDown={(e) => e.preventDefault()}
            >
              ⬆️ Вперед
            </button>
          </div>

          <button
            onClick={() => selectedElementId && deleteElement(selectedElementId)}
            disabled={!selectedElementId}
            className={`px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition ml-auto ${!selectedElementId ? 'opacity-50 cursor-not-allowed' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
          >
            🗑️ Удалить
          </button>
        </div>

        {selectedElementId && (
          <div className="mt-2 text-xs text-gray-500 border-t pt-2">
            <div className="flex items-center gap-4">
              <span>📏 Размер: {slides[currentSlide]?.elements.find(el => el.id === selectedElementId)?.width} × {slides[currentSlide]?.elements.find(el => el.id === selectedElementId)?.height}px</span>
              <span>📍 Позиция: {Math.round(slides[currentSlide]?.elements.find(el => el.id === selectedElementId)?.x || 0)} × {Math.round(slides[currentSlide]?.elements.find(el => el.id === selectedElementId)?.y || 0)}px</span>
              <span className="text-blue-600">💡 Тяните за уголок ↘️ для изменения размера</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Режим просмотра
  if (viewMode === 'view') {
    const currentSlideData = slides[currentSlide];
    if (!currentSlideData) return null;

    return (
      <div className="bg-gray-100 min-h-screen">
        <Navigation />

        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg p-4 mb-4 shadow">
              <input
                type="text"
                value={currentSlideData.title}
                onChange={(e) => updateSlideTitle(currentSlide, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-semibold"
                placeholder="Название слайда"
              />
            </div>

            <div
              ref={slideContainerRef}
              className="flex justify-center overflow-auto bg-gray-200 rounded-lg p-4 min-h-[600px]"
            >
              <div
                ref={slideInnerRef}
                className="relative bg-white shadow-xl overflow-hidden"
                style={{
                  width: SLIDE_WIDTH,
                  height: SLIDE_HEIGHT,
                  backgroundColor: currentSlideData.background || '#ffffff',
                  transform: `scale(${scale})`,
                  transformOrigin: 'top center'
                }}
              >
                {currentSlideData.elements.sort((a, b) => a.zIndex - b.zIndex).map(element => (
                  <div
                    key={element.id}
                    className="absolute"
                    style={{
                      left: element.x,
                      top: element.y,
                      width: element.width,
                      minHeight: element.type === 'text' ? element.height : 'auto'
                    }}
                  >
                    {element.type === 'text' ? (
                      <div style={{
                        fontSize: element.fontSize,
                        fontFamily: element.fontFamily,
                        color: element.color,
                        textAlign: element.textAlign || 'left',
                        fontWeight: element.bold ? 'bold' : 'normal',
                        fontStyle: element.italic ? 'italic' : 'normal',
                        whiteSpace: 'pre-wrap',
                        width: element.width,
                        minHeight: element.height
                      }}>
                        {element.content}
                      </div>
                    ) : (
                      <img
                        src={element.content}
                        alt={element.imageName || 'Изображение'}
                        className="rounded shadow"
                        style={{
                          width: element.width,
                          height: element.height,
                          objectFit: 'contain'
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 text-center text-sm text-gray-500">
              <p>Элементов на слайде: {currentSlideData.elements.length}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Режим редактирования
  const currentSlideData = slides[currentSlide];
  if (!currentSlideData) return null;

  return (
    <div className="bg-gray-100 min-h-screen" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      <Navigation />

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg p-4 mb-4 shadow flex gap-3 items-center flex-wrap">
            <input
              type="text"
              value={currentSlideData.title}
              onChange={(e) => updateSlideTitle(currentSlide, e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-lg font-semibold"
              placeholder="Название слайда"
            />
            <div className="flex items-center gap-1">
              <input
                type="color"
                value={currentSlideData.background || '#ffffff'}
                onChange={(e) => {
                  e.stopPropagation();
                  updateSlideBackground(e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                title="Цвет фона"
              />
              <span className="text-xs text-gray-500">Фон</span>
            </div>
            {selectedElementId && (
              <button
                onClick={() => setSelectedElementId(null)}
                onMouseDown={(e) => e.preventDefault()}
                className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition text-sm"
              >
                Снять выделение
              </button>
            )}
          </div>

          <FormattingToolbar />

          <div
            ref={slideContainerRef}
            className="flex justify-center overflow-auto bg-gray-200 rounded-lg p-4 mt-4 min-h-[600px]"
            onClick={handleContainerClick}
          >
            <div
              ref={slideInnerRef}
              className="relative bg-white shadow-xl overflow-hidden"
              style={{
                width: SLIDE_WIDTH,
                height: SLIDE_HEIGHT,
                backgroundColor: currentSlideData.background || '#ffffff',
                transform: `scale(${scale})`,
                transformOrigin: 'top center'
              }}
            >
              {currentSlideData.elements.sort((a, b) => a.zIndex - b.zIndex).map(element => (
                <div
                  key={element.id}
                  className={`absolute slide-element ${selectedElementId === element.id ? 'ring-2 ring-blue-600 ring-offset-2 cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                  style={{
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    minHeight: element.type === 'text' ? element.height : 'auto'
                  }}
                  onMouseDown={(e) => handleElementMouseDown(e, element)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedElementId(element.id);
                  }}
                >
                  {element.type === 'text' ? (
                    <textarea
                      value={element.content}
                      onChange={(e) => {
                        updateElement(element.id, { content: e.target.value });
                      }}
                      onFocus={() => {
                        setSelectedElementId(element.id);
                      }}
                      style={{
                        width: '100%',
                        minHeight: element.height,
                        fontSize: element.fontSize,
                        fontFamily: element.fontFamily,
                        color: element.color,
                        textAlign: element.textAlign || 'left',
                        fontWeight: element.bold ? 'bold' : 'normal',
                        fontStyle: element.italic ? 'italic' : 'normal',
                        padding: '8px',
                        border: '1px solid transparent',
                        borderRadius: '4px',
                        resize: 'none',
                        backgroundColor: 'transparent',
                        outline: 'none'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElementId(element.id);
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedElementId(element.id);
                      }}
                      placeholder="Введите текст..."
                    />
                  ) : (
                    <img
                      src={element.content}
                      alt={element.imageName || 'Изображение'}
                      className="rounded shadow pointer-events-none"
                      style={{
                        width: element.width,
                        height: element.height,
                        objectFit: 'contain'
                      }}
                      draggable={false}
                    />
                  )}
                  {selectedElementId === element.id && (
                    <div
                      className="resize-handle absolute bottom-0 right-0 w-4 h-4 bg-blue-600 rounded-full cursor-se-resize"
                      style={{ transform: 'translate(50%, 50%)' }}
                      onMouseDown={handleResizeStart}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <input ref={pptImageInputRef} type="file" accept="image/*" onChange={addImageToSlide} className="hidden" />
    </div>
  );
}
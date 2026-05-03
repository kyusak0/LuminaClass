'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Copy, Type, Image as ImageIcon, 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Palette, ChevronLeft, ChevronRight, Save, X, Move
} from 'lucide-react';

interface Slide {
  id: string;
  elements: SlideElement[];
  background?: string;
}

interface SlideElement {
  id: string;
  type: 'text' | 'image';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  styles?: {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    textAlign?: 'left' | 'center' | 'right';
  };
}

interface PowerPointEditorProps {
  initialData: any;
  onChange: (data: any) => void;
}

export default function PowerPointEditor({ initialData, onChange }: PowerPointEditorProps) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isEditingText, setIsEditingText] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState<any>(null);
  const [resizing, setResizing] = useState<any>(null);
  
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      if (initialData && initialData.slides && initialData.slides.length > 0) {
        setSlides(initialData.slides);
      } else {
        setSlides([{
          id: Date.now().toString(),
          elements: [{
            id: Date.now().toString() + '_text',
            type: 'text',
            content: 'New Presentation',
            x: 100,
            y: 200,
            width: 600,
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
        }]);
      }
      isFirstRender.current = false;
    }
  }, [initialData]);

  useEffect(() => {
    if (!isFirstRender.current && slides.length > 0) {
      onChange({ slides });
    }
  }, [slides, onChange]);

  const addSlide = () => {
    const newSlide: Slide = {
      id: Date.now().toString(),
      elements: [],
      background: '#ffffff'
    };
    setSlides([...slides, newSlide]);
    setCurrentSlideIndex(slides.length);
  };

  const deleteSlide = (index: number) => {
    if (slides.length === 1) return;
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
    if (currentSlideIndex >= newSlides.length) {
      setCurrentSlideIndex(newSlides.length - 1);
    }
  };

  const duplicateSlide = (index: number) => {
    const slideToCopy = slides[index];
    const newSlide = {
      ...slideToCopy,
      id: Date.now().toString(),
      elements: slideToCopy.elements.map(el => ({ 
        ...el, 
        id: Date.now().toString() + Math.random()
      }))
    };
    const newSlides = [...slides];
    newSlides.splice(index + 1, 0, newSlide);
    setSlides(newSlides);
    setCurrentSlideIndex(index + 1);
  };

  const addTextElement = () => {
    const newElement: SlideElement = {
      id: Date.now().toString(),
      type: 'text',
      content: 'New text',
      x: 200,
      y: 200,
      width: 300,
      height: 60,
      styles: {
        fontSize: 24,
        fontFamily: 'Arial',
        color: '#000000',
        textAlign: 'center'
      }
    };
    
    const updatedSlides = [...slides];
    updatedSlides[currentSlideIndex].elements.push(newElement);
    setSlides(updatedSlides);
    setSelectedElement(newElement.id);
  };

  const addImageElement = () => {
    const newElement: SlideElement = {
      id: Date.now().toString(),
      type: 'image',
      content: '',
      x: 200,
      y: 150,
      width: 300,
      height: 200
    };
    
    const updatedSlides = [...slides];
    updatedSlides[currentSlideIndex].elements.push(newElement);
    setSlides(updatedSlides);
    setSelectedElement(newElement.id);
  };

  const deleteElement = (elementId: string) => {
    const updatedSlides = [...slides];
    updatedSlides[currentSlideIndex].elements = updatedSlides[currentSlideIndex].elements.filter(
      el => el.id !== elementId
    );
    setSlides(updatedSlides);
    setSelectedElement(null);
  };

  const updateElement = (elementId: string, updates: Partial<SlideElement>) => {
    const updatedSlides = [...slides];
    const elementIndex = updatedSlides[currentSlideIndex].elements.findIndex(el => el.id === elementId);
    if (elementIndex !== -1) {
      updatedSlides[currentSlideIndex].elements[elementIndex] = {
        ...updatedSlides[currentSlideIndex].elements[elementIndex],
        ...updates
      };
      setSlides(updatedSlides);
    }
  };

  const updateTextStyle = (style: string, value: any) => {
    if (!selectedElement) return;
    
    const element = slides[currentSlideIndex].elements.find(el => el.id === selectedElement);
    if (element && element.type === 'text') {
      updateElement(selectedElement, {
        styles: { ...element.styles, [style]: value }
      });
    }
  };

  const changeBackground = (color: string) => {
    const updatedSlides = [...slides];
    updatedSlides[currentSlideIndex].background = color;
    setSlides(updatedSlides);
  };

  const handleImageUpload = (elementId: string, file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        updateElement(elementId, { content: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, elementId: string, element: SlideElement) => {
    e.stopPropagation();
    setDragging({
      id: elementId,
      startX: e.clientX,
      startY: e.clientY,
      elementX: element.x,
      elementY: element.y
    });
    setSelectedElement(elementId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging) {
      const dx = e.clientX - dragging.startX;
      const dy = e.clientY - dragging.startY;
      updateElement(dragging.id, {
        x: dragging.elementX + dx,
        y: dragging.elementY + dy
      });
    }
    
    if (resizing) {
      const dx = e.clientX - resizing.startX;
      const dy = e.clientY - resizing.startY;
      
      let newWidth = resizing.startWidth;
      let newHeight = resizing.startHeight;
      
      if (resizing.direction.includes('e')) newWidth = Math.max(50, resizing.startWidth + dx);
      if (resizing.direction.includes('w')) newWidth = Math.max(50, resizing.startWidth - dx);
      if (resizing.direction.includes('s')) newHeight = Math.max(50, resizing.startHeight + dy);
      if (resizing.direction.includes('n')) newHeight = Math.max(50, resizing.startHeight - dy);
      
      updateElement(resizing.id, { width: newWidth, height: newHeight });
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    setResizing(null);
  };

  const handleResizeStart = (e: React.MouseEvent, elementId: string, element: SlideElement, direction: string) => {
    e.stopPropagation();
    setResizing({
      id: elementId,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: element.width,
      startHeight: element.height,
      direction
    });
  };

  const handleSave = () => {
    onChange({ slides });
    alert('Presentation saved!');
  };

  const currentSlide = slides[currentSlideIndex];

  return (
    <div 
      className="flex flex-col h-full bg-gray-100"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="border-b bg-white p-2 flex gap-2 flex-wrap items-center shadow-sm shrink-0">
        <button onClick={addSlide} className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm flex items-center gap-1">
          <Plus size={16} />
          New Slide
        </button>
        <button onClick={() => duplicateSlide(currentSlideIndex)} className="px-3 py-1.5 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm flex items-center gap-1">
          <Copy size={16} />
          Duplicate
        </button>
        <button onClick={() => deleteSlide(currentSlideIndex)} className="px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 text-sm flex items-center gap-1">
          <Trash2 size={16} />
          Delete
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        <button onClick={addTextElement} className="px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 text-sm flex items-center gap-1">
          <Type size={16} />
          Add Text
        </button>
        <button onClick={addImageElement} className="px-3 py-1.5 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm flex items-center gap-1">
          <ImageIcon size={16} />
          Add Image
        </button>
        
        <button onClick={handleSave} className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-1 ml-auto">
          <Save size={16} />
          Save Presentation
        </button>
        
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className="px-2 py-1 bg-gray-200 rounded text-sm">-</button>
          <span className="text-sm">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} className="px-2 py-1 bg-gray-200 rounded text-sm">+</button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-48 bg-gray-200 border-r overflow-y-auto p-2">
          <div className="space-y-2">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className={`border rounded-lg p-2 cursor-pointer transition-all ${
                  currentSlideIndex === index ? 'border-blue-500 bg-blue-100 shadow-md' : 'border-gray-300 bg-white hover:bg-gray-50'
                }`}
                onClick={() => setCurrentSlideIndex(index)}
              >
                <div className="text-xs text-gray-500 mb-1">Slide {index + 1}</div>
                <div className="h-24 rounded flex items-center justify-center text-xs overflow-hidden" style={{ backgroundColor: slide.background }}>
                  {slide.elements.length === 0 ? (
                    <span className="text-gray-400">Empty slide</span>
                  ) : (
                    <div className="text-center w-full">
                      {slide.elements.slice(0, 2).map(el => (
                        <div key={el.id} className="truncate text-xs">
                          {el.type === 'text' ? el.content.slice(0, 20) : '🖼️ Image'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
          <div
            className="shadow-xl bg-white relative"
            style={{
              width: `${960 * zoom}px`,
              height: `${540 * zoom}px`,
              backgroundColor: currentSlide?.background || '#ffffff',
              transform: `scale(${zoom})`,
              transformOrigin: 'center center'
            }}
          >
            {currentSlide?.elements.map((element) => (
              <div
                key={element.id}
                className={`absolute ${selectedElement === element.id ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                style={{ left: element.x, top: element.y, width: element.width, height: element.height }}
              >
                {element.type === 'text' ? (
                  isEditingText && selectedElement === element.id ? (
                    <textarea
                      value={element.content}
                      onChange={(e) => updateElement(element.id, { content: e.target.value })}
                      onBlur={() => setIsEditingText(false)}
                      className="w-full h-full resize-none outline-none p-2 bg-white"
                      style={{
                        fontSize: element.styles?.fontSize,
                        fontFamily: element.styles?.fontFamily,
                        color: element.styles?.color,
                        fontWeight: element.styles?.bold ? 'bold' : 'normal',
                        fontStyle: element.styles?.italic ? 'italic' : 'normal',
                        textDecoration: element.styles?.underline ? 'underline' : 'none',
                        textAlign: element.styles?.textAlign,
                      }}
                      autoFocus
                    />
                  ) : (
                    <div
                      className="w-full h-full p-2 cursor-move overflow-auto"
                      style={{
                        fontSize: element.styles?.fontSize,
                        fontFamily: element.styles?.fontFamily,
                        color: element.styles?.color,
                        fontWeight: element.styles?.bold ? 'bold' : 'normal',
                        fontStyle: element.styles?.italic ? 'italic' : 'normal',
                        textDecoration: element.styles?.underline ? 'underline' : 'none',
                        textAlign: element.styles?.textAlign,
                      }}
                      onDoubleClick={() => setIsEditingText(true)}
                      onMouseDown={(e) => handleMouseDown(e, element.id, element)}
                    >
                      {element.content}
                    </div>
                  )
                ) : (
                  <div 
                    className="w-full h-full cursor-move relative group bg-gray-100 flex items-center justify-center"
                    onMouseDown={(e) => handleMouseDown(e, element.id, element)}
                  >
                    {element.content ? (
                      <img src={element.content} alt="Slide image" className="w-full h-full object-contain" draggable={false} />
                    ) : (
                      <div className="text-center p-4">
                        <ImageIcon size={32} className="mx-auto text-gray-400 mb-2" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id={`image-input-${element.id}`}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(element.id, file);
                          }}
                        />
                        <label
                          htmlFor={`image-input-${element.id}`}
                          className="px-3 py-1 bg-blue-500 text-white rounded text-sm cursor-pointer hover:bg-blue-600"
                        >
                          Upload Image
                        </label>
                      </div>
                    )}
                  </div>
                )}
                
                {selectedElement === element.id && (
                  <>
                    <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-nw-resize" onMouseDown={(e) => handleResizeStart(e, element.id, element, 'nw')} />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-ne-resize" onMouseDown={(e) => handleResizeStart(e, element.id, element, 'ne')} />
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-sw-resize" onMouseDown={(e) => handleResizeStart(e, element.id, element, 'sw')} />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize" onMouseDown={(e) => handleResizeStart(e, element.id, element, 'se')} />
                    <button onClick={() => deleteElement(element.id)} className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center hover:bg-red-600">
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
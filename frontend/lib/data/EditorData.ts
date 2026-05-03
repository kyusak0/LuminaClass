import { ParagraphStyle } from "@/types/office";

export const PARAGRAPH_STYLES: ParagraphStyle[] = [
  { name: 'Обычный', fontSize: 14, fontFamily: 'Arial', bold: false, italic: false, alignment: 'left', lineHeight: 1.5, marginTop: 0, marginBottom: 8, color: '#000000', listType: null, listLevel: 0 },
  { name: 'Заголовок 1', fontSize: 28, fontFamily: 'Arial', bold: true, italic: false, alignment: 'center', lineHeight: 1.2, marginTop: 24, marginBottom: 12, color: '#000000', listType: null, listLevel: 0 },
  { name: 'Заголовок 2', fontSize: 22, fontFamily: 'Arial', bold: true, italic: false, alignment: 'left', lineHeight: 1.3, marginTop: 20, marginBottom: 10, color: '#000000', listType: null, listLevel: 0 },
  { name: 'Заголовок 3', fontSize: 18, fontFamily: 'Arial', bold: true, italic: false, alignment: 'left', lineHeight: 1.4, marginTop: 16, marginBottom: 8, color: '#000000', listType: null, listLevel: 0 },
  { name: 'Цитата', fontSize: 14, fontFamily: 'Georgia', bold: false, italic: true, alignment: 'left', lineHeight: 1.5, marginTop: 8, marginBottom: 8, color: '#555555', listType: null, listLevel: 0 },
  { name: 'Подпись', fontSize: 12, fontFamily: 'Arial', bold: false, italic: false, alignment: 'center', lineHeight: 1.4, marginTop: 4, marginBottom: 4, color: '#666666', listType: null, listLevel: 0 },
];

export const FONTS = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Tahoma', 'Impact', 'Comic Sans MS', 'Trebuchet MS', 'Arial Black', 'Lucida Console', 'Palatino Linotype', 'Century Gothic', 'Calibri', 'Cambria', 'Consolas'];

export const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 42, 48, 56, 64, 72];
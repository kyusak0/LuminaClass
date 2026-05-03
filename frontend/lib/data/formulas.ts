export const evaluateFormula = (formula: string, data: any[][]): any => {
  try {
    formula = formula.trim();
    
    // Поддержка простых арифметических выражений
    if (/^[\d\s\+\-\*\/\(\)\.]+$/.test(formula)) {
      try {
        // Безопасное вычисление
        const result = Function('"use strict"; return (' + formula + ')')();
        if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
          return Math.round(result * 100) / 100;
        }
        return result;
      } catch {
        return '#ERROR!';
      }
    }
    
    // Проверка на функцию
    const match = formula.match(/^(\w+)\((.*)\)$/i);
    if (!match) {
      // Если не функция и не арифметика, пробуем как ссылку на ячейку
      const cellValue = getCellValue(formula, data);
      if (cellValue !== null) {
        return cellValue;
      }
      return '#ERROR!';
    }

    const func = match[1].toUpperCase();
    const args = match[2];

    let result;
    switch (func) {
      case 'SUM':
        result = sumRange(args, data);
        break;
      case 'AVERAGE':
        result = averageRange(args, data);
        break;
      case 'MAX':
        result = maxRange(args, data);
        break;
      case 'MIN':
        result = minRange(args, data);
        break;
      case 'COUNT':
        result = countRange(args, data);
        break;
      default:
        return '#NAME?';
    }
    
    if (result.toString() === '#ERROR!' || result.toString() === '#VALUE!' || isNaN(result) || !isFinite(result)) {
      return '#ERROR!';
    }
    
    return typeof result === 'number' ? Math.round(result * 100) / 100 : result;
  } catch (error) {
    console.error('Formula evaluation error:', error);
    return '#ERROR!';
  }
};

// Получить значение ячейки по ссылке (например, A1)
const getCellValue = (reference: string, data: any[][]): any | null => {
  const match = reference.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;
  
  const col = colLetterToIndex(match[1]);
  const row = parseInt(match[2]) - 1;
  
  if (data[row] && data[row][col] !== undefined) {
    const value = data[row][col];
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
      return parseFloat(value);
    }
    return value;
  }
  
  return null;
};

const parseRange = (range: string, data: any[][]): any[] => {
  try {
    // Поддерживаем форматы: A1:B10, A:A, 1:1
    if (range.includes(':')) {
      const [start, end] = range.split(':');
      
      // Если это диапазон столбцов (A:B)
      if (start.match(/^[A-Z]+$/) && end.match(/^[A-Z]+$/)) {
        const startCol = colLetterToIndex(start);
        const endCol = colLetterToIndex(end);
        const values = [];
        for (let row = 0; row < data.length; row++) {
          for (let col = startCol; col <= endCol; col++) {
            const value = data[row]?.[col];
            if (isNumeric(value)) {
              values.push(Number(value));
            }
          }
        }
        return values;
      }
      
      // Если это диапазон строк (1:10)
      if (start.match(/^\d+$/) && end.match(/^\d+$/)) {
        const startRow = parseInt(start) - 1;
        const endRow = parseInt(end) - 1;
        const values = [];
        for (let row = startRow; row <= endRow && row < data.length; row++) {
          for (let col = 0; col < (data[row]?.length || 0); col++) {
            const value = data[row]?.[col];
            if (isNumeric(value)) {
              values.push(Number(value));
            }
          }
        }
        return values;
      }
      
      // Обычный диапазон A1:B10
      const startCol = start.match(/[A-Z]+/)?.[0] || '';
      const startRow = parseInt(start.match(/\d+/)?.[0] || '1') - 1;
      const endCol = end.match(/[A-Z]+/)?.[0] || '';
      const endRow = parseInt(end.match(/\d+/)?.[0] || '1') - 1;
      
      if (!startCol || !endCol) return [];
      
      const startColIndex = colLetterToIndex(startCol);
      const endColIndex = colLetterToIndex(endCol);
      
      const values = [];
      for (let row = startRow; row <= endRow && row < data.length; row++) {
        for (let col = startColIndex; col <= endColIndex && col < (data[row]?.length || 0); col++) {
          const value = data[row]?.[col];
          if (isNumeric(value)) {
            values.push(Number(value));
          }
        }
      }
      return values;
    }
    
    // Одиночная ячейка, например A1
    const colMatch = range.match(/[A-Z]+/);
    const rowMatch = range.match(/\d+/);
    
    if (colMatch && rowMatch) {
      const col = colLetterToIndex(colMatch[0]);
      const row = parseInt(rowMatch[0]) - 1;
      const value = data[row]?.[col];
      return isNumeric(value) ? [Number(value)] : [];
    }
    
    return [];
  } catch (error) {
    console.error('Error parsing range:', error);
    return [];
  }
};

const colLetterToIndex = (letter: string): number => {
  let index = 0;
  for (let i = 0; i < letter.length; i++) {
    index = index * 26 + (letter.charCodeAt(i) - 64);
  }
  return index - 1;
};

const isNumeric = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return !isNaN(value) && isFinite(value);
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num) && value.trim() !== '';
  }
  return false;
};

const sumRange = (range: string, data: any[][]): number => {
  const values = parseRange(range, data);
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0);
};

const averageRange = (range: string, data: any[][]): number => {
  const values = parseRange(range, data);
  if (values.length === 0) return 0;
  return sumRange(range, data) / values.length;
};

const maxRange = (range: string, data: any[][]): number => {
  const values = parseRange(range, data);
  if (values.length === 0) return 0;
  return Math.max(...values);
};

const minRange = (range: string, data: any[][]): number => {
  const values = parseRange(range, data);
  if (values.length === 0) return 0;
  return Math.min(...values);
};

const countRange = (range: string, data: any[][]): number => {
  const values = parseRange(range, data);
  return values.length;
};
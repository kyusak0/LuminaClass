'use client';

import { useState, useEffect, useRef } from 'react';

interface ExcelEditorProps {
  initialData: any;
  onChange: (data: any[][]) => void;
}

export default function ExcelEditor({ initialData, onChange }: ExcelEditorProps) {
  const [data, setData] = useState<any[][]>([]);
  const [formulas, setFormulas] = useState<Record<string, string>>({});
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
  const [editingValue, setEditingValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isFirstRender = useRef(true);

  // Инициализация данных - только один раз
  useEffect(() => {
    if (isFirstRender.current && initialData) {
      let initialArray: any[][] = [];

      if (Array.isArray(initialData) && initialData.length > 0) {
        if (Array.isArray(initialData[0])) {
          initialArray = initialData;
        } else {
          initialArray = initialData.map(item => [item]);
        }
      } else {
        initialArray = [['', '', ''], ['', '', ''], ['', '', '']];
      }

      setData(initialArray);
      isFirstRender.current = false;
    }
  }, [initialData]);

  // Вычисление значения формулы
  const calculateFormula = (formula: string, currentData: any[][]): any => {
    if (!formula.startsWith('=')) return formula;

    const expr = formula.slice(1).trim();

    // Простые арифметические операции
    if (/^[\d\s\+\-\*\/\(\)\.]+$/.test(expr)) {
      try {
        const result = Function('"use strict"; return (' + expr + ')')();
        return typeof result === 'number' ? Math.round(result * 100) / 100 : result;
      } catch {
        return '#ERROR!';
      }
    }

    // Ссылки на ячейки A1+B1
    const cellRefs = expr.match(/[A-Z]+\d+/gi);
    let expression = expr;

    if (cellRefs) {
      for (const ref of cellRefs) {
        const colMatch = ref.match(/[A-Z]+/);
        const rowMatch = ref.match(/\d+/);
        if (colMatch && rowMatch) {
          const col = colLetterToIndex(colMatch[0]);
          const row = parseInt(rowMatch[0]) - 1;
          const cellValue = currentData[row]?.[col];
          const numValue = parseFloat(cellValue);
          const value = !isNaN(numValue) ? numValue : 0;
          expression = expression.replace(new RegExp(ref, 'g'), value.toString());
        }
      }
    }

    // Вычисляем результат
    try {
      const result = Function('"use strict"; return (' + expression + ')')();
      return typeof result === 'number' ? Math.round(result * 100) / 100 : result;
    } catch {
      return '#ERROR!';
    }
  };

  // Пересчет всех формул
  const recalculateAllFormulas = (currentData: any[][]): any[][] => {
    const newData = JSON.parse(JSON.stringify(currentData));
    let changed = false;

    for (let i = 0; i < newData.length; i++) {
      for (let j = 0; j < newData[i].length; j++) {
        const cell = newData[i][j];
        const formulaKey = `${i},${j}`;
        const formula = formulas[formulaKey];

        if (formula && formula.startsWith('=')) {
          const newValue = calculateFormula(formula, newData);
          if (JSON.stringify(newValue) !== JSON.stringify(cell)) {
            newData[i][j] = newValue;
            changed = true;
          }
        }
      }
    }

    if (changed) {
      return recalculateAllFormulas(newData);
    }

    return newData;
  };

  const colLetterToIndex = (letter: string): number => {
    let index = 0;
    for (let i = 0; i < letter.length; i++) {
      index = index * 26 + (letter.charCodeAt(i) - 64);
    }
    return index - 1;
  };

  const getColumnLetter = (index: number): string => {
    let letter = '';
    let i = index;
    while (i >= 0) {
      letter = String.fromCharCode(65 + (i % 26)) + letter;
      i = Math.floor(i / 26) - 1;
    }
    return letter;
  };

  // Обновление ячейки
  const updateCell = (row: number, col: number, value: string) => {
    const formulaKey = `${row},${col}`;
    let newValue: any = value;

    if (value.startsWith('=')) {
      // Сохраняем формулу
      setFormulas(prev => ({ ...prev, [formulaKey]: value }));
      // Вычисляем значение
      newValue = calculateFormula(value, data);
    } else {
      // Удаляем формулу если она была
      if (formulas[formulaKey]) {
        const newFormulas = { ...formulas };
        delete newFormulas[formulaKey];
        setFormulas(newFormulas);
      }
      // Проверяем, является ли число
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && isFinite(numValue) && value.trim() !== '') {
        newValue = numValue;
      }
    }

    // Обновляем данные
    const newData = JSON.parse(JSON.stringify(data));
    if (!newData[row]) newData[row] = [];
    newData[row][col] = newValue;

    // Пересчитываем все формулы
    const recalculatedData = recalculateAllFormulas(newData);
    setData(recalculatedData);

    // Уведомляем родителя
    onChange(recalculatedData);
  };

  // Получение отображаемого значения
  const getDisplayValue = (row: number, col: number): string => {
    const formulaKey = `${row},${col}`;
    const formula = formulas[formulaKey];

    if (showFormulas && formula) {
      return formula;
    }

    const cellValue = data[row]?.[col];
    if (cellValue === '#ERROR!') return '#ERROR!';
    if (typeof cellValue === 'number') return cellValue.toString();
    return cellValue || '';
  };

  // Получение значения для редактирования
  const getEditValue = (row: number, col: number): string => {
    const formulaKey = `${row},${col}`;
    const formula = formulas[formulaKey];
    if (formula) return formula;

    const cellValue = data[row]?.[col];
    if (typeof cellValue === 'number') return cellValue.toString();
    return cellValue || '';
  };

  // Проверка, является ли ячейка формулой
  const isFormulaCell = (row: number, col: number): boolean => {
    const formulaKey = `${row},${col}`;
    return !!formulas[formulaKey];
  };

  const startEditing = (row: number, col: number) => {
    setSelectedCell({ row, col });
    setEditingValue(getEditValue(row, col));
    setIsEditing(true);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 10);
  };

  const saveEditing = () => {
    if (isEditing) {
      updateCell(selectedCell.row, selectedCell.col, editingValue);
      setIsEditing(false);
      setEditingValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEditing();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditing(false);
      setEditingValue('');
    }
  };

  const addRow = () => {
    const newRow = new Array(data[0]?.length || 3).fill('');
    const newData = [...data, newRow];
    setData(newData);
    onChange(newData);
  };

  const addColumn = () => {
    const newData = data.map(row => [...row, '']);
    setData(newData);
    onChange(newData);
  };

  const deleteRow = () => {
    if (data.length > 1) {
      const newData = data.slice(0, -1);
      setData(newData);
      onChange(newData);
    }
  };

  const deleteColumn = () => {
    if (data[0] && data[0].length > 1) {
      const newData = data.map(row => row.slice(0, -1));
      setData(newData);
      onChange(newData);
    }
  };

  const hasData = data && data.length > 0;
  const columnCount = hasData && data[0] ? data[0].length : 3;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b p-2 bg-gray-50 flex gap-2 flex-wrap shrink-0">
        <button onClick={addRow} className="px-3 py-1 bg-bg text-main uppercase border-2 border-main font-medium rounded  text-sm" title='Добавить Строку'>
          + строка
        </button>
        <button onClick={deleteRow} className="px-3 py-1 bg-bg text-main uppercase border-2 border-main font-medium rounded text-sm" title='Удалить Строку'>
          - строка
        </button>
        <button onClick={addColumn} className="px-3 py-1 bg-bg text-main uppercase border-2 border-main font-medium rounded" title='Добавить Колонку'>
          + колонка
        </button>
        <button onClick={deleteColumn} className="px-3 py-1 bg-bg text-main uppercase border-2 border-main font-medium rounded text-sm" title='Удалить Колонку'>
          - колонка
        </button>
        <button
          onClick={() => setShowFormulas(!showFormulas)}
          className={`px-3 py-1 text-sm rounded transition-colors border-2 border-main ${showFormulas ? 'bg-main text-white' : 'bg-bg text-main'
            }`}
        >
          {showFormulas ? '- Скрыть формулы' : '* Показать формулы'}
        </button>
        <div className="flex-1" />
        <div className="text-sm text-gray-600 flex items-center gap-2">
          <span className="font-medium">Строка формул:</span>
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={saveEditing}
              className="px-2 py-1 border rounded text-sm w-96 font-mono bg-white"
              placeholder="=1+1 or =A1+B1"
            />
          ) : (
            <div
              className="px-2 py-1 border rounded text-sm w-96 font-mono bg-gray-100 cursor-pointer truncate"
              onClick={() => startEditing(selectedCell.row, selectedCell.col)}
            >
              {getEditValue(selectedCell.row, selectedCell.col) || 'Click to edit'}
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        {!hasData ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Загружаем таблицу...</p>
          </div>
        ) : (
          <table className="border-collapse w-full min-w-[600px]">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="border p-2 bg-gray-100 w-10"></th>
                {Array.from({ length: columnCount }).map((_, colIndex) => (
                  <th key={colIndex} className="border p-2 bg-gray-100 min-w-[100px]">
                    {getColumnLetter(colIndex)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="border p-2 bg-gray-100 text-center font-medium sticky left-0 z-10">
                    {rowIndex + 1}
                  </td>
                  {Array.from({ length: columnCount }).map((_, colIndex) => {
                    const displayValue = getDisplayValue(rowIndex, colIndex);
                    const isError = displayValue === '#ERROR!';
                    const isFormula = isFormulaCell(rowIndex, colIndex);
                    const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;

                    return (
                      <td
                        key={colIndex}
                        className={`border p-0 cursor-pointer ${isSelected ? 'bg-blue-100 ring-2 ring-blue-400' : ''
                          } ${isError ? 'bg-red-50' : ''} ${isFormula && !showFormulas ? 'bg-green-50' : ''}`}
                        onClick={() => startEditing(rowIndex, colIndex)}
                      >
                        <div className="w-full px-2 py-1 min-h-[34px]">
                          <span className={`
                            ${isError ? 'text-red-600' : ''}
                            ${isFormula && !showFormulas ? 'text-green-600 italic' : 'text-gray-800'}
                          `}>
                            {displayValue || ''}
                          </span>
                          {isFormula && !showFormulas && (
                            <span className="text-xs text-green-500 ml-1 opacity-50">fx</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info panel */}
      <div className="border-t p-2 bg-gray-50 text-xs text-gray-600 shrink-0">
        <div className="flex gap-4 flex-wrap">
          <span>📊 Строки: {data.length}</span>
          <span>📈 Колонки: {columnCount}</span>
          <span>📍 Выбрана: {getColumnLetter(selectedCell.col)}{selectedCell.row + 1}</span>
          <span className="text-main">Зеленый означает наличие формулы</span>
          <span className="text-red-600">Красный означает ошибку формулы</span>
        </div>
        <div className="mt-1 text-gray-400">
          💡 Подсказка: Формула начинается с "=" | Нажмите на ячейку для редактирования | "Enter" для сохранения значения ячейки | "Esc" для сброса значения ячейки
        </div>
      </div>
    </div>
  );
}
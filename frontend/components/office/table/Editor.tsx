'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type ExcelCell = {
  value: string;
  formula?: string;
};

type SelectionRange = {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
};

interface ExcelEditorProps {
  initialData?: ExcelCell[][];
  initialHeaders?: string[];
  viewMode: 'view' | 'edit';
  onDataChange?: (data: ExcelCell[][]) => void; // Убрали headers из параметров
}

const getColumnLetter = (index: number): string => {
  let result = '';
  let n = index;
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
};

// Генерация заголовков на основе данных
const generateHeaders = (data: ExcelCell[][]): string[] => {
  const maxCols = Math.max(...data.map(row => row.length), 1);
  return Array.from({ length: maxCols }, (_, i) => getColumnLetter(i));
};

export default function ExcelEditor({ 
  initialData = [[{ value: '' }, { value: '' }], [{ value: '' }, { value: '' }]],
  viewMode,
  onDataChange 
}: ExcelEditorProps) {
  const [excelData, setExcelData] = useState<ExcelCell[][]>(() => {
    if (initialData && initialData.length > 0) return initialData;
    return [[{ value: '' }, { value: '' }], [{ value: '' }, { value: '' }]];
  });
  
  // Заголовки генерируются автоматически, не хранятся в состоянии
  const excelHeaders = generateHeaders(excelData);
  
  const [selection, setSelection] = useState<SelectionRange | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number; value: string } | null>(null);
  const [formulaBarValue, setFormulaBarValue] = useState('');
  const [isSelectingForFormula, setIsSelectingForFormula] = useState(false);
  const [pendingFormulaCell, setPendingFormulaCell] = useState<{ row: number; col: number } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const formulaBarRef = useRef<HTMLInputElement>(null);

  const columnToNumber = (col: string): number => {
    let result = 0;
    for (let i = 0; i < col.length; i++) {
      result = result * 26 + (col.charCodeAt(i) - 64);
    }
    return result - 1;
  };

  const numberToColumn = (num: number): string => {
    return getColumnLetter(num);
  };

  const getCellRef = (row: number, col: number): string => {
    return `${numberToColumn(col)}${row + 1}`;
  };

  const getRangeRef = (range: SelectionRange): string => {
    const startRef = getCellRef(range.startRow, range.startCol);
    const endRef = getCellRef(range.endRow, range.endCol);
    return `${startRef}:${endRef}`;
  };

  const hasSelfReference = (formula: string, currentRow: number, currentCol: number): boolean => {
    const currentRef = getCellRef(currentRow, currentCol);
    const regex = new RegExp(`\\b${currentRef}\\b`, 'i');
    return regex.test(formula);
  };

  const evaluateCellValue = useCallback((cell: ExcelCell, row: number, col: number, data: ExcelCell[][]): string => {
    if (!cell.formula) return cell.value;
    
    if (hasSelfReference(cell.formula, row, col)) {
      return '#ЦИКЛ!';
    }
    
    let formula = cell.formula;
    
    const sumMatch = formula.match(/SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/i);
    if (sumMatch) {
      const startCol = columnToNumber(sumMatch[1].toUpperCase());
      const startRow = parseInt(sumMatch[2]) - 1;
      const endCol = columnToNumber(sumMatch[3].toUpperCase());
      const endRow = parseInt(sumMatch[4]) - 1;
      let sum = 0;
      for (let i = startRow; i <= endRow; i++) {
        for (let j = startCol; j <= endCol; j++) {
          if (data[i] && data[i][j] !== undefined) {
            if (i === row && j === col) return '#ЦИКЛ!';
            const val = parseFloat(data[i][j].value);
            if (!isNaN(val)) sum += val;
          }
        }
      }
      return sum.toString();
    }
    
    if (formula.startsWith('=')) {
      let expr = formula.substring(1);
      const cellRefRegex = /([A-Z]+)(\d+)/gi;
      expr = expr.replace(cellRefRegex, (match, colLetter, rowNum) => {
        const colNum = columnToNumber(colLetter);
        const rowNumInt = parseInt(rowNum) - 1;
        if (rowNumInt === row && colNum === col) return 'NaN';
        if (data[rowNumInt] && data[rowNumInt][colNum] !== undefined) {
          const val = parseFloat(data[rowNumInt][colNum].value);
          return isNaN(val) ? '0' : val.toString();
        }
        return '0';
      });
      try {
        const result = new Function('return (' + expr + ')')();
        return isNaN(result) ? '#ОШИБКА!' : result.toString();
      } catch {
        return '#ОШИБКА!';
      }
    }
    return cell.value;
  }, []);

  const updateAllFormulas = useCallback(() => {
    const newData = JSON.parse(JSON.stringify(excelData));
    let hasChanges = false;
    
    for (let pass = 0; pass < 10; pass++) {
      let changed = false;
      for (let row = 0; row < excelData.length; row++) {
        for (let col = 0; col < excelData[row].length; col++) {
          const cell = excelData[row][col];
          if (cell?.formula) {
            const newValue = evaluateCellValue(cell, row, col, newData);
            if (newData[row][col].value !== newValue) {
              newData[row][col].value = newValue;
              changed = true;
              hasChanges = true;
            }
          }
        }
      }
      if (!changed) break;
    }
    
    if (hasChanges) {
      setExcelData(newData);
      onDataChange?.(newData);
    }
  }, [excelData, onDataChange, evaluateCellValue]);

  const updateCell = useCallback((row: number, col: number, value: string, shouldEvaluate: boolean = true) => {
    const newData = JSON.parse(JSON.stringify(excelData));
    if (!newData[row]) newData[row] = [];
    
    const isFormula = value.startsWith('=');
    
    if (isFormula) {
      if (hasSelfReference(value, row, col)) {
        newData[row][col] = { formula: value, value: '#ЦИКЛ!' };
      } else {
        newData[row][col] = { formula: value, value: '' };
        if (shouldEvaluate) {
          const computedValue = evaluateCellValue(newData[row][col], row, col, newData);
          newData[row][col].value = computedValue;
        } else {
          newData[row][col].value = value;
        }
      }
    } else {
      newData[row][col] = { value: value };
    }
    
    setExcelData(newData);
    onDataChange?.(newData);
    setTimeout(() => updateAllFormulas(), 0);
  }, [excelData, onDataChange, evaluateCellValue, updateAllFormulas]);

  const addRow = useCallback((afterRow: number) => {
    const newRow = excelHeaders.map(() => ({ value: '' }));
    const newData = [...excelData];
    newData.splice(afterRow + 1, 0, newRow);
    setExcelData(newData);
    onDataChange?.(newData);
    return afterRow + 1;
  }, [excelData, excelHeaders, onDataChange]);

  const startEditingCell = useCallback((row: number, col: number) => {
    if (viewMode !== 'edit') return;
    const cell = excelData[row]?.[col];
    const currentValue = cell?.formula || cell?.value || '';
    setEditingCell({ row, col, value: currentValue });
    setActiveCell({ row, col });
    setFormulaBarValue(currentValue);
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 10);
  }, [viewMode, excelData]);

  const finishEditingCell = useCallback(() => {
    if (editingCell) {
      updateCell(editingCell.row, editingCell.col, editingCell.value, true);
    }
    setEditingCell(null);
    setIsSelectingForFormula(false);
    setPendingFormulaCell(null);
    setSelection(null);
  }, [editingCell, updateCell]);

  const moveToCellBelow = useCallback(() => {
    if (!activeCell) return;
    const { row, col } = activeCell;
    const nextRow = row + 1;
    if (nextRow >= excelData.length) {
      const newRowIndex = addRow(row);
      setTimeout(() => startEditingCell(newRowIndex, col), 10);
    } else {
      startEditingCell(nextRow, col);
    }
  }, [activeCell, excelData.length, addRow, startEditingCell]);

  const insertCellReference = useCallback((row: number, col: number) => {
    if (editingCell && editingCell.value.startsWith('=')) {
      const cellRef = getCellRef(row, col);
      const newValue = editingCell.value + cellRef;
      setEditingCell({ ...editingCell, value: newValue });
      setFormulaBarValue(newValue);
      setTimeout(() => editInputRef.current?.focus(), 0);
      return true;
    }
    return false;
  }, [editingCell]);

  const startRangeSelectionForFormula = useCallback((cell: { row: number; col: number }) => {
    setIsSelectingForFormula(true);
    setPendingFormulaCell(cell);
    setSelection(null);
  }, []);

  const finishRangeSelection = useCallback(() => {
    if (isSelectingForFormula && pendingFormulaCell && selection) {
      const rangeRef = getRangeRef(selection);
      const sumFormula = `=SUM(${rangeRef})`;
      updateCell(pendingFormulaCell.row, pendingFormulaCell.col, sumFormula, true);
      setActiveCell(pendingFormulaCell);
      setFormulaBarValue(sumFormula);
      setIsSelectingForFormula(false);
      setPendingFormulaCell(null);
      setSelection(null);
    }
  }, [isSelectingForFormula, pendingFormulaCell, selection, updateCell]);

  const insertSumForSelection = useCallback(() => {
    if (activeCell && selection) {
      const rangeRef = getRangeRef(selection);
      const sumFormula = `=SUM(${rangeRef})`;
      updateCell(activeCell.row, activeCell.col, sumFormula, true);
      setFormulaBarValue(sumFormula);
      setSelection(null);
    }
  }, [activeCell, selection, updateCell]);

  const getCellDisplayValue = useCallback((row: number, col: number): string => {
    return excelData[row]?.[col]?.value || '';
  }, [excelData]);

  const getCellFormula = useCallback((row: number, col: number): string => {
    return excelData[row]?.[col]?.formula || '';
  }, [excelData]);

  const deleteExcelRow = useCallback((rowIndex: number) => {
    if (viewMode !== 'edit') return;
    const newData = excelData.filter((_, i) => i !== rowIndex);
    setExcelData(newData);
    onDataChange?.(newData);
    if (activeCell?.row === rowIndex) setActiveCell(null);
    setTimeout(() => updateAllFormulas(), 0);
  }, [excelData, onDataChange, activeCell, viewMode, updateAllFormulas]);

  const addExcelColumn = useCallback(() => {
    if (viewMode !== 'edit') return;
    const newData = excelData.map(row => [...row, { value: '' }]);
    setExcelData(newData);
    onDataChange?.(newData);
  }, [excelData, onDataChange, viewMode]);

  const deleteExcelColumn = useCallback((colIndex: number) => {
    if (viewMode !== 'edit') return;
    const newData = excelData.map(row => row.filter((_, i) => i !== colIndex));
    setExcelData(newData);
    onDataChange?.(newData);
    if (activeCell?.col === colIndex) setActiveCell(null);
    setTimeout(() => updateAllFormulas(), 0);
  }, [excelData, onDataChange, activeCell, viewMode, updateAllFormulas]);

  const handleMouseDown = useCallback((row: number, col: number) => {
    if (viewMode !== 'edit') return;
    if (isSelectingForFormula) {
      setSelection({ startRow: row, startCol: col, endRow: row, endCol: col });
      setIsSelecting(true);
    } else if (!editingCell) {
      setIsSelecting(true);
      setSelection({ startRow: row, startCol: col, endRow: row, endCol: col });
    }
  }, [viewMode, isSelectingForFormula, editingCell]);

  const handleMouseEnter = useCallback((row: number, col: number) => {
    if (isSelecting && selection) {
      setSelection({ ...selection, endRow: row, endCol: col });
    }
  }, [isSelecting, selection]);

  const handleMouseUp = useCallback(() => {
    if (isSelecting) {
      setIsSelecting(false);
      if (isSelectingForFormula) finishRangeSelection();
    }
  }, [isSelecting, isSelectingForFormula, finishRangeSelection]);

  const isInSelection = useCallback((row: number, col: number): boolean => {
    if (!selection) return false;
    const minRow = Math.min(selection.startRow, selection.endRow);
    const maxRow = Math.max(selection.startRow, selection.endRow);
    const minCol = Math.min(selection.startCol, selection.endCol);
    const maxCol = Math.max(selection.startCol, selection.endCol);
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  }, [selection]);

  useEffect(() => {
    if (initialData && initialData.length > 0) setExcelData(initialData);
  }, [initialData]);

  useEffect(() => {
    updateAllFormulas();
  }, [updateAllFormulas]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting) {
        setIsSelecting(false);
        if (isSelectingForFormula) finishRangeSelection();
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSelecting, isSelectingForFormula, finishRangeSelection]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (selection && activeCell) insertSumForSelection();
        return;
      }
      
      if (viewMode !== 'edit') return;
      
      if (editingCell) {
        if (editingCell.value.startsWith('=')) {
          if (e.key === 'ArrowUp' && activeCell && activeCell.row > 0) {
            e.preventDefault();
            insertCellReference(activeCell.row - 1, activeCell.col);
          } else if (e.key === 'ArrowDown' && activeCell && activeCell.row < excelData.length - 1) {
            e.preventDefault();
            insertCellReference(activeCell.row + 1, activeCell.col);
          } else if (e.key === 'ArrowLeft' && activeCell && activeCell.col > 0) {
            e.preventDefault();
            insertCellReference(activeCell.row, activeCell.col - 1);
          } else if (e.key === 'ArrowRight' && activeCell && activeCell.col < excelHeaders.length - 1) {
            e.preventDefault();
            insertCellReference(activeCell.row, activeCell.col + 1);
          } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            finishEditingCell();
            setTimeout(() => moveToCellBelow(), 10);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setEditingCell(null);
            setIsSelectingForFormula(false);
            setPendingFormulaCell(null);
            setSelection(null);
          }
        } else {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            finishEditingCell();
            setTimeout(() => moveToCellBelow(), 10);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setEditingCell(null);
          }
        }
      } else if (activeCell) {
        if (e.key === 'Enter') {
          e.preventDefault();
          startEditingCell(activeCell.row, activeCell.col);
        } else if (e.key === 'ArrowUp' && activeCell.row > 0) {
          e.preventDefault();
          const newRow = activeCell.row - 1;
          setActiveCell({ row: newRow, col: activeCell.col });
          const formula = getCellFormula(newRow, activeCell.col);
          const value = getCellDisplayValue(newRow, activeCell.col);
          setFormulaBarValue(formula || value || '');
        } else if (e.key === 'ArrowDown' && activeCell.row < excelData.length - 1) {
          e.preventDefault();
          const newRow = activeCell.row + 1;
          setActiveCell({ row: newRow, col: activeCell.col });
          const formula = getCellFormula(newRow, activeCell.col);
          const value = getCellDisplayValue(newRow, activeCell.col);
          setFormulaBarValue(formula || value || '');
        } else if (e.key === 'ArrowLeft' && activeCell.col > 0) {
          e.preventDefault();
          const newCol = activeCell.col - 1;
          setActiveCell({ row: activeCell.row, col: newCol });
          const formula = getCellFormula(activeCell.row, newCol);
          const value = getCellDisplayValue(activeCell.row, newCol);
          setFormulaBarValue(formula || value || '');
        } else if (e.key === 'ArrowRight' && activeCell.col < excelHeaders.length - 1) {
          e.preventDefault();
          const newCol = activeCell.col + 1;
          setActiveCell({ row: activeCell.row, col: newCol });
          const formula = getCellFormula(activeCell.row, newCol);
          const value = getCellDisplayValue(activeCell.row, newCol);
          setFormulaBarValue(formula || value || '');
        } else if (/^[a-zA-Z0-9=+\-*/]$/.test(e.key) && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          startEditingCell(activeCell.row, activeCell.col);
          setTimeout(() => {
            if (editInputRef.current) {
              editInputRef.current.value = e.key;
              editInputRef.current.dispatchEvent(new Event('input'));
            }
          }, 10);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, editingCell, activeCell, finishEditingCell, startEditingCell, moveToCellBelow, excelData.length, excelHeaders.length, selection, insertSumForSelection, getCellDisplayValue, getCellFormula, insertCellReference]);

  if (viewMode === 'view') {
    return (
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-4 py-3 text-left text-xs font-medium text-gray-500">#</th>
              {excelHeaders.map((header, idx) => (
                <th key={idx} className="px-4 py-3 text-left text-sm font-mono font-semibold text-gray-700">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {excelData.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-xs text-gray-500 font-mono text-center">{rowIdx + 1}</td>
                {row.map((cell, colIdx) => {
                  const displayValue = cell?.value || '—';
                  const isError = displayValue === '#ОШИБКА!' || displayValue === '#ЦИКЛ!';
                  return (
                    <td key={colIdx} className={`px-4 py-2 text-sm font-mono ${isError ? 'text-red-500' : ''}`}>
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <div className="text-sm font-mono text-gray-500 bg-gray-100 px-3 py-2 rounded">fx</div>
        <input 
          ref={formulaBarRef}
          type="text" 
          value={formulaBarValue} 
          onChange={(e) => {
            setFormulaBarValue(e.target.value);
            if (activeCell) {
              updateCell(activeCell.row, activeCell.col, e.target.value, false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && activeCell) {
              e.preventDefault();
              updateCell(activeCell.row, activeCell.col, formulaBarValue, true);
              moveToCellBelow();
            }
          }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-main focus:border-transparent" 
          placeholder="Введите значение или начните с = для формулы" 
        />
      </div>
      
      <div className="flex gap-2 flex-wrap">
        <button 
          onClick={() => { if (activeCell) startRangeSelectionForFormula(activeCell); }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition"
          disabled={!activeCell}
        >
          📊 Выбрать диапазон для суммы
        </button>
        {selection && (
          <button 
            onClick={insertSumForSelection}
            className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition"
          >
            = Вставить сумму диапазона (Ctrl+S)
          </button>
        )}
        <button onClick={() => activeCell && addRow(activeCell.row)} className="px-4 py-2 text-main border-2 uppercase font-medium hover:bg-main hover:text-white rounded-lg transition">
          + Строка
        </button>
        <button onClick={addExcelColumn} className="px-4 py-2 text-main border-2 uppercase font-medium hover:bg-main hover:text-white rounded-lg transition">
          + Колонка
        </button>
      </div>

      <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded-lg">
        {isSelectingForFormula ? (
          <span>🔵 Выделите диапазон ячеек для суммы. После выделения формула SUM автоматически вставится в ячейку.</span>
        ) : selection ? (
          <span>📊 Выделен диапазон: {getRangeRef(selection)}. Нажмите "Вставить сумму" или Ctrl+S</span>
        ) : editingCell?.value.startsWith('=') ? (
          <span>🔢 Режим редактирования формулы. Стрелочки вставляют ссылки на ячейки. Enter - применить.</span>
        ) : (
          <span>💡 Нажмите "Выбрать диапазон для суммы", затем выделите мышью нужные ячейки</span>
        )}
      </div>

      <div ref={tableRef} className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-2 py-2 text-center text-xs font-medium text-gray-500">#</th>
              {excelHeaders.map((header, idx) => (
                <th key={idx} className="px-2 py-2 text-center font-mono text-sm font-semibold text-gray-700 bg-gray-100">
                  {idx == 0 ? (null): (<button onClick={() => deleteExcelColumn(idx-1)} className="text-red-500 hover:text-red-700 text-xs">✖</button> )}
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {excelData.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-gray-50">
                <td className="px-2 py-2 text-center text-xs text-gray-500 font-mono bg-gray-50">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => deleteExcelRow(rowIdx)} className="text-red-500 hover:text-red-700 text-xs">✖</button> 
                    <span>{rowIdx + 1}</span>
                  </div>
                </td>
                {row.map((cell, colIdx) => {
                  const displayValue = cell?.value || '—';
                  const isError = displayValue === '#ОШИБКА!' || displayValue === '#ЦИКЛ!';
                  const isActive = activeCell?.row === rowIdx && activeCell?.col === colIdx;
                  const isEditing = editingCell?.row === rowIdx && editingCell?.col === colIdx;
                  
                  return (
                    <td 
                      key={colIdx} 
                      className={`px-2 py-2 cursor-pointer font-mono ${isInSelection(rowIdx, colIdx) ? 'bg-blue-200' : ''} ${isActive && !isEditing ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                      onMouseDown={() => handleMouseDown(rowIdx, colIdx)}
                      onMouseEnter={() => handleMouseEnter(rowIdx, colIdx)}
                      onClick={() => {
                        if (!isSelecting && !editingCell) {
                          setActiveCell({ row: rowIdx, col: colIdx });
                          const cellFormula = getCellFormula(rowIdx, colIdx);
                          const cellValue = getCellDisplayValue(rowIdx, colIdx);
                          setFormulaBarValue(cellFormula || cellValue || '');
                        }
                      }}
                      onDoubleClick={() => startEditingCell(rowIdx, colIdx)}
                    >
                      {isEditing ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingCell.value}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setEditingCell({ ...editingCell, value: newValue });
                            setFormulaBarValue(newValue);
                          }}
                          onBlur={() => finishEditingCell()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              finishEditingCell();
                              setTimeout(() => moveToCellBelow(), 10);
                            } else if (e.key === 'Escape') {
                              setEditingCell(null);
                              setIsSelectingForFormula(false);
                              setPendingFormulaCell(null);
                              setSelection(null);
                            }
                          }}
                          className="w-full px-2 py-1 border border-blue-500 rounded text-sm font-mono focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <div className={`text-sm font-mono min-h-[24px] ${isError ? 'text-red-500' : ''}`}>
                          {displayValue}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
        <div className="font-semibold mb-1">📊 Поддерживаемые формулы:</div>
        <ul className="list-disc list-inside space-y-1">
          <li>=A1+B2 - базовые операции (+, -, *, /)</li>
          <li>=SUM(A1:B5) - сумма диапазона</li>
          <li>=A1*B2+C3 - сложные выражения</li>
        </ul>
        <div className="mt-2">⚠️ Ошибки:</div>
        <ul className="list-disc list-inside space-y-1">
          <li><span className="text-red-500">#ОШИБКА!</span> - синтаксическая ошибка в формуле</li>
          <li><span className="text-red-500">#ЦИКЛ!</span> - формула ссылается сама на себя</li>
        </ul>
        <div className="mt-2">💡 Советы: 
          <span className="ml-2">• Стрелочки - навигация по ячейкам</span>
          <span className="ml-2">• При редактировании формулы стрелочки вставляют ссылки</span>
          <span className="ml-2">• Enter - редактировать ячейку / применить формулу</span>
          <span className="ml-2">• Ctrl+S - вставить сумму выделенного диапазона</span>
          <span className="ml-2">• Названия колонок (A, B, C...) генерируются автоматически</span>
        </div>
      </div>
    </div>
  );
}
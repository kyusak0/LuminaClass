import { api } from "@/api";
import React, { ChangeEvent, MouseEvent, useEffect, useMemo, useState } from "react";
import Alert from "../alert/Alert";

// Типы данных
interface ColumnData {
    value: string | null;
    size: number;
    tag?: string;
    isLink?: string;
    add?: string;
    isFilter?: boolean;
    isAddOpt?: string;
    isNewPage?: boolean;
}

interface Column {
    title: string;
    key?: string;
    data: ColumnData;
}

export interface SearchRecord {
    id?: string | number;
    task_id?: number;
    title?: string;
    _uniqueKey?: any;
    columns: Column[];
}

interface Action {
    label: string;
    icon?: React.ReactNode;
    onClick: (record: SearchRecord) => void;
    className?: string | ((record: SearchRecord) => string);
    confirm?: boolean;
    confirmMessage?: string;
    getLabel?: (record: SearchRecord) => string;
}

interface FilterOption {
    value: string;
    label: string;
}

interface SearchTableProps {
    searchProps: SearchRecord[];
    taskNum?: string;
    paginateLink?: string;
    actions?: Action[];
    filterOptions?: FilterOption[];
    filterField?: string;
    onFilterChange?: (value: string) => void;
    disableInternalFilter?: boolean;
    onRowClick?: (record: SearchRecord) => void;
    // Компактный режим
    compactView?: boolean;
    studentNameField?: string;
    taskIdField?: string;
    gradeField?: string;
    // Дополнительные пропсы
    customRenderers?: {
        [key: string]: (value: any, record: SearchRecord) => React.ReactNode;
    };
    hideSearch?: boolean;
    hideFilters?: boolean;
}

// Интерфейс для компактного представления данных
interface CompactRecord {
    studentId: string | number;
    studentName: string;
    grades: Map<string, { value: string | null; originalRecord: SearchRecord }>;
    taskIds: string[];
    originalRecords: SearchRecord[];
}

export default function SearchTable({
    searchProps,
    taskNum,
    paginateLink,
    actions = [],
    filterOptions: externalFilterOptions,
    filterField,
    onFilterChange,
    disableInternalFilter = false,
    onRowClick,
    compactView = false,
    studentNameField = 'Пользователь',
    taskIdField = 'Задание',
    gradeField = 'Оценка',
    customRenderers = {},
    hideSearch = false,
    hideFilters = false
}: SearchTableProps) {
    // Состояния
    const [searchParam, setSearchParam] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('');
    const [alertMess, setAlertMess] = useState<{ content: any }>();
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [data, setData] = useState<SearchRecord[]>(searchProps);
    const [dataKey, setDataKey] = useState(0);

    // Автоматическое определение поля для фильтрации
    const autoFilterField = useMemo(() => {
        if (filterField) {
            return filterField;
        }

        if (searchProps.some(record => record.task_id !== undefined && record.task_id !== null)) {
            return 'task_id';
        }

        const firstRecord = searchProps[0];
        if (firstRecord?.columns) {
            const filterableColumn = firstRecord.columns.find(col => col.data.isFilter === true);
            if (filterableColumn) {
                return filterableColumn.key || filterableColumn.title;
            }
        }

        if (firstRecord?.columns?.[0]) {
            return firstRecord.columns[0].key || firstRecord.columns[0].title;
        }

        return 'task_id';
    }, [searchProps, filterField]);

    // Формирование filterOptions из данных
    const defaultFilterOptions = useMemo(() => {
        if (externalFilterOptions) {
            return externalFilterOptions;
        }

        const uniqueValues = new Map<string, string>();

        searchProps.forEach(record => {
            let value: string | number | undefined;
            let label: string;

            if (autoFilterField === 'task_id') {
                value = record.task_id;
                label = `Задание ${record.task_id || 'Без задания'}`;
            } else {
                const column = record.columns.find(col => {
                    const colKey = col.key || col.title;
                    return colKey === autoFilterField;
                });
                value = column?.data.value || '';
                label = String(value || 'Не указано');
            }

            if (value && value !== '' && value !== '0' && value !== 'null') {
                uniqueValues.set(String(value), label);
            }
        });

        const options: FilterOption[] = Array.from(uniqueValues.entries())
            .map(([value, label]) => ({
                value: String(value),
                label: String(label)
            }))
            .sort((a, b) => a.label.localeCompare(b.label));

        return options;
    }, [searchProps, externalFilterOptions, autoFilterField]);

    // Обновление данных при изменении пропсов
    useEffect(() => {
        setData(searchProps);
        setDataKey(prev => prev + 1);
    }, [searchProps]);

    // Фильтрация по заданию
    const filteredByTask = useMemo(() => {
        if (!taskNum || taskNum === '0') {
            return data;
        }
        const taskId = parseInt(taskNum);
        return data.filter(record => record.task_id === taskId);
    }, [taskNum, data, dataKey]);

    // Фильтрация по выпадающему списку
    const filteredBySelect = useMemo(() => {
        if (disableInternalFilter) {
            return filteredByTask;
        }

        if (!selectedFilter) {
            return filteredByTask;
        }

        return filteredByTask.filter(record => {
            if (autoFilterField === 'task_id') {
                return record.task_id?.toString() === selectedFilter;
            }

            const column = record.columns.find(col => {
                const colKey = col.key || col.title;
                return colKey === autoFilterField;
            });
            return column?.data.value?.toString() === selectedFilter;
        });
    }, [selectedFilter, filteredByTask, autoFilterField, disableInternalFilter]);

    // Поиск
    const filteredBySearch = useMemo(() => {
        if (!searchParam) {
            return filteredBySelect;
        }

        const currentSearchParam = searchParam.toLowerCase().trim().replace(/\s+/g, '');

        return filteredBySelect.filter((record) => {
            return record.columns.some((column: Column) => {
                if (column.data.isFilter === false) {
                    return false;
                }

                if (column.data.value) {
                    const searchString = String(column.data.value)
                        .toLowerCase()
                        .replace(/\s+/g, '');
                    return searchString.includes(currentSearchParam);
                }

                return false;
            });
        });
    }, [searchParam, filteredBySelect]);

    const showFilterDropdown = !disableInternalFilter && !hideFilters && defaultFilterOptions.length > 0;

    // Данные для отображения
    const displayData = useMemo(() => {
        return searchParam ? filteredBySearch : filteredBySelect;
    }, [searchParam, filteredBySearch, filteredBySelect]);

    // Преобразование данных для компактного режима
    const compactData = useMemo(() => {
        if (!compactView || !displayData.length) return [];

        const studentsMap = new Map<string | number, CompactRecord>();

        displayData.forEach(record => {
            // Находим имя ученика
            const studentNameColumn = record.columns.find(col =>
                col.title === studentNameField || col.key === studentNameField
            );
            const studentName = studentNameColumn?.data.value?.toString() || 'Неизвестный ученик';

            // Находим ID задания
            const taskIdColumn = record.columns.find(col =>
                col.title === taskIdField || col.key === taskIdField
            );
            const taskId = taskIdColumn?.data.value?.toString() || '';

            // Находим оценку
            const gradeColumn = record.columns.find(col =>
                col.title === gradeField || col.key === gradeField
            );
            const grade = gradeColumn?.data.value?.toString() || null;

            const studentId = record.id || studentName;

            if (!studentsMap.has(studentId)) {
                studentsMap.set(studentId, {
                    studentId,
                    studentName,
                    grades: new Map(),
                    taskIds: [],
                    originalRecords: []
                });
            }

            const studentData = studentsMap.get(studentId)!;
            studentData.grades.set(taskId, { value: grade, originalRecord: record });
            if (!studentData.taskIds.includes(taskId)) {
                studentData.taskIds.push(taskId);
            }
            studentData.originalRecords.push(record);
        });

        const result = Array.from(studentsMap.values());
        result.forEach(student => {
            student.taskIds.sort((a, b) => {
                const numA = parseInt(a);
                const numB = parseInt(b);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return a.localeCompare(b);
            });
        });

        return result;
    }, [displayData, compactView, studentNameField, taskIdField, gradeField]);

    // Пагинация
    const paginatedData = useMemo(() => {
        const dataToPaginate = compactView ? compactData : displayData;
        const startIndex = (currentPage - 1) * perPage;
        const endIndex = startIndex + perPage;
        return dataToPaginate.slice(startIndex, endIndex);
    }, [displayData, compactData, currentPage, perPage, compactView]);

    const totalItems = compactView ? compactData.length : displayData.length;
    const totalPages = Math.ceil(totalItems / perPage) || 1;

    // Сброс страницы при изменении фильтров
    useEffect(() => {
        setCurrentPage(1);
    }, [taskNum, searchParam, selectedFilter, searchProps, compactView]);

    // Пагинация с API
    const paginate = async (page: number) => {
        if (!paginateLink) {
            setCurrentPage(page);
            return;
        }

        try {
            const res = await api.paginate(paginateLink, page);
            if (res.data) {
                console.log('Paginated data:', res.data);
                setCurrentPage(page);
            }
        } catch (error: any) {
            console.error('Pagination error:', error);
            setAlertMess({
                content: (
                    <div>
                        <div>Ошибка пагинации:</div>
                        <div className="font-semibold my-1">{error.message}</div>
                    </div>
                )
            });
        }
    };

    // Обработчик изменения оценки
    const marksChange = async (e: ChangeEvent<HTMLSelectElement>, record: SearchRecord, column: Column) => {
        e.preventDefault();
        const newValue = e.target.value;

        updateColumnValue(record.id, column.key || column.title, newValue);

        try {
            const markData = {
                id: record.id,
                mark: newValue,
            };
            const res = await api.gradeTask(markData);
            const alertContent = (
                <div>
                    <div>Сообщение:</div>
                    <div className="font-semibold my-1">{res.message}</div>
                    <div className="text-xs text-gray-500">
                        в {new Date().toLocaleTimeString()}, {new Date().toLocaleDateString()}
                    </div>
                </div>
            );
            setAlertMess({ content: alertContent });
        } catch (error: any) {
            const alertContent = (
                <div>
                    <div>Ошибка:</div>
                    <div className="font-semibold my-1">{error.message}</div>
                    <div className="text-xs text-gray-500">
                        в {new Date().toLocaleTimeString()}, {new Date().toLocaleDateString()}
                    </div>
                </div>
            );
            setAlertMess({ content: alertContent });

            updateColumnValue(record.id, column.key || column.title, column.data.value);
        }
    };

    // Обновление значения в колонке
    const updateColumnValue = (rowId: string | number | undefined, columnKey: string, newValue: string | null) => {
        if (!rowId) return;

        setData(prevData => prevData.map(row => {
            if (row.id === rowId) {
                return {
                    ...row,
                    columns: row.columns.map((col: Column) => {
                        const colKey = col.key || col.title;
                        if (colKey === columnKey) {
                            return {
                                ...col,
                                data: {
                                    ...col.data,
                                    value: newValue
                                }
                            };
                        }
                        return col;
                    })
                };
            }
            return row;
        }));
    };

    // Копирование текста
    const copyText = async (event: MouseEvent) => {
        try {
            const text = event.currentTarget.textContent;
            if (text) {
                await navigator.clipboard.writeText(text);
                const alertContent = (
                    <div>
                        <div>Текст скопирован в буфер обмена:</div>
                        <div className="font-semibold my-1">{text}</div>
                        <div className="text-xs text-gray-500">
                            в {new Date().toLocaleTimeString()}, {new Date().toLocaleDateString()}
                        </div>
                    </div>
                );
                setAlertMess({ content: alertContent });
            }
        } catch (error: any) {
            const alertContent = (
                <div>
                    <div>Ошибка:</div>
                    <div className="font-semibold my-1">{error.message}</div>
                    <div className="text-xs text-gray-500">
                        в {new Date().toLocaleTimeString()}, {new Date().toLocaleDateString()}
                    </div>
                </div>
            );
            setAlertMess({ content: alertContent });
        }
    };

    // Получение ширины колонки
    const getColumnWidth = (size: number) => {
        return `${(size / 12) * 100}%`;
    };

    // Обработчик поиска
    const handleSearch = (value: string | ChangeEvent<HTMLInputElement>) => {
        const searchValue = typeof value === 'string'
            ? value
            : value.target.value;

        const currentSearchParam = searchValue.toLowerCase().trim().replace(/\s+/g, '');
        setSearchParam(currentSearchParam);

        if (currentSearchParam && filteredBySearch.length === 0) {
            setAlertMess({
                content: (
                    <div>
                        <div>По вашему запросу ничего не найдено:</div>
                        <div className="font-semibold my-1">"{currentSearchParam}"</div>
                        <div className="text-xs text-gray-500">
                            в {new Date().toLocaleTimeString()}, {new Date().toLocaleDateString()}
                        </div>
                    </div>
                )
            });
        } else if (currentSearchParam && filteredBySearch.length > 0) {
            setAlertMess(undefined);
        }
    };

    // Обработчик изменения выпадающего списка
    const handleFilterChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setSelectedFilter(value);
        if (onFilterChange) {
            onFilterChange(value);
        }
    };

    // Получение заголовка для выпадающего списка
    const getFilterLabel = useMemo(() => {
        if (autoFilterField === 'task_id') {
            return 'Задание';
        }

        const firstRecord = searchProps[0];
        const column = firstRecord?.columns.find(col => {
            const colKey = col.key || col.title;
            return colKey === autoFilterField;
        });

        return column?.title || autoFilterField;
    }, [autoFilterField, searchProps]);

    // Рендер компактной таблицы
    const renderCompactTable = () => {
        const compactRecords = paginatedData as CompactRecord[];
        if (!compactRecords.length) return null;

        const allTaskIds = new Set<string>();
        compactRecords.forEach(record => {
            record.taskIds.forEach(taskId => allTaskIds.add(taskId));
        });
        const sortedTaskIds = Array.from(allTaskIds).sort((a, b) => {
            const numA = parseInt(a);
            const numB = parseInt(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
        });

        return (
            <div className="overflow-x-auto rounded-lg overflow-hidden border-collapse border border-main">
                <table className="min-w-full">
                    <thead>
                        <tr>
                            <th className="border-main border px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase bg-white sticky left-0 bg-white z-10">
                                Ученик
                            </th>
                            {sortedTaskIds.map(taskId => (
                                <th
                                    key={taskId}
                                    className="border-main border px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase bg-white min-w-[80px]"
                                >
                                    {taskId}
                                </th>
                            ))}
                            {actions.length > 0 && (
                                <th className="border-main border px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase bg-white sticky right-0 bg-white z-10">
                                    Действие
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {compactRecords.map((record) => (
                            <tr key={record.studentId} className="hover:bg-gray-50">
                                <td className="border-main border px-3 py-2 text-sm sticky left-0 bg-white">
                                    {record.studentName}
                                </td>
                                {sortedTaskIds.map(taskId => {
                                    const grade = record.grades.get(taskId);
                                    return (
                                        <td
                                            key={`${record.studentId}-${taskId}`}
                                            className="border-main border px-3 py-2 text-center text-sm"
                                        >
                                            {grade?.value && grade.value !== 'null' && grade.value !== '—' ? (
                                                <span className={`font-medium ${grade.value === '5' ? 'text-green-600' :
                                                        grade.value === '2' ? 'text-red-600' :
                                                            'text-gray-700'
                                                    }`}>
                                                    {grade.value}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                    );
                                })}
                                {actions.length > 0 && (
                                    <td className="border-main border px-3 py-2 sticky right-0 bg-white">
                                        <div className="flex gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                                            {actions.map((action, idx) => {
                                                const originalRecord = record.originalRecords[0];
                                                return (
                                                    <ActionButton
                                                        key={idx}
                                                        action={action}
                                                        record={originalRecord}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    // Рендер ячейки с кастомным рендерером
    const renderCell = (column: Column, record: SearchRecord, columnIndex: number, recordIndex: number) => {
        const columnKey = column.key || column.title;

        if (customRenderers[columnKey]) {
            return customRenderers[columnKey](column.data.value, record);
        }

        if (column.data.tag === 'a') {
            return (
                <a
                    title={column.data.value?.toString()}
                    href={column.data.isLink}
                    target={column.data.isNewPage ? "_blank" : '_self'}
                    className="hover:text-main px-3 py-2 w-full inline-block"
                    onClick={(e) => e.stopPropagation()}
                >
                    {column.data.value}
                </a>
            );
        }

        // if (column.data.tag === 'select') {
        //     return (
        //         <select
        //             className="w-full h-10 px-2 border rounded"
        //             value={column.data.value || ''}
        //             onChange={(e) => marksChange(e, record, column)}
        //             onClick={(e) => e.stopPropagation()}
        //         >
        //             <option value="">Выберите</option>
        //             <option value="н/а">н/а</option>
        //             <option value="2">2</option>
        //             <option value="3">3</option>
        //             <option value="4">4</option>
        //             <option value="5">5</option>
        //         </select>
        //     );
        // }

        return (
            <div
                title={column.data.value?.toString()}
                className="text-left px-3 py-2 w-full"
                onDoubleClick={copyText as any}
            >
                {column.data.value}
            </div>
        );
    };

    // Рендер обычной таблицы
    const renderNormalTable = () => {
        const normalData = paginatedData as SearchRecord[];
        if (!normalData.length) return null;

        return (
            <div className="overflow-x-auto rounded-lg overflow-hidden border-collapse border border-main">
                <table className="min-w-full">
                    <thead>
                        <tr>
                            {data[0]?.columns?.map((column: Column, index: number) => (
                                <th
                                    key={`header-${index}`}
                                    className="border-main border px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase bg-white"
                                    style={{ width: getColumnWidth(column.data.size) }}
                                >
                                    {column.title}
                                </th>
                            ))}
                            {actions.length > 0 && (
                                <th className="border-main border px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase bg-white">
                                    Действие
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {normalData.map((record: SearchRecord & { _uniqueKey?: string }, recordIndex: number) => (
                            <tr
                                key={record._uniqueKey || `${record.task_id}_${record.id}_${recordIndex}`}
                                className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                                onClick={(e) => {
                                    if (onRowClick && !(e.target as HTMLElement).closest('.action-cell')) {
                                        onRowClick(record);
                                    }
                                }}
                            >
                                {record.columns.map((column: Column, columnIndex: number) => (
                                    <td
                                        key={`${recordIndex}-${columnIndex}`}
                                        className={`text-sm border-main border h-10 truncate ${column.data.add || ''}`}
                                    >
                                        {renderCell(column, record, columnIndex, recordIndex)}
                                    </td>
                                ))}
                                {actions.length > 0 && (
                                    <td className="text-sm border-main border px-3 py-2">
                                        <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                                            {actions.map((action, index) => (
                                                <ActionButton
                                                    key={index}
                                                    action={action}
                                                    record={record}
                                                />
                                            ))}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    // Компонент пагинации
    const PaginationComponent = () => {
        if (totalItems === 0) return null;

        const getVisiblePages = () => {
            const pages = [];
            const maxVisible = 5;

            if (totalPages <= maxVisible) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
            } else if (currentPage <= 3) {
                for (let i = 1; i <= maxVisible; i++) pages.push(i);
            } else if (currentPage >= totalPages - 2) {
                for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2);
            }

            return pages;
        };

        const visiblePages = getVisiblePages();

        return (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
                <div className="text-sm text-gray-600">
                    Показано {Math.min((currentPage - 1) * perPage + 1, totalItems)}-
                    {Math.min(currentPage * perPage, totalItems)} из {totalItems} записей
                    {compactView && (
                        <span className="ml-2 text-xs text-blue-600">(компактный режим)</span>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="px-3 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                        aria-label="Предыдущая страница"
                    >
                        ←
                    </button>

                    {visiblePages.map((pageNum) => (
                        <button
                            key={pageNum}
                            onClick={() => paginate(pageNum)}
                            className={`px-3 py-2 border rounded-lg ${currentPage === pageNum
                                ? 'bg-main text-white border-main'
                                : 'hover:bg-gray-50'
                                }`}
                        >
                            {pageNum}
                        </button>
                    ))}

                    <button
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="px-3 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                        aria-label="Следующая страница"
                    >
                        →
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">На странице:</span>
                    <select
                        className="border rounded-lg px-3 py-1.5 text-sm"
                        value={perPage}
                        onChange={(e) => {
                            setPerPage(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                    >
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                </div>
            </div>
        );
    };

    // Компонент кнопки действия
    const ActionButton: React.FC<{
        action: Action;
        record: SearchRecord;
    }> = ({ action, record }) => {
        const [showConfirm, setShowConfirm] = useState(false);

        const handleClick = () => {
            if (action.confirm && !showConfirm) {
                setShowConfirm(true);
                return;
            }

            action.onClick(record);
            if (action.confirm) {
                setShowConfirm(false);
            }
        };

        const handleCancel = () => {
            setShowConfirm(false);
        };

        const buttonLabel = action.getLabel ? action.getLabel(record) : action.label;
        const buttonClassName = typeof action.className === 'function'
            ? action.className(record)
            : action.className;

        return (
            <div className="relative">
                {showConfirm && action.confirmMessage && (
                    <div className="absolute bottom-full mb-2 left-0 bg-white border rounded-lg shadow-lg p-2 z-10 min-w-[200px]">
                        <p className="text-sm mb-2">{action.confirmMessage}</p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleClick}
                                className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                            >
                                Подтвердить
                            </button>
                            <button
                                onClick={handleCancel}
                                className="px-2 py-1 bg-gray-300 text-xs rounded hover:bg-gray-400"
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                )}
                <button
                    onClick={handleClick}
                    className={`px-3 py-1.5 text-sm rounded transition-colors ${buttonClassName || ''}`}
                    title={buttonLabel}
                >
                    {action.icon && <span className="mr-1">{action.icon}</span>}
                    {!action.icon && buttonLabel}
                </button>
            </div>
        );
    };

    return (
        <>
            {/* Панель фильтров */}
            {!hideSearch && (
                <div className="flex flex-col sm:flex-row justify-center mb-5 gap-2">
                    <form className="flex flex-1" onSubmit={(e) => e.preventDefault()}>
                        <input
                            type="search"
                            onChange={handleSearch}
                            placeholder="Поиск..."
                            className="w-full flex items-center justify-center px-8 py-3 border-l border-y border-green-600 text-base font-medium outline-transparent rounded-l-lg text-green-600 bg-white hover:bg-gray-50 md:py-2 md:text-lg md:px-2"
                        />
                        <button
                            type="submit"
                            className="w-1/4 flex items-center justify-center px-8 py-3 border-r border-y border-green-600 text-base font-medium rounded-r-lg text-green-600 bg-white hover:bg-gray-50 md:py-2 md:text-lg md:px-2"
                        >
                            🔍︎
                        </button>
                    </form>

                    {showFilterDropdown && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">{getFilterLabel}:</span>
                            <select
                                className="px-4 py-2 border border-green-600 rounded-lg bg-white text-green-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                                value={selectedFilter}
                                onChange={handleFilterChange}
                            >
                                <option value="">Все</option>
                                {defaultFilterOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        Обновить
                    </button>
                </div>
            )}

            {/* Таблица */}
            {compactView ? (
                paginatedData.length > 0 ? renderCompactTable() : (
                    <div className="text-center py-10 text-gray-500 border rounded-lg">
                        Нет данных для отображения
                    </div>
                )
            ) : (
                paginatedData.length > 0 ? renderNormalTable() : (
                    <div className="text-center py-10 text-gray-500 border rounded-lg">
                        Нет данных для отображения
                    </div>
                )
            )}

            {/* Пагинация */}
            <PaginationComponent />

            {/* Уведомления */}
            <Alert alert={alertMess?.content} />
        </>
    );
}
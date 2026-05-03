'use client';

import React, { useState, useEffect } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addMonths, 
  subMonths, 
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addDays,
  subDays,
  isBefore,
  isAfter
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { BookOpen, Calendar as CalendarIcon, Clock } from 'lucide-react';

interface Task {
  id: number;
  title: string;
  deadline: string;
  description?: string;
  completed?: boolean;
}

interface CalendarProps {
  onDateSelect?: (date: Date) => void;
  selectedDate?: Date | null;
  minDate?: Date;
  maxDate?: Date;
  showWeekends?: boolean;
  highlightToday?: boolean;
  className?: string;
  tasks?: Task[]; // Добавляем задачи
  onTaskClick?: (task: Task) => void; // Обработчик клика по задаче
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isWeekend: boolean;
  tasks: Task[]; // Задачи на этот день
}

const Calendar: React.FC<CalendarProps> = ({
  onDateSelect,
  selectedDate: externalSelectedDate,
  minDate,
  maxDate,
  showWeekends = true,
  highlightToday = true,
  className = '',
  tasks = [],
  onTaskClick
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    externalSelectedDate || new Date()
  );
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [hoveredTask, setHoveredTask] = useState<Task | null>(null);

  // Синхронизация с внешним selectedDate
  useEffect(() => {
    if (externalSelectedDate !== undefined) {
      setSelectedDate(externalSelectedDate);
      if (externalSelectedDate) {
        setCurrentMonth(externalSelectedDate);
      }
    }
  }, [externalSelectedDate]);

  // Группировка задач по датам
  const getTasksByDate = (date: Date): Task[] => {
    return tasks.filter(task => {
      const taskDate = new Date(task.deadline);
      return isSameDay(taskDate, date);
    });
  };

  // Генерация дней календаря
  useEffect(() => {
    const generateCalendarDays = () => {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Понедельник
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

      const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

      return days.map(date => ({
        date,
        isCurrentMonth: isSameMonth(date, currentMonth),
        isToday: highlightToday && isToday(date),
        isSelected: selectedDate ? isSameDay(date, selectedDate) : false,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        tasks: getTasksByDate(date)
      }));
    };

    setCalendarDays(generateCalendarDays());
  }, [currentMonth, selectedDate, highlightToday, tasks]);

  // Обработчики навигации
  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
    onDateSelect?.(today);
  };

  const handleDateClick = (day: CalendarDay) => {
    // Проверка ограничений даты
    if (minDate && day.date < minDate) return;
    if (maxDate && day.date > maxDate) return;

    setSelectedDate(day.date);
    onDateSelect?.(day.date);
  };

  const handlePrevDay = () => {
    if (selectedDate) {
      const prevDay = subDays(selectedDate, 1);
      if (!minDate || prevDay >= minDate) {
        setSelectedDate(prevDay);
        if (!isSameMonth(prevDay, currentMonth)) {
          setCurrentMonth(prevDay);
        }
        onDateSelect?.(prevDay);
      }
    }
  };

  const handleNextDay = () => {
    if (selectedDate) {
      const nextDay = addDays(selectedDate, 1);
      if (!maxDate || nextDay <= maxDate) {
        setSelectedDate(nextDay);
        if (!isSameMonth(nextDay, currentMonth)) {
          setCurrentMonth(nextDay);
        }
        onDateSelect?.(nextDay);
      }
    }
  };

  // Проверка доступности кнопок
  const isPrevDayDisabled = selectedDate 
    ? minDate ? selectedDate <= minDate : false 
    : true;
  
  const isNextDayDisabled = selectedDate 
    ? maxDate ? selectedDate >= maxDate : false 
    : true;

  // Получение задач для выбранной даты
  const selectedDateTasks = selectedDate ? getTasksByDate(selectedDate) : [];

  // Получение ближайшей задачи
  const getNearestTask = (): Task | null => {
    const now = new Date();
    const upcomingTasks = tasks
      .filter(task => new Date(task.deadline) >= now)
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    
    return upcomingTasks[0] || null;
  };

  const nearestTask = getNearestTask();

  // Форматирование дат
  const monthYear = format(currentMonth, 'LLLL yyyy', { locale: ru });
  const todayFormatted = format(new Date(), 'dd.MM.yyyy');
  const selectedDateFormatted = selectedDate 
    ? format(selectedDate, 'dd.MM.yyyy') 
    : 'Дата не выбрана';

  // Дни недели
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <div className={`rounded-lg p-2 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Предыдущий месяц"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h2 className="text-xl font-semibold text-gray-800 capitalize">
            {monthYear}
          </h2>
          
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Следующий месяц"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <button
          onClick={handleToday}
          className="px-3 py-1.5 bg-main text-white rounded-lg hover:bg-main-hover transition-colors text-sm"
        >
          Сегодня
        </button>
      </div>

      {/* Ближайшая задача */}
      {nearestTask && (
        <div className="mb-4 p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
          <div className="flex items-start gap-2">
            <div className="p-1.5 bg-orange-100 rounded-lg">
              <Clock className="w-4 h-4 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-orange-600 font-medium mb-1">Ближайшая задача</p>
              <p className="text-sm font-semibold text-gray-800">{nearestTask.title}</p>
              <p className="text-xs text-gray-600 mt-1">
                {format(new Date(nearestTask.deadline), 'dd MMMM yyyy, HH:mm', { locale: ru })}
              </p>
            </div>
            {onTaskClick && (
              <button
                onClick={() => onTaskClick(nearestTask)}
                className="text-xs text-main hover:text-main-hover font-medium"
              >
                Подробнее →
              </button>
            )}
          </div>
        </div>
      )}

      <div className="p-3 bg-gray-50 rounded-lg mb-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-500">Сегодня</p>
            <p className="text-sm font-medium">{todayFormatted}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Выбрана дата</p>
            <p className="text-sm font-medium">{selectedDateFormatted}</p>
          </div>
          <div className="flex space-x-1">
            <button
              onClick={handlePrevDay}
              disabled={isPrevDayDisabled}
              className={`p-1.5 rounded ${isPrevDayDisabled 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-gray-200 hover:bg-gray-300'}`}
              aria-label="Предыдущий день"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleNextDay}
              disabled={isNextDayDisabled}
              className={`p-1.5 rounded ${isNextDayDisabled 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-gray-200 hover:bg-gray-300'}`}
              aria-label="Следующий день"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={`text-center text-xs font-medium py-2 ${index >= 5 ? 'text-red-500' : 'text-gray-600'}`}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className="relative"
            onMouseEnter={() => day.tasks.length > 0 && setHoveredTask(day.tasks[0])}
            onMouseLeave={() => setHoveredTask(null)}
          >
            <button
              onClick={() => handleDateClick(day)}
              disabled={(!day.isCurrentMonth && !showWeekends) || 
                       (minDate && day.date < minDate) || 
                       (maxDate && day.date > maxDate)}
              className={`
                relative w-full aspect-square rounded-lg text-sm font-medium transition-all
                ${!day.isCurrentMonth 
                  ? 'text-gray-400 bg-gray-50 hover:bg-gray-100' 
                  : 'text-gray-700 hover:bg-blue-50'}
                ${day.isSelected 
                  ? 'bg-main text-white hover:bg-main-hover shadow-sm' 
                  : ''}
                ${day.isToday && !day.isSelected 
                  ? 'border-2 border-main' 
                  : ''}
                ${day.isWeekend && !day.isSelected && day.isCurrentMonth
                  ? 'text-red-500' 
                  : ''}
                ${((minDate && day.date < minDate) || (maxDate && day.date > maxDate))
                  ? 'opacity-50 cursor-not-allowed hover:bg-transparent'
                  : 'cursor-pointer'}
              `}
              aria-label={`Выбрать дату ${format(day.date, 'dd.MM.yyyy')}`}
              aria-current={day.isToday ? 'date' : undefined}
              aria-selected={day.isSelected}
            >
              <span className="relative z-10">
                {format(day.date, 'd')}
              </span>
              
              {/* Индикатор задач */}
              {day.tasks.length > 0 && (
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                  {day.tasks.slice(0, 3).map((_, idx) => (
                    <div 
                      key={idx}
                      className={`w-1 h-1 rounded-full ${day.isSelected ? 'bg-white' : 'bg-orange-500'}`}
                    />
                  ))}
                  {day.tasks.length > 3 && (
                    <div className={`w-1 h-1 rounded-full ${day.isSelected ? 'bg-white' : 'bg-orange-500'}`} />
                  )}
                </div>
              )}
            </button>

            {/* Tooltip с задачами */}
            {hoveredTask && day.tasks.includes(hoveredTask) && (
              <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg pointer-events-none">
                <p className="font-medium truncate">{hoveredTask.title}</p>
                <p className="text-gray-300 text-xs mt-1">
                  {format(new Date(hoveredTask.deadline), 'HH:mm')}
                </p>
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Задачи на выбранную дату */}
      {selectedDateTasks.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <CalendarIcon className="w-4 h-4 text-main" />
            <h3 className="text-sm font-semibold text-gray-800">
              Задачи на {format(selectedDate!, 'dd MMMM', { locale: ru })}
            </h3>
          </div>
          <div className="space-y-2">
            {selectedDateTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
              >
                <div className="p-1 bg-orange-100 rounded">
                  <BookOpen className="w-3 h-3 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate group-hover:text-main transition-colors">
                    {task.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(task.deadline), 'HH:mm')}
                  </p>
                </div>
                <div className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  →
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Легенда */}
      <div className="mt-4 pt-2 border-t border-gray-200">
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-600">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-main rounded mr-1.5"></div>
            <span>Выбрано</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 border-2 border-main rounded mr-1.5"></div>
            <span>Сегодня</span>
          </div>
          <div className="flex items-center">
            <div className="flex gap-0.5 mr-1.5">
              <div className="w-1 h-1 bg-orange-500 rounded-full"></div>
              <div className="w-1 h-1 bg-orange-500 rounded-full"></div>
            </div>
            <span>Есть задачи</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 text-red-500 mr-1.5">✕</div>
            <span>Выходной</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
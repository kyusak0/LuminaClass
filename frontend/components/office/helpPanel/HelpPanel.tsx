'use client';

import { useState } from 'react';

type HelpType = 'main' | 'word' | 'excel' | 'powerpoint' | null;

interface HelpPanelProps {
  type: HelpType;
  onClose: () => void;
}

export default function HelpPanel({ type, onClose }: HelpPanelProps) {
  if (!type) return null;

  const helpContent = {
    main: {
      title: 'Общая информация',
      icon: 'ℹ️',
      color: 'gray',
      sections: [
        {
          title: 'Основные возможности',
          items: [
            '📝 Текстовый редактор со списками и изображениями',
            '📊 Редактор таблиц с формулами как в Excel',
            '📽️ Создание презентаций с текстом и изображениями',
            '💾 Автоматическое сохранение данных в localStorage',
            '📁 Открытие и сохранение файлов на устройство'
          ]
        },
        {
          title: 'Горячие клавиши',
          items: [
            'Ctrl+S - Сохранить файл',
            'Ctrl+O - Открыть файл',
            'Ctrl+N - Создать новый файл (в разработке)'
          ]
        },
        {
          title: 'Советы',
          items: [
            '💾 Регулярно сохраняйте важные данные в файл',
            '🔄 Между разными типами документов данные независимы',
            '📋 Для справки по конкретному редактору нажмите соответствующую кнопку помощи'
          ]
        }
      ]
    },
    word: {
      title: 'Редактор документов Word',
      icon: '📝',
      color: 'blue',
      sections: [
        {
          title: 'Форматирование текста',
          items: [
            'Каждый абзац имеет ЕДИНЫЙ стиль',
            'Можно применять готовые стили: Обычный, Заголовки, Цитата, Подпись',
            'Ручное форматирование: шрифт, размер, жирный, курсив, цвет',
            'Выравнивание: по левому краю, центру, правому краю, по ширине'
          ]
        },
        {
          title: 'Работа со списками',
          items: [
            '• Маркированный список - кнопка "• Список"',
            '1. Нумерованный список - кнопка "1. Список"',
            'Tab - увеличить уровень вложенности в списке',
            'Shift+Tab - уменьшить уровень вложенности',
            'Enter в пустом элементе списка - выход из списка',
            'Backspace в начале элемента списка - выход из списка'
          ]
        },
        {
          title: 'Изображения',
          items: [
            '🖼️ Вставка изображений через кнопку "Вставить изображение"',
            '🖱️ Нажмите на изображение, затем перетащите за угол для изменения размера',
            '🗑️ Удалить изображение через панель изменения размера'
          ]
        },
        {
          title: 'Горячие клавиши',
          items: [
            'Ctrl+B - Жирный текст',
            'Ctrl+I - Курсив',
            'Tab - Увеличить отступ в списке',
            'Shift+Tab - Уменьшить отступ в списке',
            'Enter - Новый абзац',
            'Backspace в начале списка - Выйти из списка'
          ]
        }
      ]
    },
    excel: {
      title: 'Редактор таблиц Excel',
      icon: '📊',
      color: 'green',
      sections: [
        {
          title: 'Формулы',
          items: [
            '=A1+B2 - базовые арифметические операции',
            '=SUM(A1:B5) - сумма диапазона',
            '=AVERAGE(A1:B5) - среднее значение',
            '=MAX(A1:B5) - максимальное значение',
            '=MIN(A1:B5) - минимальное значение',
            '=A1+B2*C3 - сложные выражения со скобками',
            '=A1+5, =10*B2 - смешанные выражения'
          ]
        },
        {
          title: 'Работа с ячейками',
          items: [
            'Двойной клик по ячейке - редактирование',
            'Выделение - зажмите левую кнопку мыши и перетащите',
            'Строка формул (fx) для ввода значений и формул',
            'Формулы сохраняются и пересчитываются при открытии'
          ]
        },
        {
          title: 'Управление таблицей',
          items: [
            '➕ + Строка - добавить новую строку',
            '➕ + Колонка - добавить новый столбец',
            '✖️ - удалить строку или столбец',
            '📝 Заголовки столбцов можно редактировать'
          ]
        },
        {
          title: 'Горячие клавиши',
          items: [
            'Enter - применить формулу и перейти вниз',
            'Tab - применить формулу и перейти вправо',
            '= - начать ввод формулы'
          ]
        }
      ]
    },
    powerpoint: {
      title: 'Редактор презентаций PowerPoint',
      icon: '📽️',
      color: 'purple',
      sections: [
        {
          title: 'Работа со слайдами',
          items: [
            '➕ + Слайд - добавить новый слайд',
            '✖️ на слайде - удалить слайд',
            '◀ Предыдущий / Следующий ▶ - навигация по слайдам',
            'Миниатюры внизу - быстрый переход к слайду'
          ]
        },
        {
          title: 'Элементы слайда',
          items: [
            '📝 Текст - добавить текстовый блок на слайд',
            '🖼️ Изобр. - вставить изображение на слайд',
            '🖱️ Перетащите элемент мышью - изменить позицию',
            '⬆️ Вперед / ⬇️ Назад - управление слоями (Z-индекс)',
            '🗑️ Удалить - удалить элемент'
          ]
        },
        {
          title: 'Настройка элементов',
          items: [
            '🎨 Выберите цвет фона - изменить фон слайда',
            '📏 Размер шрифта - от 8 до 72px',
            '🔤 Шрифт - Arial, Times New Roman, Courier New и др.',
            '🎨 Цвет текста - выбор из палитры',
            '📐 Изменить размер - настройка ширины/высоты элемента'
          ]
        },
        {
          title: 'Советы',
          items: [
            'Сохраняйте пропорции при изменении размера изображений',
            'Используйте слои для правильного отображения элементов',
            'Просмотр - удобный способ показа презентации'
          ]
        }
      ]
    }
  };

  const content = helpContent[type];
  const colorClasses:any = {
    gray: 'bg-gray-50 border-gray-200 text-gray-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800'
  };

  return (
    <div className={`${colorClasses[content.color]} border rounded-lg p-4 mb-4 relative`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{content.icon}</span>
          <h3 className="font-semibold text-lg">{content.title}</h3>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 transition text-xl leading-none"
          title="Закрыть"
        >
          ✖
        </button>
      </div>
      
      <div className="space-y-4">
        {content.sections.map((section, idx) => (
          <div key={idx}>
            <h4 className="font-semibold mb-2 text-sm border-b pb-1">{section.title}</h4>
            <ul className="space-y-1">
              {section.items.map((item, itemIdx) => (
                <li key={itemIdx} className="text-xs flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-3 border-t text-xs opacity-75">
        💡 Подсказка: нажмите на кнопку помощи в любой момент, чтобы открыть эту справку
      </div>
    </div>
  );
}
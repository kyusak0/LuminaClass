'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Alert from '@/components/alert/Alert';
import { useAuth } from '@/context/authContext';
import RequiredSymbol from '@/components/requiredSymbol/RequiredSymbol';

interface RegistrationData {
    name: string;
    email: string;
    surname: string;
    tel: string;
    messanger: string;
    target: string;
    contactValue: string;
}

export default function RegisterPage() {
    const router = useRouter();

    const auth = useAuth();

    if(!auth) {
      return
    }

    const { user, get, post, loading: authLoading } = auth;
    const [loading, setLoading] = useState(false);
    const [alertMess, setAlertMess] = useState<{ content: any } | undefined>();
    
    const [formData, setFormData] = useState<RegistrationData>({
        name: '',
        email: '',
        surname: '',
        tel: '',
        messanger: 'sms',
        target: 'register',
        contactValue: '',
    });

    const [errors, setErrors] = useState<Partial<RegistrationData>>({});

    // Очистка номера телефона от всех нецифровых символов
    const cleanPhoneNumber = (value: string): string => {
        return value.replace(/\D/g, '');
    };

    // Форматирование номера телефона при вводе
    const formatPhoneNumber = (value: string): string => {
        const cleaned = cleanPhoneNumber(value);
        
        // Ограничиваем длину 11 цифрами (для российских номеров)
        if (cleaned.length > 11) {
            return value.slice(0, 18); // Обрезаем, если больше 11 цифр
        }
        
        // Форматируем как +7 (XXX) XXX-XX-XX
        if (cleaned.length === 0) return '';
        if (cleaned.length <= 1) return `+${cleaned}`;
        if (cleaned.length <= 4) return `+${cleaned.slice(0, 1)} (${cleaned.slice(1)}`;
        if (cleaned.length <= 7) return `+${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4)}`;
        if (cleaned.length <= 9) return `+${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
        return `+${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`;
    };

    // Валидация телефона
    const validatePhone = (value: string): string | null => {
        const cleaned = cleanPhoneNumber(value);
        
        if (!cleaned) {
            return 'Телефон обязателен';
        }
        
        // Проверка на допустимые символы (только цифры, +, пробелы, скобки, дефисы)
        const phoneRegex = /^[\d+\s\-\(\)]+$/;
        if (!phoneRegex.test(value)) {
            return 'Телефон может содержать только цифры и символы +, -, (, )';
        }
        
        // Проверка длины (должно быть 11 цифр для российских номеров)
        if (cleaned.length < 10) {
            return 'Телефон должен содержать минимум 10 цифр';
        }
        
        if (cleaned.length > 11) {
            return 'Телефон не может содержать больше 11 цифр';
        }
        
        // Проверка, что номер начинается с 7 или 8
        if (!cleaned.startsWith('7') && !cleaned.startsWith('8')) {
            return 'Номер должен начинаться с 7 или 8';
        }
        
        return null;
    };

    // Валидация email
    const validateEmail = (value: string): string | null => {
        if (!value.trim()) {
            return 'Email обязателен';
        }
        
        const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
        if (!emailRegex.test(value)) {
            return 'Введите корректный email (example@domain.com)';
        }
        
        if (value.length > 255) {
            return 'Email не может быть длиннее 255 символов';
        }
        
        return null;
    };

    // Определяем тип поля связи на основе выбранного способа
    const getContactFieldType = () => {
        switch(formData.messanger) {
            case 'email':
                return 'email';
            case 't.me':
                return 'tel';
            default:
                return 'tel';
        }
    };

    const showAlert = (message: string, type: 'success' | 'error' = 'success') => {
        const alertContent = (
            <div>
                <div className={`font-semibold ${type === 'error' ? 'text-red-600' : 'text-main'}`}>
                    {type === 'error' ? 'Ошибка' : 'Успех'}
                </div>
                <div className="my-1">{message}</div>
                <div className="text-xs text-gray-500">
                    {new Date().toLocaleTimeString()}, {new Date().toLocaleDateString()}
                </div>
            </div>
        );
        setAlertMess({ content: alertContent });
        
        // Автоматическое скрытие через 5 секунд
        setTimeout(() => {
            setAlertMess(undefined);
        }, 5000);
    };

    const getContactPlaceholder = () => {
        switch(formData.messanger) {
            case 'sms':
                return '+7 (999) 999-99-99';
            case 'email':
                return 'example@mail.com';
            case 't.me':
                return '+7 (999) 999-99-99';
            default:
                return 'Контактные данные';
        }
    };

    // Определяем иконку для поля связи
    const getContactIcon = () => {
        switch(formData.messanger) {
            case 'email':
                return (
                    <svg className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                );
            case 't.me':
                return (
                    <svg className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                );
            default:
                return (
                    <svg className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                );
        }
    };

    // Валидация поля связи в зависимости от способа
    const validateContact = (value: string, method: string): string | null => {
        if (!value.trim()) {
            return 'Контактные данные обязательны';
        }
        
        switch(method) {
            case 'email':
                return validateEmail(value);
            case 'sms':
                return validatePhone(value);
            case 't.me':
                return validatePhone(value);
            default:
                return null;
        }
    };

    const validateForm = (data: RegistrationData): Partial<RegistrationData> => {
        const newErrors: Partial<RegistrationData> = {};
        
        if (!data.surname?.trim()) {
            newErrors.surname = 'Фамилия обязательна';
        } else if (data.surname.trim().length < 2) {
            newErrors.surname = 'Фамилия должна содержать минимум 2 символа';
        } else if (data.surname.trim().length > 50) {
            newErrors.surname = 'Фамилия не может быть длиннее 50 символов';
        }
        
        if (!data.name?.trim()) {
            newErrors.name = 'Имя обязательно';
        } else if (data.name.trim().length < 2) {
            newErrors.name = 'Имя должно содержать минимум 2 символа';
        } else if (data.name.trim().length > 50) {
            newErrors.name = 'Имя не может быть длиннее 50 символов';
        }
        
        // Валидация динамического поля связи
        const contactError = validateContact(data.contactValue, data.messanger);
        if (contactError) {
            newErrors.contactValue = contactError;
        }
        
        return newErrors;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const messangerSelect = document.querySelector('#messanger') as HTMLSelectElement;
        const targetSelect = document.querySelector('#target') as HTMLSelectElement;
        
        // Подготавливаем данные для отправки
        const submitData: any = {
            name: formData.name.trim(),
            surname: formData.surname.trim(),
            messanger: messangerSelect?.value || 'sms',
            target: targetSelect?.value || 'register',
        };
        
        // В зависимости от способа связи, сохраняем в соответствующее поле
        const contactMethod = messangerSelect?.value || 'sms';
        let contactValue = formData.contactValue;
        
        // Если это телефон или Telegram, очищаем от форматирования перед отправкой
        if (contactMethod === 'sms' || contactMethod === 't.me') {
            contactValue = cleanPhoneNumber(contactValue);
        } else if (contactMethod === 'email') {
            contactValue = contactValue.trim().toLowerCase();
        }
        
        if (contactMethod === 'email') {
            submitData.email = contactValue;
        } else if (contactMethod === 'sms' || contactMethod === 't.me') {
            submitData.tel = '+'+contactValue;
        }
        
        // Валидация
        const validationErrors = validateForm({...formData, messanger: contactMethod});
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            const firstError = Object.values(validationErrors)[0];
            if (firstError) showAlert(firstError, 'error');
            return;
        }
        
        setLoading(true);
        setErrors({});
        
        try {
            const response = await post('register', submitData);
            
            if (response && response.success === false) {
                throw new Error(response.message || 'Ошибка отправки');
            }
            
            const targetText = submitData.target === 'register' ? 'регистрации' : 'восстановления пароля';
            showAlert(`Заявка на ${targetText} успешно отправлена, с Вами свяжется администратор`, 'success');
            
            setTimeout(() => {
                router.push(`/`);
            }, 10000);
            
        } catch (err: any) {
            console.error('Registration error:', err);
            showAlert(err.message || 'Ошибка при отправке заявки', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        // Специальная обработка для телефона (для sms и t.me)
        if (name === 'contactValue' && (formData.messanger === 'sms' || formData.messanger === 't.me')) {
            const formatted = formatPhoneNumber(value);
            setFormData(prev => ({
                ...prev,
                [name]: formatted,
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value,
            }));
        }
        
        if (errors[name as keyof RegistrationData]) {
            setErrors(prev => ({
                ...prev,
                [name]: undefined,
            }));
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <svg className="animate-spin h-12 w-12 text-main mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 text-gray-600 font-medium">Загрузка...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full">
                {/* Back to home button */}
                <div className="absolute top-4 left-4">
                    <Link 
                        href='/' 
                        className="inline-flex items-center gap-2 text-gray-600 hover:text-main transition-colors duration-200 group"
                    >
                        <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        На главную
                    </Link>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
                    {/* Header */}
                    <div className="text-center space-y-3">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                            <svg className="w-8 h-8 text-main" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900">
                            Отправить заявку
                        </h2>
                        <p className="text-gray-600">
                           Отправьте заявку на одобрение
                        </p>
                    </div>

                    {/* Form */}
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-5">
                            {/* Имя и Фамилия в одной строке */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Фамилия */}
                                <div className="group">
                                    <label htmlFor="surname" className="block text-sm font-medium text-gray-700 mb-2">
                                        Фамилия <RequiredSymbol></RequiredSymbol>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <input
                                            id="surname"
                                            name="surname"
                                            type="text"
                                            autoComplete="family-name"
                                            required
                                            value={formData.surname}
                                            onChange={handleChange}
                                            className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                                                errors.surname ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                            placeholder="Иванов"
                                        />
                                    </div>
                                    {errors.surname && (
                                        <p className="mt-1 text-sm text-red-600">{errors.surname}</p>
                                    )}
                                </div>
                                
                                {/* Имя */}
                                <div className="group">
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                        Имя <RequiredSymbol></RequiredSymbol>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <input
                                            id="name"
                                            name="name"
                                            type="text"
                                            autoComplete="given-name"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                                                errors.name ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                            placeholder="Иван"
                                        />
                                    </div>
                                    {errors.name && (
                                        <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                                    )}
                                </div>
                            </div>
                            
                            {/* Способ связи */}
                            <div className="group">
                                <label htmlFor="messanger" className="block text-sm font-medium text-gray-700 mb-2">
                                    Способ связи <RequiredSymbol></RequiredSymbol>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                    </div>
                                    <select 
                                        name="messanger" 
                                        id="messanger" 
                                        className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 appearance-none"
                                        value={formData.messanger}
                                        onChange={handleChange}
                                    >
                                        <option value="sms">SMS (телефон)</option>
                                        <option value="email">Email</option>
                                        <option value="t.me">Telegram</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Динамическое поле для контакта */}
                            <div className="group">
                                <label htmlFor="contactValue" className="block text-sm font-medium text-gray-700 mb-2">
                                    {formData.messanger === 'email' ? 'Email' : 
                                     formData.messanger === 't.me' ? 'Телефон для Telegram' : 'Телефон'} <RequiredSymbol></RequiredSymbol>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        {getContactIcon()}
                                    </div>
                                    <input
                                        id="contactValue"
                                        name="contactValue"
                                        type={getContactFieldType()}
                                        required
                                        value={formData.contactValue}
                                        onChange={handleChange}
                                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                                            errors.contactValue ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder={getContactPlaceholder()}
                                    />
                                </div>
                                {errors.contactValue && (
                                    <p className="mt-1 text-sm text-red-600">{errors.contactValue}</p>
                                )}
                                {(formData.messanger === 'sms' || formData.messanger === 't.me') && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        Формат: +7 (XXX) XXX-XX-XX
                                    </p>
                                )}
                            </div>

                            {/* Цель обращения */}
                            <div className="group">
                                <label htmlFor="target" className="block text-sm font-medium text-gray-700 mb-2">
                                    Цель обращения <RequiredSymbol></RequiredSymbol>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                        </svg>
                                    </div>
                                    <select 
                                        name="target" 
                                        id="target" 
                                        className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 appearance-none"
                                        value={formData.target}
                                        onChange={handleChange}
                                    >
                                        <option value="register">Регистрация</option>
                                        <option value="refresh">Восстановление пароля</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Submit button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-main to-green-700 hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Отправка...
                                </>
                            ) : (
                                <>
                                    Отправить заявку
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </>
                            )}
                        </button>
                        
                        {/* Terms */}
                        <div className="text-center pt-4 border-t border-gray-200">
                            <p className="text-xs text-gray-500">
                                Отправляя заявку, вы соглашаетесь с{' '}
                                <Link href="/docs/terms" className="font-medium text-main hover:text-green-500 transition-colors duration-200">
                                    условиями использования
                                </Link>
                            </p>
                        </div>
                    </form>

                    {/* Login link */}
                    <div className="text-center">
                        <p className="text-sm text-gray-600">
                            Уже есть аккаунт?{' '}
                            <Link
                                href="/login"
                                className="font-medium text-main hover:text-green-500 transition-colors duration-200"
                            >
                                Войдите
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
            <Alert alert={alertMess?.content} />
        </div>
    );
}
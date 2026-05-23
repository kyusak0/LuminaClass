'use client'

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/authContext";
import { Book, BotIcon, ChevronLeft, ChevronRight, Dock, Home, LogOut, Menu, Pencil, Tags, User } from "lucide-react";

interface NavProps {
    children: React.ReactNode
}

export default function Navigation({ children }: NavProps) {
    const router = useRouter();
    const pathname = usePathname();
    const auth = useAuth();

    if (!auth) {
        return null;
    }

    const { user, logout, loading } = auth;
    const [clientPathname, setClientPathname] = useState('');
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        setClientPathname(pathname);
    }, [pathname]);

    useEffect(() => {
        const savedState = localStorage.getItem('sidebar_open');
        if (savedState !== null) {
            setIsSidebarOpen(savedState === 'true');
        }
    }, []);

    const handleLogout = async () => {
        if (isLoggingOut) return;

        setIsLoggingOut(true);
        try {
            await logout();
            router.push('/login');
        } catch (error) {
            console.error('Ошибка при выходе:', error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    const toggleSidebar = () => {
        const newState = !isSidebarOpen;
        setIsSidebarOpen(newState);
        localStorage.setItem('sidebar_open', String(newState));
        if (!newState) {
            setIsMobileMenuOpen(false);
        }
    };

    const goBack = () => {
        router.back();
    };

    // Показываем заглушку во время загрузки пользователя
    if (loading) {
        return (
            <div className='fixed w-full top-0 left-0'>
                <div className='absolute h-screen bg-main text-white left-0 flex flex-col gap-10 justify-evenly text-nowrap w-64 pl-20'>
                    <div className="logo">
                        <div className="h-8 w-32 bg-gray-600 animate-pulse rounded"></div>
                    </div>
                    <div className="flex flex-col gap-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-12 bg-gray-600 animate-pulse rounded-lg mx-5"></div>
                        ))}
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="h-12 bg-gray-600 animate-pulse rounded-lg mx-5"></div>
                        <div className="h-10 bg-gray-600 animate-pulse rounded-lg mx-5 w-24"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-gray-50">
            {/* Sidebar для десктопа */}
            {user && (
                <>
                    <aside
                        className={`fixed top-0 left-0 h-screen bg-main text-white 
                        flex flex-col transition-all duration-300 ease-in-out z-20 shadow-xl
                        ${isSidebarOpen ? 'w-64' : 'w-20'} 
                        max-lg:fixed max-lg:z-30 max-lg:transform max-lg:transition-transform max-lg:duration-300
                        ${isSidebarOpen && isMobileMenuOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full'}`}
                    >
                        {/* Кнопка сворачивания - только для десктопа */}
                        <button
                            onClick={toggleSidebar}
                            className="absolute -right-3 top-8 bg-main rounded-full p-1.5 shadow-lg hover:bg-main-hover transition-colors hidden lg:block"
                            title={isSidebarOpen ? 'Свернуть меню' : 'Развернуть меню'}
                        >
                            {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                        </button>

                        {/* Логотип */}
                        <div className={`pt-8 pb-8 ${!isSidebarOpen && 'flex justify-center'}`}>
                            {isSidebarOpen ? (
                                <Link href="/" className="flex items-center gap-3 px-4 py-2.5">
                                    <BotIcon className="w-6 h-6" />
                                    <span className="font-bold text-lg">Люмина Класс</span>
                                </Link>
                            ) : (
                                <Link href="/" className="flex justify-center px-2 py-2.5">
                                    <BotIcon className="w-6 h-6" />
                                </Link>
                            )}
                        </div>

                        {/* Основная навигация */}
                        <nav className='flex-1 flex flex-col gap-1 px-3'>
                            <NavLink href="/" currentPath={clientPathname} isSidebarOpen={isSidebarOpen}>
                                <Home className="w-5 h-5" /> Главная
                            </NavLink>

                            <NavLink href="/tasks" currentPath={clientPathname} isSidebarOpen={isSidebarOpen}>
                                <Tags className="w-5 h-5" /> Задания
                            </NavLink>

                            <NavLink href="/editor" currentPath={clientPathname} isSidebarOpen={isSidebarOpen}>
                                <Pencil className="w-5 h-5" /> Редактор
                            </NavLink>

                            <NavLink href="/marks" currentPath={clientPathname} isSidebarOpen={isSidebarOpen}>
                                <Book className="w-5 h-5" /> Журнал
                            </NavLink>

                            <NavLink href={`/users/${user.id}`} currentPath={clientPathname} isSidebarOpen={isSidebarOpen}>
                                <User className="w-5 h-5" /> Профиль
                            </NavLink>
                        </nav>

                        {/* Нижняя часть */}
                        <div className="flex flex-col gap-2 pb-8 px-3">
                            <NavLink href="/docs" currentPath={clientPathname} isSidebarOpen={isSidebarOpen}>
                                <Dock className="w-5 h-5" /> Справка
                            </NavLink>

                            <button
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className={`flex items-center gap-3 py-2.5 rounded-lg transition-all duration-200
                                hover:bg-white/10 text-white/90 hover:text-white
                                disabled:opacity-50 disabled:cursor-not-allowed
                                ${isSidebarOpen ? 'px-4 justify-start' : 'px-2 justify-center'}`}
                            >
                                <LogOut className="w-5 h-5" />
                                {isSidebarOpen && (
                                    isLoggingOut ? (
                                        <div className="flex items-center gap-2">
                                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Выход...</span>
                                        </div>
                                    ) : (
                                        <span>Выйти</span>
                                    )
                                )}
                                {!isSidebarOpen && !isLoggingOut && <span className="sr-only">Выйти</span>}
                            </button>
                        </div>
                    </aside>

                    {/* Оверлей для мобильного меню */}
                    {isMobileMenuOpen && (
                        <div 
                            className="fixed inset-0 bg-black/50 z-25 lg:hidden"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                    )}
                </>
            )}

            {/* Основной контент */}
            <main
                className={`transition-all duration-300 min-h-screen
                    ${user && isSidebarOpen ? 'lg:ml-64' : user && !isSidebarOpen ? 'lg:ml-20' : ''}`}
            >
                {/* Шапка */}
                <header 
                    className={`fixed top-0 right-0 bg-white border-b border-gray-200 shadow-sm z-10 transition-all duration-300
                        ${user && isSidebarOpen ? 'left-64' : user && !isSidebarOpen ? 'left-20' : 'left-0'}
                        max-lg:left-0`}
                >
                    <div className="flex justify-between items-center h-16 px-4 md:px-6 lg:px-8">
                        {/* Левая часть - гамбургер и кнопка Назад */}
                        <div className="flex items-center gap-3">
                            {user && (
                                <button
                                    className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                    onClick={() => setIsMobileMenuOpen(true)}
                                >
                                    <Menu size={20} />
                                </button>
                            )}
                            <button
                                onClick={goBack}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-600 hover:text-main hover:bg-gray-100 transition-colors"
                            >
                                <ChevronLeft size={18} />
                                <span className="text-sm font-medium">Назад</span>
                            </button>
                        </div>

                        {/* Правая часть - профиль */}
                        <Link
                            href={user ? `/users/${user.id}` : "/login"}
                            className="group flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            {user ? (
                                <>
                                    {/* Аватар */}
                                    <div className="relative">
                                        <img
                                            src={user.avatar || 'https://i2.wp.com/vdostavka.ru/wp-content/uploads/2019/05/no-avatar.png?fit=512%2C512&ssl=1'}
                                            alt={user.name || user.login}
                                            className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                        />
                                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                                    </div>
                                    
                                    {/* Информация о пользователе */}
                                    <div className="hidden md:block text-right">
                                        <p className="text-sm font-medium text-gray-900">
                                            {user.name || user.login}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {user.role === 'admin' ? 'Администратор' : user.role === 'teacher' ? 'Преподаватель' : 'Студент'}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center gap-2 px-4 py-2 bg-main text-white rounded-lg hover:bg-main-hover transition-colors">
                                    <User className="w-4 h-4" />
                                    <span className="text-sm font-medium">Войти</span>
                                </div>
                            )}
                        </Link>
                    </div>
                </header>

                {/* Отступ для фиксированной шапки */}
                <div className="pt-16">
                    <div className="p-4 md:p-6 lg:p-8">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}

// Компонент для ссылок навигации
function NavLink({ href, currentPath, isSidebarOpen, children }: {
    href: string;
    currentPath: string;
    isSidebarOpen: boolean;
    children: React.ReactNode
}) {
    const isActive = currentPath === href || (href !== '/' && currentPath.startsWith(href));

    // Извлекаем текст и иконку из children
    const childrenArray = React.Children.toArray(children);
    const icon = childrenArray.find(child => React.isValidElement(child) && typeof child.type !== 'string');
    const text = childrenArray.find(child => typeof child === 'string');

    return (
        <Link
            href={href}
            className={`flex items-center rounded-lg transition-all duration-200
                ${isSidebarOpen ? 'gap-3 px-4 py-2.5 justify-start' : 'gap-0 px-2 py-2.5 justify-center'}
                ${isActive
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
            title={!isSidebarOpen && typeof text === 'string' ? text : undefined}
        >
            <span className="flex-shrink-0">{icon}</span>
            {isSidebarOpen && text && (
                <span className="text-sm font-medium truncate">{text}</span>
            )}
        </Link>
    );
}
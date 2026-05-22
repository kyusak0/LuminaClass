'use client'

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/authContext";
import { Book, BotIcon, ChevronLeft, ChevronRight, Dock, Home, Menu, Pencil, StepBack, Tags, User } from "lucide-react";
import Loader from "../loader/Loader";

interface NavProps {
    content: React.ReactNode
}

export default function Navigation({ content }: NavProps) {
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
    };

    const backHistory = () => {
        router.back()
    }

    if (loading) {
        return (
            <Loader />
        );
    }

    return (
        <div className="w-full min-h-screen bg-gray-50">
            {user ? (
                <aside
                    className={`fixed top-0 left-0 h-screen bg-main text-foreground 
    flex flex-col gap-10 justify-evenly text-nowrap
    transition-all duration-300 ease-in-out z-20 shadow-lg
    ${isSidebarOpen ? 'w-64 max-lg:w-100' : 'w-20 max-lg:w-0 max-lg:ml-[-100]'}`}
                >
                    <div className={`absolute top-5 ${isSidebarOpen ? 'right-3' : 'right-2'}`}>
                        <button
                            onClick={toggleSidebar}
                            className="p-1.5 rounded transition-colors hover:bg-foreground/10 relative z-10"
                            title={isSidebarOpen ? 'Скрыть' : 'Показать'}
                        >
                            {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                        </button>
                    </div>

                    <div className={`logo ${!isSidebarOpen && 'flex justify-center'} mt-12`}> {/* Добавлен mt-12 */}
                        <NavLink href="/" currentPath={clientPathname} isSidebarOpen={isSidebarOpen}>
                            <BotIcon /> Люмина Класс
                        </NavLink>
                    </div>

                    <nav className='flex flex-col gap-1'>
                        <NavLink href="/" currentPath={clientPathname} isSidebarOpen={isSidebarOpen}>
                            <Home /> Главная
                        </NavLink>

                        <NavLink href="/tasks" currentPath={clientPathname} isSidebarOpen={isSidebarOpen}>
                            <Tags /> Задания
                        </NavLink>

                        <NavLink href="/editor" currentPath={clientPathname} isSidebarOpen={isSidebarOpen}>
                            <Pencil /> Редактор
                        </NavLink>

                        <NavLink href="/marks" currentPath={clientPathname} isSidebarOpen={isSidebarOpen}>
                            <Book /> Журнал
                        </NavLink>

                        {user && (
                            <NavLink href={`/users/${user.id}`} currentPath={clientPathname} isSidebarOpen={isSidebarOpen}>
                                <User /> Профиль
                            </NavLink>
                        )}
                    </nav>

                    <div className="flex flex-col gap-2">
                        <NavLink href="/docs" currentPath={clientPathname} isSidebarOpen={isSidebarOpen}>
                            <Dock /> Справка
                        </NavLink>

                        <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className={`py-2 rounded-lg shadow-sm border-2 border-foreground 
                            hover:bg-foreground hover:text-main transition-colors 
                            disabled:opacity-50 disabled:cursor-not-allowed
                            ${isSidebarOpen ? 'mx-5 px-5' : 'mx-2 px-2 text-xs'}`}
                        >
                            {isLoggingOut ? (
                                <div className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    {isSidebarOpen && 'Выход...'}
                                </div>
                            ) : (isSidebarOpen ? 'Выйти' : '⇤')}
                        </button>
                    </div>
                </aside>) : (null)
            }


            <main
                className={`transition-all duration-300 min-h-screen
                    ${isSidebarOpen ? 'ml-64 max-lg:ml-0' : 'ml-20 max-lg:ml-0'}`}
            >
                <header className={`fixed top-0 right-0 left-0 bg-white shadow-sm z-10 transition-all duration-300 
                ${isSidebarOpen ? 'ml-[256px]' : user ? 'ml-5' : 'ml-0'} max-lg:ml-0`}>
                    <div className="flex justify-between items-center h-16 px-20">
                        {isSidebarOpen ? (
                            null
                        ) : (
                            user ? (<button
                                className="lg:hidden"
                                onClick={() => setIsSidebarOpen(true)}>
                                <Menu size={20} />
                            </button>) : null
                        )}
                        <button
                            onClick={backHistory}
                            className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-main rounded-lg text-base font-medium transition-all hover:bg-main hover:text-white md:py-2 md:text-lg md:px-5"
                        >
                            ← Назад
                        </button>

                        {user?.login ? (
                            <Link
                                href={`/users/${user?.id}`}
                                className="flex items-center gap-3 group"
                            >
                                {user?.avatar ? (
                                    <img
                                        src={user.avatar}
                                        alt={user.name}
                                        className="w-10 h-10 rounded-full object-cover border-2 border-main group-hover:border-main-hover transition-colors"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-main text-white flex items-center justify-center font-semibold text-lg group-hover:bg-main-hover transition-colors">
                                        {user.name?.[0]?.toUpperCase()}
                                    </div>
                                )}
                                <span className="text-base font-medium text-gray-700 group-hover:text-main transition-colors">
                                    {user.name}
                                </span>
                            </Link>
                        ) : (
                            <Link
                                href="/login"
                                className="px-4 py-2 border-2 border-main rounded-lg text-base font-medium transition-all hover:bg-main hover:text-white md:py-2 md:text-lg md:px-5"
                            >
                                Войти
                            </Link>
                        )}
                    </div>
                </header>

                <div className="p-[20px] mt-8 max-lg:px-0">
                    {content}
                </div>
            </main>
        </div >
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
            className={`relative flex items-center ${isSidebarOpen ? 'justify-start gap-3' : 'justify-center'} 
                mx-2 px-4 py-3 rounded-lg transition-all duration-200
                ${isActive
                    ? 'bg-foreground text-main shadow-md'
                    : 'hover:bg-foreground/10'
                }
                ${!isSidebarOpen && 'px-2 justify-center'}`}
            title={!isSidebarOpen ? String(text) : undefined}
        >
            {icon}
            {isSidebarOpen && text}
        </Link>
    );
}
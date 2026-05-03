'use client'

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/authContext";
import { Book, BotIcon, ChevronLeft, ChevronRight, Dock, Home, Icon, Pencil, Tags, User } from "lucide-react";

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

    // Показываем заглушку во время загрузки пользователя
    if (loading) {
        return (
            <div className='fixed w-full top-0 left-0'>
                <div className='absolute h-screen bg-main text-foreground left-0 flex flex-col gap-10 justify-evenly text-nowrap w-1/4 pl-20'>
                    <div className="logo">
                        <a href="/">
                            <img src="/" alt="На главную" title="На главную" loading="lazy" />
                        </a>
                    </div>
                    <div className="flex flex-col gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
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
            <aside
                className={`fixed top-0 left-0 h-screen bg-main text-foreground 
                    flex flex-col gap-10 justify-evenly text-nowrap
                    transition-all duration-300 ease-in-out z-20 shadow-lg
                    ${isSidebarOpen ? 'w-64' : 'w-20'}`}
            >
                <div className={`absolute top-5 ${isSidebarOpen ? 'right-3' : 'right-2'}`}>
                    <button
                        onClick={toggleSidebar}
                        className="p-1.5 rounded transition-colors hover:bg-foreground/10"
                        title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                    >
                        {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                    </button>
                </div>

                <div className={`logo ${!isSidebarOpen && 'flex justify-center'}`}>
                    <NavLink href="/" currentPath={'clientPathname'} isSidebarOpen={isSidebarOpen}>
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
            </aside>

            <main
                className={`transition-all duration-300 min-h-screen
                    ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}
            >
                <header className="fixed top-0 right-0 left-0 bg-white shadow-sm z-10 transition-all duration-300"
                    style={{ left: isSidebarOpen ? '16rem' : '5rem' }}
                >
                    <div className="flex justify-between items-center h-16 px-20">
                        <button className='border-b-2 border-main px-2 hover:text-main-hover transition-colors'>
                            Назад
                        </button>

                        <Link
                            href={user?.login ? `/users/${user?.id}` : "/login"}
                            className={`flex items-center justify-center px-4 py-2 border-2 text-base font-medium rounded-lg transition-colors
                                ${user?.login
                                    ? "hover:text-main-hover border-transparent"
                                    : "border-main hover:bg-main-hover hover:text-white"
                                } md:py-2 md:text-lg md:px-5`}
                        >
                            {user?.login ? user.login : "Войти"}
                        </Link>
                    </div>
                </header>

                <div className="p-20">
                    {content}
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
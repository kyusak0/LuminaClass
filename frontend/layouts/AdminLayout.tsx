// layouts/AdminLayout.tsx
'use client'

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/context/authContext";
import { 
    Users, 
    UserPlus, 
    BookOpen, 
    FileText, 
    ClipboardCheck, 
    Home, 
    Settings, 
    Shield, 
    Activity,
    ChevronLeft,
    ChevronRight,
    Menu,
    LogOut,
    BotIcon
} from "lucide-react";
import Loader from "@/components/loader/Loader";

// Выносим NavLink в отдельный компонент
const NavLink = React.memo(({ href, currentPath, isSidebarOpen, children, exact = false }: {
    href: string;
    currentPath: string;
    isSidebarOpen: boolean;
    children: React.ReactNode;
    exact?: boolean;
}) => {
    const isActive = exact 
        ? currentPath === href 
        : currentPath.startsWith(href);

    let icon = null;
    let text = null;
    
    React.Children.forEach(children, (child) => {
        if (React.isValidElement(child)) {
            icon = child;
        } else if (typeof child === 'string') {
            text = child;
        }
    });

    return (
        <Link
            href={href}
            className={`flex items-center rounded-lg transition-all duration-200
                ${isSidebarOpen ? 'gap-3 px-4 py-2.5 justify-start' : 'gap-0 px-2 py-2.5 justify-center'}
                ${isActive
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
            title={!isSidebarOpen && text ? text : undefined}
        >
            <span className="flex-shrink-0">{icon}</span>
            {isSidebarOpen && text && (
                <span className="text-sm font-medium truncate">{text}</span>
            )}
        </Link>
    );
});

NavLink.displayName = 'NavLink';

interface AdminLayoutProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
}

export default function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const auth = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const { user, loading: authLoading } = auth || {};

    useEffect(() => {
        const savedState = localStorage.getItem('admin_sidebar_open');
        if (savedState !== null) {
            setIsSidebarOpen(savedState === 'true');
        }
    }, []);

    // Проверка доступа
    useEffect(() => {
        // Ждем загрузки авторизации
        if (authLoading) return;
        
        // Если пользователь не авторизован или не админ
        if (!user || user.role !== 'admin') {
            router.replace('/');
        }
    }, [user, authLoading, router]);

    const toggleSidebar = useCallback(() => {
        const newState = !isSidebarOpen;
        setIsSidebarOpen(newState);
        localStorage.setItem('admin_sidebar_open', String(newState));
        if (!newState) {
            setIsMobileMenuOpen(false);
        }
    }, [isSidebarOpen]);

    const handleLogout = useCallback(async () => {
        try {
            await auth?.logout();
            router.push('/login');
        } catch (error) {
            console.error('Ошибка при выходе:', error);
        }
    }, [auth, router]);

    // Меню администратора
    const menuItems = useMemo(() => [
        {
            href: '/admin',
            icon: Home,
            title: 'Главная',
            exact: true
        },
        {
            href: '/admin/register',
            icon: UserPlus,
            title: 'Заявки',
        },
        {
            href: '/users',
            icon: Users,
            title: 'Пользователи',
        },
        {
            href: '/groups',
            icon: Users,
            title: 'Группы',
        },
        {
            href: '/files',
            icon: FileText,
            title: 'Файлы',
        },
        {
            href: '/tasks',
            icon: BookOpen,
            title: 'Задания',
        },
        {
            href: '/marks',
            icon: ClipboardCheck,
            title: 'Журнал',
        },
        {
            href: '/admin/settings',
            icon: Settings,
            title: 'Настройки',
        },
        {
            href: '/admin/logs',
            icon: Activity,
            title: 'Логи',
        },
    ], []);

    // Показываем лоадер пока грузится авторизация
    if (authLoading) {
        return <Loader fullScreen text="Проверка прав доступа..." />;
    }

    // Если нет пользователя или не админ - не рендерим (редирект уже сработал)
    if (!user || user.role !== 'admin') {
        return null;
    }

    return (
        <div className="w-full min-h-screen bg-gray-50">
            {/* Сайдбар */}
            <aside
                className={`fixed top-0 left-0 h-screen bg-main text-white 
                flex flex-col transition-all duration-300 ease-in-out z-20 shadow-xl
                ${isSidebarOpen ? 'w-64' : 'w-20'} 
                max-lg:fixed max-lg:z-30 max-lg:transform max-lg:transition-transform max-lg:duration-300
                ${isSidebarOpen && isMobileMenuOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full'}`}
            >
                {/* Кнопка сворачивания */}
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
                        <Link href="/admin" className="flex items-center gap-3 px-4 py-2.5">
                            <Shield className="w-6 h-6" />
                            <span className="font-bold text-lg">Admin Panel</span>
                        </Link>
                    ) : (
                        <Link href="/admin" className="flex justify-center px-2 py-2.5">
                            <Shield className="w-6 h-6" />
                        </Link>
                    )}
                </div>

                {/* Основная навигация */}
                <nav className='flex-1 flex flex-col gap-1 px-3'>
                    {menuItems.map((item, index) => (
                        <NavLink 
                            key={index} 
                            href={item.href} 
                            currentPath={pathname} 
                            isSidebarOpen={isSidebarOpen}
                            exact={item.exact}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.title}
                        </NavLink>
                    ))}
                </nav>

                {/* Нижняя часть */}
                <div className="flex flex-col gap-2 pb-8 px-3">
                    <NavLink href="/" currentPath={pathname} isSidebarOpen={isSidebarOpen}>
                        <BotIcon className="w-5 h-5" />
                        На сайт
                    </NavLink>
                    
                    <button
                        onClick={handleLogout}
                        className={`flex items-center gap-3 py-2.5 rounded-lg transition-all duration-200
                            hover:bg-white/10 text-white/90 hover:text-white
                            ${isSidebarOpen ? 'px-4 justify-start' : 'px-2 justify-center'}`}
                    >
                        <LogOut className="w-5 h-5" />
                        {isSidebarOpen && <span className="text-sm font-medium">Выйти</span>}
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

            {/* Основной контент */}
            <main
                className={`transition-all duration-300 min-h-screen
                    ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}
            >
                {/* Шапка */}
                <header 
                    className={`fixed top-0 right-0 bg-white border-b border-gray-200 shadow-sm z-10 transition-all duration-300
                        ${isSidebarOpen ? 'left-64' : 'left-20'}
                        max-lg:left-0`}
                >
                    <div className="flex justify-between items-center h-16 px-4 md:px-6 lg:px-8">
                        {/* Левая часть */}
                        <div className="flex items-center gap-3">
                            <button
                                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                onClick={() => setIsMobileMenuOpen(true)}
                            >
                                <Menu size={20} />
                            </button>
                            {title && (
                                <div>
                                    <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
                                    {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
                                </div>
                            )}
                        </div>

                        {/* Правая часть - профиль */}
                        <Link
                            href={`/users/${user.id}`}
                            className="group flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <div className="relative">
                                <img
                                    src={user.avatar || 'https://i2.wp.com/vdostavka.ru/wp-content/uploads/2019/05/no-avatar.png?fit=512%2C512&ssl=1'}
                                    alt={user.name || user.login}
                                    className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                />
                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                            </div>
                            <div className="hidden md:block text-right">
                                <p className="text-sm font-medium text-gray-900">
                                    {user.name || user.login}
                                </p>
                                <p className="text-xs text-gray-500">
                                    Администратор
                                </p>
                            </div>
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
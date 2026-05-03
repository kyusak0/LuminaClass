'use client'

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/authContext";
import { ChevronLeft, ChevronRight } from "lucide-react";


export default function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const auth = useAuth();

    if (!auth) {
        return
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

    return (<>
        <div className={`fixed w-${isSidebarOpen ? 'full' : '2/4'} top-0 left-0`}>
            <div
                className='absolute h-screen bg-main text-foreground left-0 flex flex-col gap-10 justify-evenly text-nowrap w-1/4 pl-20'
            >
                <div className="absolute top-25 right-5">
                    <button
                        onClick={toggleSidebar}
                        className={`p-1.5 rounded transition-colors ${!isSidebarOpen ? 'mx-auto' : ''
                            }`}
                        title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                    >
                        {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                    </button>
                </div>

                <div className="logo">
                    <a href="/">
                        <img src="/" alt="На главную" title="На главную" loading="lazy" />
                    </a>
                </div>

                <div className='flex flex-col opacity-100'>
                    <Link
                        href="/"
                        className={`${clientPathname == '/' ? 'bg-foreground text-main rounded-l-full' : ''} p-5 hover:bg-foreground/10 transition-colors`}
                    >
                        Главная
                    </Link>

                    <Link
                        href="/tasks"
                        className={`${clientPathname == '/tasks' ? 'bg-foreground text-main rounded-l-full' : ''} p-5 hover:bg-foreground/10 transition-colors`}
                    >
                        Задания
                    </Link>

                    <Link
                        href="/editor"
                        className={`${clientPathname == '/editor' ? 'bg-foreground text-main rounded-l-full' : ''} p-5 hover:bg-foreground/10 transition-colors`}
                    >
                        Редактор
                    </Link>

                    <Link
                        href="/bookings"
                        className={`${clientPathname == '/bookings' ? 'bg-foreground text-main rounded-l-full' : ''} p-5 hover:bg-foreground/10 transition-colors`}
                    >
                        Посмотреть заявки
                    </Link>

                    <Link
                        href="/marks"
                        className={`${clientPathname == '/marks' ? 'bg-foreground text-main rounded-l-full' : ''} p-5 hover:bg-foreground/10 transition-colors`}
                    >
                        Журнал
                    </Link>

                    {user && (
                        <Link
                            href={`/users/${user.id}`}
                            className={`${clientPathname.includes('/users/') ? 'bg-foreground text-main rounded-l-full' : ''} p-5 hover:bg-foreground/10 transition-colors`}
                        >
                            Профиль
                        </Link>
                    )}
                </div>

                <div className="flex flex-col">
                    <Link
                        href="/docs"
                        className={`${clientPathname.includes('/docs') ? 'bg-foreground text-main rounded-l-full' : ''} p-5 text-left hover:bg-foreground/10 transition-colors`}
                    >
                        Справка
                    </Link>

                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-max py-2 px-5 ml-5 mt-2 rounded-lg shadow-sm border-2 border-foreground hover:bg-foreground hover:text-main transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoggingOut ? (
                            <div className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Выход...
                            </div>
                        ) : 'Выйти'}
                    </button>
                </div>
            </div>
        </div>
        <header className="fixed flex justify-between items-center w-3/4 h-15 px-10 top-0 right-0 bg-white shadow-sm z-3">
      {/* <div className="logo">
        <a href="/">
          <img src="/" alt="logo" title="На главная" />
        </a>
      </div>
      <nav>
        <ul className="flex gap-10">
          <li><Link href="/" className="hover:text-green-500">Главная</Link></li>
          <li><Link href="/tasks" className="hover:text-green-500">Задания</Link></li>
          <li><Link href="/contacts" className="hover:text-green-500">Задать вопрос</Link></li>
          <li><Link href="/bookings" className="hover:text-green-500">Посмотреть заявки</Link></li>
          <li><Link href="/marks" className="hover:text-green-500">Журнал</Link></li>
        </ul>
      </nav> */}
      
        <button className='border-b-2 border-main px-2 hover:text-main-hover'>Назад</button>
      
      <Link
        href={user?.login ? `/users/${user?.id}` : "/login"}
        className={`flex items-center justify-center px-2 py-1 border-2 text-base font-medium rounded-lg ${user?.login
          ? "hover:text-main-hover border-transparent"
          : "hover:text-white border border-main hover:bg-main-hover"
          } md:py-2 md:text-lg md:px-5`}
      >
        {user?.login ? user.login : "Войти"}
      </Link>
      
      

    </header>
    </>
    );
}
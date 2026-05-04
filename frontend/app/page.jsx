'use client'

import Link from 'next/link';
import MainLayout from '../layouts/MainLayout';
import { useAuth } from '../context/authContext';

export default function HomePage() {

  const auth = useAuth();

    if (!auth) {
        return null;
    }

    const { user } = auth;


  return (
    <MainLayout>
      <div className="text-center flex flex-col gap-5">
        <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
          <span className="block">Добро пожаловать</span>
          {/* <span className="block text-green-600">Lumina Class</span> */}
        </h1>
        <p className="max-w-md mx-auto text-base text-gray-500 sm:text-lg md:text-xl md:max-w-3xl">
          Единая, удобная и безопасная онлайн-платформа для взаимодействия между учителями, учениками и их родителями в рамках школьного процесса и дополнительного образования
        </p>
        {!user ? (
          <div className="max-w-md mx-auto sm:flex sm:justify-center">



            <div className="rounded-l-lg shadow">
              <Link
                href="/register"
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-l-lg text-white bg-green-600 hover:bg-green-700 md:py-4 md:text-lg md:px-10"
              >
                Оставить заявку
              </Link>
            </div>
            <div className="mt-3 rounded-r-lg shadow sm:mt-0">
              <Link
                href="/login"
                className="w-full flex items-center justify-center px-8 py-3 border border-green-600 text-base font-medium rounded-r-lg text-green-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
              >
                Войти в систему
              </Link>
            </div>
          </div>) : null}
      </div>
    </MainLayout>
  );
}
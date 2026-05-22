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
      <div className="h-[calc(100vh-250px)] flex items-center justify-center">
        <div className="text-center flex flex-col gap-5 max-w-3xl mx-auto px-4">
          <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">Добро пожаловать</span>
          </h1>
          <p className="text-base text-gray-500 sm:text-lg md:text-xl max-w-2xl mx-auto">
            Единая, удобная и безопасная онлайн-платформа для организации дистанционного образования и дополнительного обучения
          </p>
          {!user && (
            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-4">
              <Link
                href="/register"
                className="px-8 py-3 bg-green-600 text-white text-base font-medium rounded-lg hover:bg-green-700 transition-colors md:py-4 md:text-lg md:px-10"
              >
                Оставить заявку
              </Link>
              <Link
                href="/login"
                className="px-8 py-3 border-2 border-green-600 text-green-600 text-base font-medium rounded-lg hover:bg-green-50 transition-colors md:py-4 md:text-lg md:px-10"
              >
                Войти в систему
              </Link>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
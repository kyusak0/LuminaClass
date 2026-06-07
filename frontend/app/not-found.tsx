'use client';

import Link from 'next/link';
import MainLayout from '@/layouts/MainLayout';
import { HomeIcon } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <MainLayout>
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
          На данный момент данной страницы не существует
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 mb-10">
          или вы указали неверный маршрут.
        </p>
        <Link 
          href="/" 
          className="inline-flex items-center gap-3 px-8 py-4 text-lg font-semibold bg-main text-white rounded-xl hover:bg-green-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
        >
          <HomeIcon className="w-6 h-6" />
          На главную
        </Link>
      </div>
    </MainLayout>
  );
}
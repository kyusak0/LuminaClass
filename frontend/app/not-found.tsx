'use client';

import Link from 'next/link';
import MainLayout from '@/layouts/MainLayout';

export default function NotFoundPage() {
  return (
    <MainLayout>
      <h1 className='text-4xl font-bold'>
        На данный момент данной страницы не существует
      </h1>
      <p>
        или вы указали неверный маршрут.
      </p>
      <Link href='/'>🏠 На главную</Link>
    </MainLayout>
  );
}
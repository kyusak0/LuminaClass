'use client';

import { useEffect, useState, useCallback } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { Answer, api, Files, type AppUser } from '@/api';
import MainLayout from '@/layouts/MainLayout';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useParams();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await api.getUser();
      setUser(currentUser);

      await getUserInfo(Number(params.uid));
    } catch (err: any) {
      notFound();

    } finally {
      setLoading(false);
    }
  };

  const getUserInfo = async (id: number | string) => {
    try {
      const res = await api.getUserInfo(Number(id));
      console.log('API Response:', res);

      // Check if response exists and has message
      if (!res || !res.message) {
        throw new Error('Invalid response from server');
      }

      // Parse the JSON message
      const parsedData = JSON.parse(res.message);

      // Check if parsed data is valid
      if (!parsedData || typeof parsedData !== 'object') {
        throw new Error('Invalid user data');
      }

      setUserData(parsedData);
      const data: any = parsedData
      setFiles(data.files);

      // data.tasks.forEach((item: any) => {
      //   setGroups(prev => [...prev, {
      //     id: item.id,
      //     name: item.title,
      //     task_id: item.task_id
      //   }])
      // });

      return parsedData;

    } catch (err: any) {
    }
  };

  const [files, setFiles] = useState<Files[]>([]);
  // const [groups, setGroups] = useState<{
  //   id: number, name: string, task_id: number,
  // }[]>([])


  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Загрузка...</div>
      </div>
    );
  }

  if (!userData && !loading) {
    return notFound();
  }

  return (
    <MainLayout>
      <div className="w-full px-4 pt-5 sm:px-0 flex flex-col items-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Файлы от пользователя {userData?.name}!
        </h2>

        <div className="w-3/4 grid grid-cols-8">
          <div className="col-span-2 border border-green-600 py-1 px-2">Название</div>
          <div className="col-span-2 border border-green-600 py-1 px-2">Тип</div>
          <div className="col-span-2 border border-green-600 py-1 px-2">Вес</div>
          <div className="col-span-2 border border-green-600 py-1 px-2"></div>
        </div>
        {files.length > 0 ? (
          files.map((file: Files, index) => {
            // const group = groups[index];
            return (
              <div className="w-3/4 grid grid-cols-8" key={file.id}>
                <Link href={`/files/${file.id}`} className="col-span-2 border border-green-600 py-1 px-2 truncate" title={file.original_name}>{file.original_name}</Link>
                <div className="col-span-2 border border-green-600 py-1 px-2 truncate" title={file.mime_type}>{file.mime_type}</div>
                <div className="col-span-2 border border-green-600 py-1 px-2 truncate" title={file.size}>{(Number(file.size) / 1024).toFixed(2)} KB</div>
                <Link href={`/files/${file.id}`} className="col-span-2 border border-green-600 py-1 px-2 truncate" title={file.original_name}>Открыть</Link>
              </div>
            )
          })) : (
          <div className="w-3/4 p-5 mt-5 border-2 border-dotted border-green-600 flex flex-col items-center justify-center">
            Файлов от данного пользователя на данный момент нет
          </div>
        )}
      </div>
    </MainLayout>
  );
}
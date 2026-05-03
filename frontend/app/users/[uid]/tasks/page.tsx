'use client';

import { useEffect, useState, useCallback } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { Answer, api, Task, type AppUser } from '@/api';
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
      setTasks(data.tasks);

      data.tasks.forEach((item: any) => {
        setGroups(prev => [...prev, {
          id: item.id,
          name: item.title,
          task_id: item.task_id
        }])
      });

      return parsedData;

    } catch (err: any) {
    }
  };
  const [alertMess, setAlertMess] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [groups, setGroups] = useState<{
    id: number, name: string, task_id: number,
  }[]>([])


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
   <MainLayout alertMess={alertMess}>
      <div className="w-full px-4 pt-5 sm:px-0 flex flex-col items-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Задания от пользователя {userData?.name}!
        </h2>

        <div className="w-3/4 grid grid-cols-8">
          <div className="col-span-2 border border-green-600 py-1 px-2">Название</div>
          <div className="col-span-2 border border-green-600 py-1 px-2">Описание</div>
          <div className="col-span-1 border border-green-600 py-1 px-2">Срок</div>
          <div className="col-span-1 border border-green-600 py-1 px-2">Группа</div>
          <div className="col-span-2 border border-green-600 py-1 px-2"></div>
        </div>
        {tasks.length > 0 ? (
          tasks.map((task: Task, index) => {
            const group = groups[index];
            return (
              <div className="w-3/4 grid grid-cols-8" key={task.id}>
                <Link href={`/tasks/${task.id}`} className="col-span-2 border border-green-600 py-1 px-2">{task.title}</Link>
                <div className="col-span-2 border border-green-600 py-1 px-2 truncate" title={task.description?.toString()}>{task.description}</div>
                <div className="col-span-1 border border-green-600 py-1 px-2">{task.deadline == '9999-12-31' ? 'без срока' : task.deadline}</div>
                <div className="col-span-1 border border-green-600 py-1 px-2">{group.id}</div>

                <Link href={`/tasks/${task.id}`} className="col-span-2 border border-green-600 py-1 px-2">Открыть</Link>
              </div>
            )
          })) : (
          <div className="w-3/4 p-5 mt-5 border-2 border-dotted border-green-600 flex flex-col items-center justify-center">
            Заданий от данного пользователя на данный момент нет
          </div>
        )}
      </div>
    </MainLayout>
  );
}
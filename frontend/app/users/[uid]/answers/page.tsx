'use client';

import { useEffect, useState, useCallback } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { Answer, api, type AppUser } from '@/api';
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
      setAnswers(data.answers);

      data.tasks.forEach((item: any) => {
        setTasks(prev => [...prev, {
          id: item.id,
          name: item.title,
          task_id: item.task_id
        }])
      });

      return parsedData;

    } catch (err: any) {
    }
  };

  const [answers, setAnswers] = useState<Answer[]>([]);
  const [tasks, setTasks] = useState<{
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
    <MainLayout>
      <div className="px-4 pt-5 sm:px-0 flex flex-col items-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Ответы пользователя {userData?.name}!
        </h2>

        <div className="w-3/4 grid grid-cols-10">
          <div className="col-span-1 border border-green-600 py-1 px-2">Задание</div>
          <div className="col-span-1 border border-green-600 py-1 px-2">Оценка</div>
          <div className="col-span-3 border border-green-600 py-1 px-2">Комментарий учащегося</div>
          <div className="col-span-3 border border-green-600 py-1 px-2">Комментарий учителя</div>
          <div className="col-span-2 border border-green-600 py-1 px-2"></div>
        </div>

        {answers.length > 0 ? (
          answers.map((answer: Answer, index) => {
            const task = tasks[index];
            return (
              <div className="w-3/4 grid grid-cols-10" key={answer.id}>
                <Link href={`/files/${task.task_id}`} className="col-span-1 border border-green-600 py-1 px-2">{task.name}</Link>
                <div className="col-span-1 border border-green-600 py-1 px-2">{answer.mark}</div>
                <div className="col-span-3 border border-green-600 py-1 px-2 truncate" title={answer.students_comment?.toString()}>{answer.students_comment}</div>
                <div className="col-span-3 border border-green-600 py-1 px-2 truncate" title={answer.teachers_comment?.toString()}>{answer.teachers_comment}</div>
                <Link href={`/files/${answer.answer_id}`} className="col-span-2 border border-green-600 py-1 px-2">Открыть</Link>
              </div>
            )
          })) : (
          <div className="w-3/4 p-5 mt-5 border-2 border-dotted border-green-600 flex flex-col items-center justify-center">
            Ответов от данного пользователя на данный момент нет
          </div>
        )}
      </div>
    </MainLayout>
  );
}
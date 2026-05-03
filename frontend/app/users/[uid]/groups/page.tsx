'use client';

import { useEffect, useState, useCallback } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { Answer, api, Files, Groups, type AppUser } from '@/api';
import MainLayout from '@/layouts/MainLayout';
import Link from 'next/link';

export default function UserGroupPage() {
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
      const data = await api.getGroups();
      setGroups(data.data);
      console.log(data);

      const groupInfoPromises = data.data.map(async (item: any) => {
        try {
          const itemInfo = await api.getGroupInfo(item.id);
          const teacher = (await api.getUserInfo(itemInfo.data.teacher.tutor_id)).message;
          const teacherParsed = JSON.parse(teacher);

          return {
            teacherName: teacherParsed.name,
            teacherId: teacherParsed.id,
            membersLength: itemInfo.data.students.length,
            lesson: itemInfo.data.teacher.name
          };
        } catch (err) {
          return {
            teacherName: 'Неизвестно',
            teacherId: 0,
            membersLength: 0,
            lesson: 'Неизвестно'
          };
        }
      });

      const allGroupInfo = await Promise.all(groupInfoPromises);
      setGroupInfo(allGroupInfo);

      return parsedData;

    } catch (err: any) {
    }
  };

  const [groups, setGroups] = useState<Groups[]>([]);
  const [groupInfo, setGroupInfo] = useState<{
    teacherName: string,
    teacherId: number,
    membersLength: number,
    lesson: string
  }[]>([]);

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
          Группы в которых состоит пользователь {userData?.name}!
        </h2>

        <div className="w-3/4 grid grid-cols-10 bg-foreground">
          <div className="col-span-2 border border-green-600 py-1 px-2">Название</div>
          <div className="col-span-2 border border-green-600 py-1 px-2">Предмет</div>
          <div className="col-span-2 border border-green-600 py-1 px-2">Руководитель</div>
          <div className="col-span-2 border border-green-600 py-1 px-2">Участники</div>
          <div className="col-span-2 border border-green-600 py-1 px-2"></div>
        </div>
        {loading ? (
          <div className="w-3/4 p-5 mt-5 border-2 border-dotted border-green-600 flex flex-col items-center justify-center">
            Загрузка...
          </div>
        ) : groups.length > 0 ? (
          groups.map((group: Groups, index) => {
            const groupInf = groupInfo[index];
            return (
              <div className="w-3/4 grid grid-cols-10 bg-foreground" key={group.id}>
                <Link href={`/groups/${group.id}`} className="col-span-2 border border-green-600 py-1 px-2 truncate" title={group.group_name}>{group.group_name}</Link>
                <div className="col-span-2 border border-green-600 py-1 px-2 truncate">{groupInf.lesson}</div>
                <Link href={`/users/${groupInf.teacherId}`} className="col-span-2 border border-green-600 py-1 px-2 truncate">{groupInf.teacherName}</Link>
                <div className="col-span-2 border border-green-600 py-1 px-2 truncate">{groupInf.membersLength}</div>
                <Link href={`/groups/${group.id}`} className="col-span-2 border border-green-600 py-1 px-2 truncate" title={group.group_name}>Перейти</Link>
              </div>
            )
          })) : (
          <div className="w-3/4 p-5 mt-5 border-2 border-dotted border-green-600 flex flex-col items-center justify-center">
            Пользователь не состоит в группах
          </div>
        )}
      </div>
    </MainLayout>
  );
}
'use client';

import { useEffect, useState, FormEvent, ChangeEvent, MouseEvent, useMemo, useCallback } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import MainLayout from '@/layouts/MainLayout';
import Link from 'next/link';
import Popup from '@/components/popup/Popup';
import Calendar from '@/components/calendar/Calendar';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useAuth } from '@/context/authContext';
import { Loader2, Upload, Link2, Copy, Check, FileText, ClipboardCheck, Users, BookOpen, MessageCircle, Calendar as CalendarIcon, Star } from 'lucide-react';

interface UserStats {
  files: number;
  tasks: number;
  answers: number;
  groups: number;
}

interface GradeDistribution {
  name: string;
  value: number;
  color: string;
  label: string;
}

interface UpcomingTask {
  id: number;
  name: string;
  time: string;
  deadline: Date;
}

export default function UserPage() {
  const params = useParams();
  const router = useRouter()
  const auth = useAuth();

  if (!auth) return null;
  const { user: currentUser, get, post } = auth;

  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [disabled, setDisabled] = useState(true);
  const [disabledLink, setDisabledLink] = useState(true);
  const [alertMess, setAlertMess] = useState<{ content: any } | null>(null);
  const [fileUrl, setFileUrl] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Мемоизированные данные для статистики
  const [stats, setStats] = useState<UserStats>({
    files: 0,
    tasks: 0,
    answers: 0,
    groups: 0
  });

  const [gradeDistribution, setGradeDistribution] = useState<GradeDistribution[]>([]);
  const [upcomingTask, setUpcomingTask] = useState<UpcomingTask | null>(null);

  // Конфигурация для оценок
  const gradeConfig = {
    '5': { color: '#10B981', label: 'Отлично (5)' },
    '4': { color: '#3B82F6', label: 'Хорошо (4)' },
    '3': { color: '#F59E0B', label: 'Удовлетворительно (3)' },
    '2': { color: '#EF4444', label: 'Неудовлетворительно (2)' },
    '0': { color: '#6B7280', label: 'Не оценено' }
  };

  const getUserInfo = useCallback(async () => {
    try {
      setLoading(true);
      const res = await get(`/get-user/${params.uid}`);

      if (!res || !res.data) {
        throw new Error('Invalid response from server');
      }

      const user = res.data;
      setUserData(user);

      // Расчет статистики
      setStats({
        files: user.files?.length || 0,
        tasks: user.tasks?.length || 0,
        answers: user.answers?.length || 0,
        groups: (user.groups?.length || 0) + (user.tutors?.length || 0)
      });

      // Расчет распределения оценок
      const gradeCounts = {
        '5': 0, '4': 0, '3': 0, '2': 0, '0': 0
      };

      user.answers?.forEach((answer: any) => {
        const mark = answer.mark?.toString() || '0';
        if (gradeCounts.hasOwnProperty(mark)) {
          gradeCounts[mark as keyof typeof gradeCounts]++;
        }
      });

      const totalAnswers = user.answers?.length || 0;
      const distribution = Object.entries(gradeCounts).map(([grade, count]) => ({
        name: grade,
        value: totalAnswers > 0 ? (count / totalAnswers) * 100 : 0,
        color: gradeConfig[grade as keyof typeof gradeConfig]?.color || '#6B7280',
        label: gradeConfig[grade as keyof typeof gradeConfig]?.label || grade
      }));

      setGradeDistribution(distribution);

      // Поиск ближайшей задачи
      const now = new Date();
      const upcomingTasks = user.tasks
        ?.filter((task: any) => new Date(task.deadline) >= now)
        .sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

      if (upcomingTasks?.length > 0) {
        const nearest = upcomingTasks[0];
        setUpcomingTask({
          id: nearest.id,
          name: nearest.title,
          time: nearest.deadline,
          deadline: new Date(nearest.deadline)
        });
      } else {
        setUpcomingTask(null);
      }

    } catch (err: any) {
      console.error('Error fetching user info:', err);
      notFound();
    } finally {
      setLoading(false);
    }
  }, [params.uid, get]);

  useEffect(() => {
    getUserInfo();
  }, [getUserInfo]);

  const saveFile = async (e: FormEvent, type: string) => {
    e.preventDefault();

    const showAlert = (message: string, isError: boolean = false) => {
      const alertContent = (
        <div className="p-2">
          <div className="font-semibold mb-2">{isError ? '❌ Ошибка' : '✅ Успешно'}</div>
          <div className="text-sm">{message}</div>
          <div className="text-xs text-gray-500 mt-2">
            {new Date().toLocaleString()}
          </div>
        </div>
      );
      setAlertMess({ content: alertContent });
    };

    try {
      if (type === 'file') {
        if (!selectedFile) {
          throw new Error('Файл не выбран');
        }

        const maxSize = 5 * 1024 * 1024;
        if (selectedFile.size > maxSize) {
          throw new Error('Файл слишком большой. Максимальный размер: 5MB');
        }

        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(selectedFile.type)) {
          throw new Error('Разрешены только изображения: JPEG, PNG, GIF, WebP');
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('author_id', currentUser?.id?.toString() || '1');

        const response: any = await post('/save-file', formData);

        if (!response || !response.url) {
          throw new Error('Сервер не вернул URL файла');
        }

        const avatarUrl = `http://localhost:8001${response.url}`;
        await post(`/user/${currentUser?.id}/set-avatar`, { avatar: avatarUrl });

        showAlert('Файл успешно загружен и установлен как аватар');

        setTimeout(() => {
          window.location.reload();
        }, 1500);

      } else if (type === 'link') {
        const linkInput = document.querySelector('#avatar-link') as HTMLInputElement;

        if (!linkInput || !linkInput.value.trim()) {
          throw new Error('Введите ссылку на изображение');
        }

        const url = linkInput.value.trim();

        if (url.match(/^https?:\/\/.+\/.+\.(jpg|jpeg|png|gif|webp)$/i)) {
          await post(`/user/${currentUser?.id}/set-avatar`, { avatar: url });
          showAlert('Аватар успешно установлен по ссылке');

          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          throw new Error('Неверный формат ссылки. Убедитесь, что ссылка ведет на изображение');
        }
      }
    } catch (error: any) {
      showAlert(error.message || 'Произошла ошибка', true);
    }
  };

  // Копирование текста
  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);

      const alertContent = (
        <div className="p-2">
          <div className="font-semibold mb-2">📋 Скопировано</div>
          <div className="text-sm break-all">{text}</div>
          <div className="text-xs text-gray-500 mt-2">
            {new Date().toLocaleString()}
          </div>
        </div>
      );
      setAlertMess({ content: alertContent });

      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Мемоизированные данные для диаграммы
  const chartData = useMemo(() => gradeDistribution, [gradeDistribution]);

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-main mx-auto mb-4" />
            <p className="text-gray-600">Загрузка профиля...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!userData) {
    return notFound();
  }

  const statsCards = [
    { label: 'Файлы', value: stats.files, icon: FileText, href: `/users/${params.uid}/files`, color: 'white' },
    { label: 'Задания', value: stats.tasks, icon: BookOpen, href: `/users/${params.uid}/tasks`, color: 'from-green-500 to-green-600' },
    { label: 'Ответы', value: stats.answers, icon: ClipboardCheck, href: `/users/${params.uid}/answers`, color: 'from-purple-500 to-purple-600' },
    { label: 'Группы', value: stats.groups, icon: Users, href: `/users/${params.uid}/groups`, color: 'from-orange-500 to-orange-600' },
  ];

  return (
    <MainLayout alertMess={alertMess?.content}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col items-center text-center">
              {userData?.id === currentUser?.id ? (
                <Popup
                  id='saveAvatar'
                  openTrigger={
                    <div className="relative group cursor-pointer">
                      <img
                        src={userData?.avatar || 'https://i2.wp.com/vdostavka.ru/wp-content/uploads/2019/05/no-avatar.png?fit=512%2C512&ssl=1'}
                        alt={userData?.name}
                        className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  }
                  sidebar={null}
                >
                  <div className="w-full max-w-md p-6">
                    <h3 className="text-xl font-bold mb-4">Изменить аватар</h3>
                    <div className="space-y-4">
                      <div className="bg-gray-50 rounded-lg p-4 flex justify-center">
                        <img src={fileUrl || '/api/placeholder/200/200'} className="w-40 h-40 rounded-full object-cover" alt="Preview" />
                      </div>

                      <form onSubmit={(e) => saveFile(e, 'file')} className="space-y-3">
                        <input
                          type="file"
                          accept='image/*'
                          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-main file:text-white hover:file:bg-main-hover"
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

                              if (validTypes.includes(file.type)) {
                                setSelectedFile(file);
                                setDisabled(false);
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                  if (e.target?.result) setFileUrl(e.target.result as string);
                                };
                                reader.readAsDataURL(file);
                              } else {
                                setDisabled(true);
                                setFileUrl('');
                                alert('Неверный формат файла');
                              }
                            }
                          }}
                        />
                        <button
                          type="submit"
                          disabled={disabled}
                          className="w-full bg-main text-white py-2 rounded-lg hover:bg-main-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Загрузить файл
                        </button>
                      </form>

                      <form onSubmit={(e) => saveFile(e, 'link')} className="space-y-3">
                        <div className="relative">
                          <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            id="avatar-link"
                            type="text"
                            placeholder="https://example.com/image.jpg"
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-main focus:border-transparent"
                            onChange={(e) => setDisabledLink(!e.target.value.trim())}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={disabledLink}
                          className="w-full bg-main text-white py-2 rounded-lg hover:bg-main-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Сохранить по ссылке
                        </button>
                      </form>
                    </div>
                  </div>
                </Popup>
              ) : (
                <img
                  src={userData?.avatar || 'https://i2.wp.com/vdostavka.ru/wp-content/uploads/2019/05/no-avatar.png?fit=512%2C512&ssl=1'}
                  alt={userData?.name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                />
              )}

              <h1 className="mt-4 text-2xl font-bold text-gray-900">
                {userData?.name} {userData?.surname}
              </h1>

              <p className="text-gray-600 mt-1">{userData?.email}</p>

              <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                {userData?.role === 'admin' ? (
                  <Link href='/admin' className="hover:text-main transition-colors">
                    Администратор
                  </Link>
                ) : (
                  userData?.role === 'teacher' ? 'Преподаватель' : 'Студент'
                )}
              </div>

              {userData?.login && (
                <div className="mt-4 w-full">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Логин:</span>
                    <button
                      onClick={() => copyToClipboard(userData.login, 'login')}
                      className="flex items-center gap-2 text-sm font-mono bg-white px-3 py-1 rounded border hover:border-main transition-colors group"
                    >
                      {userData.login}
                      {copiedField === 'login' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400 group-hover:text-main transition-colors" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Статистика */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            {statsCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.label}
                  href={card.href}
                  className="group relative overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition-all border-transparent border-2 hover:border-main duration-100"
                >
                  <div className={`absolute inset-0 bg-white `} />
                  <div className="relative p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">{card.label}</p>
                        <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                      </div>
                      <Icon className="w-8 h-8 text-gray-400 group-hover:scale-110 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Star className="w-5 h-5 text-main" />
              Распределение оценок
            </h2>
            {stats.answers > 0 ? (
              <div className="flex flex-col items-center justify-center gap-6">
                <div className="w-64 h-64 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        innerRadius={45}
                        fill="#8884d8"
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number | undefined) => {
                          if (value === undefined) return ['0%', 'Доля'];
                          return [`${value.toFixed(1)}%`, 'Доля'];
                        }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex-1 space-y-3">
                  {chartData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between gap-4 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-medium text-gray-700">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {item.value.toFixed(1)}%
                        </span>
                        <span className="text-xs text-gray-500">
                          ({Math.round((item.value / 100) * stats.answers)})
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 mt-2 border-t border-gray-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Всего оценок:</span>
                      <span className="font-semibold text-gray-900">{stats.answers}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-80 text-gray-500">
                <div className="text-center">
                  <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Нет данных об оценках</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <Calendar
              tasks={userData?.tasks || []}
              onTaskClick={(task) => {
                router.push(`/tasks/${task.id}`);
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Link
            href={upcomingTask ? `/tasks/${upcomingTask.id}` : '#'}
            className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all ${upcomingTask ? 'hover:shadow-md hover:border-main cursor-pointer' : 'cursor-default'
              }`}
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-orange-500" />
              Ближайшая задача
            </h2>
            {upcomingTask ? (
              <div className="space-y-3">
                <p className="text-lg font-semibold text-gray-900">{upcomingTask.name}</p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CalendarIcon className="w-4 h-4" />
                  <span>Дедлайн: {formatDate(upcomingTask.time)}</span>
                </div>
                <div className="mt-4 inline-flex items-center text-main hover:text-main-hover transition-colors">
                  Перейти к задаче →
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Нет предстоящих задач</p>
              </div>
            )}
          </Link>

          {/* Задать вопрос */}
          <Link
            href={`/contacts/${userData?.id}`}
            className="bg-gradient-to-br from-main to-main-hover rounded-2xl shadow-sm p-6 text-white hover:shadow-lg transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold mb-2">Нужна помощь?</h2>
                <p className="text-white/90 mb-4">Задайте вопрос преподавателю или администратору</p>
                <div className="inline-flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2 group-hover:bg-white/30 transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  <span>Написать сообщение</span>
                </div>
              </div>
              <MessageCircle className="w-12 h-12 text-white/50 group-hover:scale-110 transition-transform" />
            </div>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
'use client'

import SearchTable, { SearchRecord } from "@/components/searchTable/SearchTable";
import AdminLayout from "@/layouts/AdminLayout";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/context/authContext";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  User,
  Phone,
  Mail,
  Calendar,
  X,
  Check,
  Users,
  GraduationCap,
  UserCog,
  Shield,
  UserPlus,
  RefreshCw,
  Send,
  Trash2
} from 'lucide-react';

export default function BookingPage() {
  const params = useParams();
  const auth = useAuth();
  if (!auth) {
    return null;
  }
  const { get, post } = auth;
  const [users, setUsers] = useState<{ id: number, name: string, login: string, role: string }[]>([]);
  const [groups, setGroups] = useState<{ id: number, name: string }[]>([]);
  const [disabled, setDisabled] = useState(false);
  const [alertMess, setAlertMess] = useState<{ content: any } | null>(null);

  const [funcRole, setFuncRole] = useState('student');

  const [booking, setBooking] = useState<{
    id: number,
    surname: string,
    name: string,
    status: string,
    messanger: string,
    tel: number,
    email: string,
    target: string,
    user_id: number | null,
    created_at: string
  }>();
  const [formData, setFormData] = useState<{
    name: string;
    login: string;
    password: string;
    role: string;
  }>({
    name: '',
    login: '',
    password: '',
    role: 'student'
  });
  const [generatedLogin, setGeneratedLogin] = useState<string>('');
  const [isLoginManuallyEdited, setIsLoginManuallyEdited] = useState(false);

  const showAlert = (title: string, message: string, isError: boolean = false) => {
    const alertContent = (
      <div className="p-3">
        <div className="flex items-center gap-2 font-semibold mb-2">
          {isError ? (
            <XCircle className="w-5 h-5 text-red-500" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-500" />
          )}
          <span>{title}</span>
        </div>
        <div className="text-sm">{message}</div>
        <div className="text-xs text-gray-500 mt-2">
          {new Date().toLocaleString()}
        </div>
      </div>
    );
    setAlertMess({ content: alertContent });

    setTimeout(() => setAlertMess(null), 5000);
  };

  useEffect(() => {
    getBookingInfo((params?.bid)?.toString() || '');
    getUsers();
    getGroups();
  }, []);

  useEffect(() => {
    if (booking && !isLoginManuallyEdited && booking.status === 'waiting') {
      generateUniqueLogin();
    }
  }, [booking, users, isLoginManuallyEdited]);

  const getUsers = async () => {
    const res = await get('/get-users');

    const usersRecord = res.data?.data?.map((item: any) => ({
      id: item.id,
      name: item.name,
      login: item.login,
      role: item.role
    })) || res.data?.map((item: any) => ({
      id: item.id,
      name: item.name,
      login: item.login,
      role: item.role
    })) || [];

    setUsers(prev => [...prev, ...usersRecord]);
  };

  const getGroups = async () => {
    try {
      const res = await get('/get-groups');

      const groupRecords = res.data.data?.map((item: any) => ({
        id: item.id,
        name: item.name
      })) || res.data?.map((item: any) => ({
        id: item.id,
        name: item.name
      })) || [];

      setGroups(prev => [...prev, ...groupRecords]);
    } catch (error) {
      console.log('Error loading groups:' + error);
      showAlert('Ошибка', 'Не удалось загрузить группы', true);
    }
  };

  const getBookingInfo = async (id: string) => {
    const res = await get(`/get-booking/${id}`);
    setBooking(res.data.data);
  };

  const transliterate = (text: string) => {
    const cyrillicToLatin: { [key: string]: string } = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
      'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E',
      'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
      'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
      'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
      'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
    };

    return text.split('').map(char => cyrillicToLatin[char] || char).join('');
  };

  const generateUniqueLogin = async () => {
    if (!booking) return;

    let baseLogin = '';

    if (booking.email && booking.email.includes('@')) {
      baseLogin = booking.email.split('@')[0];
      baseLogin = baseLogin.replace(/[^a-zA-Z0-9_.]/g, '_').toLowerCase();
    } else {
      const latinName = transliterate(booking.surname.toLowerCase() + "_" + booking.name.toLowerCase());
      baseLogin = latinName;
      baseLogin = baseLogin.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
    }

    if (!baseLogin) {
      const latinName = transliterate(booking.name.toLowerCase());
      baseLogin = latinName.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
    }

    const existingLogins = users.map(user => user.login?.toLowerCase()).filter(Boolean);
    let uniqueLogin = baseLogin;
    let counter = 1;

    while (existingLogins.includes(uniqueLogin.toLowerCase())) {
      uniqueLogin = `${baseLogin}${counter}`;
      counter++;
    }

    setGeneratedLogin(uniqueLogin);

    if (!isLoginManuallyEdited) {
      setFormData(prev => ({ ...prev, login: uniqueLogin }));
    }
  };

  const sendNotification = (link: string, type: 'email' | 'messenger') => {
    let mailWindow = window.open(link, '_blank');
    let count = 0;
    let alertBox = document.createElement("div");

    const checkInterval = setInterval(() => {
      if (mailWindow && mailWindow.closed) {
        clearInterval(checkInterval);
        alertBox.remove();
        showAlert('Уведомление отправлено', 'Пользователь уведомлен', false);
      } else if (mailWindow && !mailWindow.closed) {
        alertBox.remove();
        alertBox.innerHTML = `
          <div class="flex items-center gap-2 p-3 bg-yellow-100 rounded-lg">
            <AlertCircle class="w-5 h-5 text-yellow-600" />
            <span class="text-sm text-yellow-800">Ожидание подтверждения отправки... (${++count})</span>
          </div>
        `;
        alertBox.style.cssText = "position:fixed; bottom:20px; right:20px; z-index:1000; min-width:250px";
        document.body.appendChild(alertBox);
      }
    }, 1000);
  };

  const bookingSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setDisabled(true);
    let message;

    try {
      const isForgotPassword = booking?.target === 'forgot-password';

      if (booking?.status !== 'canceled' && booking?.status !== 'done') {
        if (isForgotPassword) {
          const newData = {
            password: formData.password,
            login: booking?.email
          };

          await post(`/user/${booking?.user_id}/edit`, newData);
          await post(`/bookings/${booking?.id}/edit`, { status: 'done', user_id: booking.user_id });

          let link;
          if (booking?.messanger === 'email') {
            link = `https://mail.google.com/mail/?view=cm&to=${booking?.email}&su=Восстановление%20пароля&body=Здравствуйте!%20Ваш%20пароль%20был%20изменен!%20%0A%20Новый%20пароль:%20${newData?.password}%20%0A%20%0A%20Просьба%20не%20терять%20его%20и%20не%20сообщать%20третьим%20лицам.`;
          } else {
            link = `https://${booking?.messanger}/${booking?.tel}?text=Восстановление%20пароля&body=Здравствуйте!%20Ваш%20пароль%20был%20изменен!%20%0A%20Новый%20пароль:%20${newData?.password}%20%0A%20%0A%20Просьба%20не%20терять%20его%20и%20не%20сообщать%20третьим%20лицам.`;
          }
          sendNotification(link, booking?.messanger === 'email' ? 'email' : 'messenger');

          showAlert('Успешно', 'Пароль успешно сброшен', false);
          await getBookingInfo((params?.bid)?.toString() || '');
        } else {
          const finalLogin = formData.login || generatedLogin;

          const newData = {
            ...formData,
            name: `${booking?.surname} ${booking?.name}`,
            login: finalLogin
          };

          const res = await post('/create-user', newData);
          await post(`/bookings/${booking?.id}/edit`, { status: 'done', user_id: res.data.id });

          if (formData.role !== 'admin') {
            const funcRoleField = document.querySelector('#id_knave') as HTMLSelectElement;
            await post('/funcrole', {
              role: formData.role,
              id_owner: res.data.id,
              id_knave: Number(funcRoleField.value),
            });
          }

          let link;
          if (booking?.messanger === 'email') {
            link = `https://mail.google.com/mail/?view=cm&to=${booking?.email}&su=Заявка%20одобрена&body=Здравствуйте!%20Ваша%20заявка%20одобрена!%20%0A%20Данные%20для%20входа:%0AЛогин:%20${newData?.login}%0AПароль:%20${newData?.password}%20%0A%20%0A%20Просьба%20не%20терять%20их%20и%20не%20сообщать%20третьим%20лицам.`;
          } else {
            link = `https://${booking?.messanger}/${booking?.tel}?text=Здравствуйте! Ваша заявка одобрена! %0A Данные для входа: %0A Логин: ${newData?.login} Пароль: ${newData?.password} %0A %0A Просьба не терять их и не сообщать третьим лицам.`;
          }
          sendNotification(link, booking?.messanger === 'email' ? 'email' : 'messenger');

          showAlert('Успешно', 'Заявка принята и обработана', false);
          await getBookingInfo((params?.bid)?.toString() || '');
        }
      } else {
        showAlert('Ошибка', 'Данное действие невозможно на данный момент', true);
      }
    } catch (err: any) {
      showAlert('Ошибка', err.message || 'Произошла ошибка при обработке', true);
    } finally {
      setDisabled(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'login') {
      setIsLoginManuallyEdited(true);
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const bookingCancel = async () => {
    if (booking?.status !== 'canceled' && booking?.status !== 'done') {
      await post(`/bookings/${params.bid}/edit`, { status: 'canceled' });
      showAlert('Успешно', 'Заявка отклонена', false);
      await getBookingInfo((params?.bid)?.toString() || '');
    } else {
      showAlert('Ошибка', 'Данное действие недоступно', true);
    }
  };

  const getStatusBadge = () => {
    switch (booking?.status) {
      case 'waiting':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium flex items-center gap-1">
          <Clock className="w-3 h-3" /> Ожидает
        </span>;
      case 'done':
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Выполнено
        </span>;
      case 'canceled':
        return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Отклонено
        </span>;
      default:
        return null;
    }
  };

  const getLoginSource = () => {
    if (!booking) return '';
    if (booking.email && booking.email.includes('@')) {
      return `сгенерирован из email: ${booking.email.split('@')[0]}`;
    }
    return `сгенерирован из имени: ${booking.name}`;
  };

  const isForgotPassword = booking?.target === 'forgot-password';
  const canEdit = booking?.status === 'waiting';

  // Временная иконка для Clock (если нет в импорте)
  const Clock = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  return (
    <AdminLayout>
      {alertMess?.content && (
        <div className="fixed top-4 right-4 z-50 max-w-sm animate-in slide-in-from-top-2">
          {alertMess.content}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Левая колонка - Информация о заявке */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-main px-6 py-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-6 h-6" />
                  Заявка № {booking?.id}
                </h2>
                {getStatusBadge()}
              </div>
              {isForgotPassword && (
                <div className="mt-2 inline-flex items-center gap-1 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                  <RefreshCw className="w-3 h-3" />
                  Восстановление пароля
                </div>
              )}
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start space-x-3 pb-3 border-b border-gray-100">
                <User className="w-5 h-5 text-main mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Личные данные</div>
                  <div className="font-medium text-gray-900">{booking?.surname} {booking?.name}</div>
                </div>
              </div>

              <div className="flex items-start space-x-3 pb-3 border-b border-gray-100">
                <Phone className="w-5 h-5 text-main mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Телефон связи</div>
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`${/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
                      ? `tel:${booking?.tel}`
                      : booking?.messanger === 'email'
                        ? `https://mail.google.com/mail/?view=cm&to=${booking?.email}&su=Тема%20письма&body=Здравствуйте!%20Хочу%20уточнить%20информацию%20по%20поводу%20вашей%20заявки`
                        : `https://${booking?.messanger}/${booking?.tel}?text=${encodeURIComponent('Здравствуйте! Хочу уточнить информацию по поводу вашей заявки')}`}`}
                    className="text-main hover:text-green-700 font-medium break-all"
                  >
                    {booking?.tel}
                  </a>
                </div>
              </div>

              {booking?.email && (
                <div className="flex items-start space-x-3 pb-3 border-b border-gray-100">
                  <Mail className="w-5 h-5 text-main mt-0.5" />
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Email</div>
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`https://mail.google.com/mail/?view=cm&to=${booking?.email}&su=Тема%20письма&body=Здравствуйте!%20Хочу%20уточнить%20информацию%20по%20поводу%20вашей%20заявки`}
                      className="text-main hover:text-green-700 font-medium break-all"
                    >
                      {booking?.email}
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-start space-x-3 pb-3 border-b border-gray-100">
                <Calendar className="w-5 h-5 text-main mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Дата отправки</div>
                  <div className="font-medium text-gray-900">{new Date(booking?.created_at || '').toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</div>
                </div>
              </div>

              {booking?.status === 'waiting' && (
                <button
                  onClick={bookingCancel}
                  className="w-full mt-6 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>Отклонить заявку</span>
                </button>
              )}
            </div>
          </div>

          {/* Правая колонка - Форма обработки (только для активных заявок) */}
          {canEdit && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-main px-6 py-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <UserCog className="w-6 h-6" />
                  {booking?.status === 'waiting' ? 'Обработка заявки' : 'Редактирование данных'}
                </h2>
                <p className="text-white/80 text-sm mt-1">
                  Заполните данные для пользователя
                </p>
              </div>

              <div className="p-6">
                <form onSubmit={bookingSubmit} className="space-y-6">
                  {!isForgotPassword && (
                    <div>
                      <label htmlFor="login" className="block text-sm font-medium text-gray-700 mb-2">
                        Логин
                        {!isLoginManuallyEdited && booking?.status === 'waiting' && (
                          <span className="text-xs text-gray-500 ml-2">(автоматически)</span>
                        )}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="login"
                          name="login"
                          type="text"
                          required
                          value={formData?.login || generatedLogin || ''}
                          onChange={handleChange}
                          className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-main focus:border-transparent transition-all duration-200"
                          placeholder="Введите логин"
                        />
                      </div>
                      {!isLoginManuallyEdited && booking?.status === 'waiting' && generatedLogin && (
                        <p className="mt-1 text-xs text-main flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          {getLoginSource()}, проверен на уникальность
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      {isForgotPassword ? 'Новый пароль' : 'Пароль'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Shield className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type="text"
                        required
                        value={formData?.password}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-main focus:border-transparent transition-all duration-200"
                        placeholder={isForgotPassword ? "Введите новый пароль" : "Введите пароль"}
                      />
                    </div>
                  </div>

                  {!isForgotPassword && (
                    <>
                      <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                          Уровень доступа
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <GraduationCap className="h-5 w-5 text-gray-400" />
                          </div>
                          <select
                            name="role"
                            id="role"
                            className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-main focus:border-transparent appearance-none bg-white"
                            onChange={(e) => {
                              setFuncRole(e.currentTarget.value);
                              setFormData(prev => ({ ...prev, role: e.target?.value }));
                            }}
                            defaultValue="student"
                          >
                            <option value="student">Ученик</option>
                            <option value="parent">Родитель</option>
                            <option value="teacher">Учитель</option>
                            <option value="admin">Администратор</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="id_knave" className="block text-sm font-medium text-gray-700 mb-2">
                          {funcRole === 'student' || funcRole === 'teacher'
                            ? 'Группа'
                            : funcRole === 'parent'
                              ? 'Ребенок'
                              : 'Дополнительное значение'}
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Users className="h-5 w-5 text-gray-400" />
                          </div>
                          <select
                            name="id_knave"
                            id="id_knave"
                            className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-main focus:border-transparent appearance-none bg-white"
                          >
                            <option value="">Выберите значение</option>
                            {(funcRole === 'student' || funcRole === 'teacher') ? (
                              groups.map((item: any) => (
                                <option value={item.id} key={item.id}>{item.name}</option>
                              ))
                            ) : funcRole === 'parent' ? (
                              users
                                .filter((item: any) => item.role === 'student')
                                .map((item: any) => (
                                  <option value={item.id} key={item.id}>{item.name}</option>
                                ))
                            ) : (
                              <option value="">Нет дополнительных параметров</option>
                            )}
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={disabled}
                    className="w-full px-4 py-3 bg-main text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                  >
                    {disabled ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Обработка...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>
                          {isForgotPassword ? 'Сбросить пароль' : 'Принять заявку'}
                        </span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Сообщение для отмененных заявок */}
          {booking?.status === 'canceled' && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gray-600 px-6 py-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <XCircle className="w-6 h-6" />
                  Заявка отклонена
                </h2>
              </div>
              <div className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <XCircle className="w-16 h-16 text-red-400" />
                </div>
                <p className="text-gray-500">Данная заявка была отклонена и не может быть обработана</p>
              </div>
            </div>
          )}

          {/* Сообщение для выполненных заявок */}
          {booking?.status === 'done' && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-green-600 px-6 py-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <CheckCircle className="w-6 h-6" />
                  Заявка выполнена
                </h2>
              </div>
              <div className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <CheckCircle className="w-16 h-16 text-green-400" />
                </div>
                <p className="text-gray-500">Данная заявка уже обработана и не требует действий</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
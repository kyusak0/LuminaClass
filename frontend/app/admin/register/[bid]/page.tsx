'use client'

import { Organization } from "@/api";
import SearchTable, { SearchRecord } from "@/components/searchTable/SearchTable";
import AdminLayout from "@/layouts/AdminLayout";
import { convertSegmentPathToStaticExportFilename } from "next/dist/shared/lib/segment-cache/segment-value-encoding";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/context/authContext";
import Alert from "@/components/alert/Alert";

export default function BookingPage() {
    const params = useParams();
    const auth = useAuth();
    if (!auth) {
        return
    }
    const { get, post } = auth;
    const [users, setUsers] = useState<{ id: number, name: string, login: string, role: string }[]>([]);
    const [groups, setGroups] = useState<{ id: number, name: string }[]>([]);
    const [disabled, setDisabled] = useState(false)

    const [funcRole, setFuncRole] = useState('student')

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
    })
    const [generatedLogin, setGeneratedLogin] = useState<string>('');
    const [isLoginManuallyEdited, setIsLoginManuallyEdited] = useState(false);

    useEffect(() => {
        getBookingInfo((params?.bid)?.toString() || '');
        getUsers();
        getGroups();
    }, [])

    // Генерация логина при изменении данных заявки или списка пользователей
    useEffect(() => {
        if (booking && !isLoginManuallyEdited) {
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

        setUsers(prev => [...prev, ...usersRecord])
    }

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

            setGroups(prev => [...prev, ...groupRecords])
        } catch (error) {
            console.log('Error loading groups:' + error);
        }
    };

    const getBookingInfo = async (id: string) => {
        const res = await get(`/get-booking/${id}`);
        setBooking(res.data.data)
    }

    // Функция для транслитерации кириллицы в латиницу
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

    // Функция для генерации уникального логина
    const generateUniqueLogin = async () => {
        if (!booking) return;

        let baseLogin = '';

        // Если есть email, берем часть до @
        if (booking.email && booking.email.includes('@')) {
            baseLogin = booking.email.split('@')[0];
            // Очищаем от спецсимволов, оставляем только буквы, цифры, подчеркивание и точку
            baseLogin = baseLogin.replace(/[^a-zA-Z0-9_.]/g, '_').toLowerCase();
        }
        // Если email нет, генерируем из имени
        else {
            const latinName = transliterate(booking.surname.toLowerCase()+"_"+booking.name.toLowerCase());
            baseLogin = latinName;
            // Убираем пробелы и спецсимволы, оставляем только буквы, цифры, подчеркивание
            baseLogin = baseLogin.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
        }

        // Если после очистки получилась пустая строка, используем стандартный формат
        if (!baseLogin) {
            const latinName = transliterate(booking.name.toLowerCase());
            baseLogin = latinName.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
        }

        // Проверяем уникальность среди существующих пользователей
        let uniqueLogin = baseLogin;
        let counter = 1;

        // Получаем список всех логинов из users
        const existingLogins = users.map(user => user.login?.toLowerCase()).filter(Boolean);

        while (existingLogins.includes(uniqueLogin.toLowerCase())) {
            uniqueLogin = `${baseLogin}${counter}`;
            counter++;
        }

        setGeneratedLogin(uniqueLogin);

        // Если поле логина не было отредактировано вручную, обновляем его
        if (!isLoginManuallyEdited) {
            setFormData(prev => ({ ...prev, login: uniqueLogin }));
        }
    };

    const [alertMess, setAlertMess] = useState<{ content: any }>();

    const bookingSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setDisabled(true);
        let message
        let newData
        try {
            const isForgotPassword = booking?.target === 'forgot-password';

            if (booking?.status != 'canceled' && booking?.status != 'done') {

                if (isForgotPassword) {
                    newData = {
                        password: formData.password,
                        login: booking?.email
                    }

                    // Обновляем пароль пользователя
                    const res = await post(`/user/${booking?.user_id}/edit`, newData);
                    message = res.message
                    console.log(res)

                    // Обновляем статус заявки
                    const dataToSend = { status: 'done', user_id: booking.user_id };
                    const editRes = await post(`/bookings/${booking?.id}/edit`, dataToSend);

                    // Отправляем новый пароль на почту
                    let mailWindow: any = null;
                    let link: string
                    if (booking?.messanger == 'email') {
                        link = `https://mail.google.com/mail/?view=cm&to=${booking?.email}&su=Восстановление%20пароля&body=Здравствуйте!%20Ваш%20пароль%20был%20изменен!%20%0A%20Новый%20пароль:%20${newData?.password}%20%0A%20%0A%20Просьба%20не%20терять%20его%20и%20не%20сообщать%20третьим%20лицам.%20Администрация%20не%20будет%20спрашивать%20у%20Вас%20Ваши%20личные%20данные!`
                    } else {
                        link = `https://${booking?.messanger}/${booking?.tel}?text=Восстановление%20пароля&body=Здравствуйте!%20Ваш%20пароль%20был%20изменен!%20%0A%20Новый%20пароль:%20${newData?.password}%20%0A%20%0A%20Просьба%20не%20терять%20его%20и%20не%20сообщать%20третьим%20лицам.%20Администрация%20не%20будет%20спрашивать%20у%20Вас%20Ваши%20личные%20данные!`
                    }
                    mailWindow = window.open(link, '_blank')

                    let count: number = 0
                    let alertBox = document.createElement("a");

                    const checkInterval = setInterval(() => {
                        if (mailWindow && mailWindow.closed) {
                            clearInterval(checkInterval);
                            alertBox.remove();
                        } else if (!mailWindow.closed) {
                            window.addEventListener('beforeunload', function (e) {
                                e.preventDefault();
                                e.returnValue = '';
                            });
                            alertBox.remove();
                            alertBox.innerText = "письмо отправлено!" + count;
                            alertBox.setAttribute('href', link)
                            alertBox.setAttribute('target', '_blank')
                            count++
                            alertBox.style.cssText = "position:fixed; top:10px; right:10px; background:yellow; padding:10px; width: 100%; text-align:center";
                            document.body.appendChild(alertBox);
                        }
                    }, 1000);

                } else {
                    const finalLogin = formData.login || generatedLogin;

                    newData = {
                        ...formData,
                        name: booking?.surname+" "+booking?.name,
                        login: finalLogin
                    }

                    const res = await post('/create-user', newData);

                    const dataToSend = { status: 'done', user_id: res.data.id };
                    const editRes = await post(`/bookings/${booking?.id}/edit`, dataToSend);

                    message = editRes.message

                    const funcRoleField = document.querySelector('#id_knave') as HTMLSelectElement;

                    if (formData.role != 'admin') {
                        const funcRoleRes = await post('/funcrole', {
                            role: formData.role,
                            id_owner: res.data.id,
                            id_knave: Number(funcRoleField.value),
                        });
                        message = funcRoleRes.message
                    }

                    let mailWindow: any = null;
                    let link: string
                    if (booking?.messanger == 'email') {
                        link = `https://mail.google.com/mail/?view=cm&to=${booking?.email}&su=Заявка%20одобрена&body=Здравствуйте!%20Ваша%20заявка%20одобрена!%20%0A%20Данные%20для%20входа:%0AЛогин:%20${newData?.login}%0AПароль:%20${newData?.password}%20%0A%20%0A%20Просьба%20не%20терять%20их%20и%20не%20сообщать%20третьим%20лицам.%20Администрация%20не%20будет%20спрашивать%20у%20Вас%20Ваши%20личные%20данные!`
                        mailWindow = window.open(link, '_blank')
                    } else {
                        link = `https://${booking?.messanger}/${booking?.tel}?text=Здравствуйте! Ваша заявка одобрена! %0A Данные для входа: %0A Логин: ${newData?.login} Пароль: ${newData?.password} %0A %0A Просьба не терять их и не сообщать третьим лицам. Администрация не будет спрашивать у Вас Ваши личные данные!`
                        mailWindow = window.open(link, '_blank')
                    }

                    let count: number = 0
                    let alertBox = document.createElement("a");

                    const checkInterval = setInterval(() => {
                        if (mailWindow && mailWindow.closed) {
                            clearInterval(checkInterval);
                            alertBox.remove();
                        } else if (!mailWindow.closed) {
                            window.addEventListener('beforeunload', function (e) {
                                e.preventDefault();
                                e.returnValue = '';
                            });
                            alertBox.remove();
                            alertBox.innerText = "письмо!" + count;
                            alertBox.setAttribute('href', link)
                            alertBox.setAttribute('target', '_blank')
                            count++
                            alertBox.style.cssText = "position:fixed; top:10px; right:10px; background:yellow; padding:10px; width: 100%; text-align:center";
                            document.body.appendChild(alertBox);
                        }
                    }, 1000);
                }
            }
            else {
                message = 'данное действие невозможно на данный момент';
                getBookingInfo((params?.bid)?.toString() || '');
            }

            const alertContent = (
                <div>
                    <div>Сообщение:</div>
                    <div className="font-semibold my-1">{message}</div>
                    <div className="text-xs text-gray-500">
                        в {new Date().toLocaleTimeString()}, {new Date().toLocaleDateString()}
                    </div>
                </div>
            );
            setAlertMess({ content: alertContent });
        } catch (err: any) {
            const alertContent = (
                <div>
                    <div>Ошибка:</div>
                    <div className="font-semibold my-1">{err.message}</div>
                    <div className="text-xs text-gray-500">
                        в {new Date().toLocaleTimeString()}, {new Date().toLocaleDateString()}
                    </div>
                </div>
            );
            setAlertMess({ content: alertContent });
        } finally {
            setDisabled(false);
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'login') {
            setIsLoginManuallyEdited(true);
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    }

    const bookingCancel = async () => {
        let message
        if (booking?.status != 'canceled' && booking?.status != 'done') {
            const dataToSend = { id: booking?.id, status: 'canceled' };
            const editRes = await post(`/bookings/${params.bid}/edit`, dataToSend);
            message = editRes.message
            await getBookingInfo((params?.bid)?.toString() || '');
        } else {
            message = 'Данное действие недоступно'
        }

        const alertContent = (
            <div>
                <div>Сообщение:</div>
                <div className="font-semibold my-1">{message}</div>
                <div className="text-xs text-gray-500">
                    в {new Date().toLocaleTimeString()}, {new Date().toLocaleDateString()}
                </div>
            </div>
        );
        setAlertMess({ content: alertContent });
    }

    const restoreBooking = async (event: FormEvent) => {
        event.preventDefault();
        setDisabled(true);
        let message
        try {
            const isForgotPassword = booking?.target === 'forgot-password';

            if (isForgotPassword) {
                const newData = {
                    password: formData.password,
                    email: booking?.email
                }

                const res = await post(`/user/${booking?.user_id}/edit`, newData);
                message = res.message
                console.log(res)

                // Обновляем статус заявки на done (если нужно)
                if (booking?.status !== 'done') {
                    const dataToSend = { id: booking?.id, status: 'done' };
                    const editRes = await post('/bookings/edit', dataToSend);
                    message = editRes.message
                }

                // Отправляем новый пароль на почту
                let mailWindow: any = null;
                let link = `https://mail.google.com/mail/?view=cm&to=${booking?.email}&su=Восстановление%20пароля&body=Здравствуйте!%20Ваш%20пароль%20был%20изменен!%20%0A%20Новый%20пароль:%20${newData?.password}%20%0A%20%0A%20Просьба%20не%20терять%20его%20и%20не%20сообщать%20третьим%20лицам.%20Администрация%20не%20будет%20спрашивать%20у%20Вас%20Ваши%20личные%20данные!`
                mailWindow = window.open(link, '_blank')

                let count: number = 0
                let alertBox = document.createElement("a");

                const checkInterval = setInterval(() => {
                    if (mailWindow && mailWindow.closed) {
                        clearInterval(checkInterval);
                        alertBox.remove();
                    } else if (!mailWindow.closed) {
                        window.addEventListener('beforeunload', function (e) {
                            e.preventDefault();
                            e.returnValue = '';
                        });
                        alertBox.remove();
                        alertBox.innerText = "письмо отправлено!" + count;
                        alertBox.setAttribute('href', link)
                        alertBox.setAttribute('target', '_blank')
                        count++
                        alertBox.style.cssText = "position:fixed; top:10px; right:10px; background:yellow; padding:10px; width: 100%; text-align:center";
                        document.body.appendChild(alertBox);
                    }
                }, 1000);
            } else {
                // Для обычной заявки: обновляем данные пользователя
                const newData = {
                    login: formData.login,
                    password: formData.password,
                    role: formData.role,
                }

                // Обновляем данные пользователя
                const res = await post(`/user/${booking?.user_id}/edit`, newData);
                message = res.message
                console.log(res)

                // Обновляем статус заявки на done (если нужно)
                if (booking?.status !== 'done') {
                    const dataToSend = { id: booking?.id, status: 'done' };
                    const editRes = await post('/bookings/edit', dataToSend);
                    message = editRes.message
                }

                // Отправляем новые данные на почту
                let link = `https://mail.google.com/mail/?view=cm&to=${booking?.email}&su=Обновление%20данных&body=Здравствуйте!%20Ваши%20данные%20были%20обновлены!%20%0A%20Логин:%20${newData?.login}%0AПароль:%20${newData?.password}%20%0A%20%0A%20Просьба%20не%20терять%20их%20и%20не%20сообщать%20третьим%20лицам.`
                window.open(link, '_blank')
            }

            // Обновляем информацию о заявке
            await getBookingInfo((params?.bid)?.toString() || '');

            const alertContent = (
                <div>
                    <div>Сообщение:</div>
                    <div className="font-semibold my-1">{message || 'Данные успешно обновлены'}</div>
                    <div className="text-xs text-gray-500">
                        в {new Date().toLocaleTimeString()}, {new Date().toLocaleDateString()}
                    </div>
                </div>
            );
            setAlertMess({ content: alertContent });
        } catch (err: any) {
            const alertContent = (
                <div>
                    <div>Ошибка:</div>
                    <div className="font-semibold my-1">{err.message}</div>
                    <div className="text-xs text-gray-500">
                        в {new Date().toLocaleTimeString()}, {new Date().toLocaleDateString()}
                    </div>
                </div>
            );
            setAlertMess({ content: alertContent });
        } finally {
            setDisabled(false);
        }
    }

    const isForgotPassword = booking?.target === 'forgot-password';

    const getStatusBadge = () => {
        switch (booking?.status) {
            case 'waiting':
                return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">Ожидает</span>;
            case 'done':
                return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Выполнено</span>;
            case 'canceled':
                return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">Отклонено</span>;
            default:
                return null;
        }
    };

    // Определяем источник генерации логина для отображения
    const getLoginSource = () => {
        if (!booking) return '';
        if (booking.email && booking.email.includes('@')) {
            return `сгенерирован из email: ${booking.email.split('@')[0]}`;
        }
        return `сгенерирован из имени: ${booking.name}`;
    };

    return (
        <AdminLayout>
            <Alert alertMess={alertMess?.content} />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Левая колонка - Информация о заявке */}
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                        <div className="bg-main px-6 py-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-white">
                                    Заявка № {booking?.id}
                                </h2>
                                {getStatusBadge()}
                            </div>
                            {isForgotPassword && (
                                <div className="mt-2 inline-block bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                                    Восстановление пароля
                                </div>
                            )}
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="flex items-start space-x-3 pb-3 border-b border-gray-100">
                                <svg className="w-5 h-5 text-main mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wide">Личные данные</div>
                                    <div className="font-medium text-gray-900">{booking?.surname} {booking?.name}</div>
                                </div>
                            </div>

                            <div className="flex items-start space-x-3 pb-3 border-b border-gray-100">
                                <svg className="w-5 h-5 text-main mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wide">Телефон связи</div>
                                    <a
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        href={`${/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
                                            ? `tel:${booking?.tel}`
                                            : booking?.messanger == 'email'
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
                                    <svg className="w-5 h-5 text-main mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
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
                                <svg className="w-5 h-5 text-main mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
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
                                    className="w-full mt-6 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>Отклонить заявку</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Правая колонка - Форма обработки */}
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                        <div className="bg-main px-6 py-4">
                            <h2 className="text-2xl font-bold text-white">
                                {booking?.status === 'waiting' ? 'Обработка заявки' : 'Редактирование данных'}
                            </h2>
                            <p className="text-white/80 text-sm mt-1">
                                {booking?.status === 'waiting'
                                    ? 'Заполните данные для пользователя'
                                    : 'Измените данные при необходимости'}
                            </p>
                        </div>

                        <div className="p-6">
                            <form onSubmit={booking?.status === 'waiting' ? bookingSubmit : restoreBooking} className="space-y-6">
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
                                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
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
                                            <p className="mt-1 text-xs text-main">
                                                ✓ {getLoginSource()}, проверен на уникальность
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
                                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
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
                                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                    </svg>
                                                </div>
                                                <select
                                                    name="role"
                                                    id="role"
                                                    className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-main focus:border-transparent appearance-none bg-white"
                                                    onChange={(e) => {
                                                        setFuncRole(e.currentTarget.value);
                                                        setFormData(prev => ({ ...prev, role: e.target?.value }))
                                                    }}
                                                    defaultValue="student"
                                                >
                                                    <option value="student">👨‍🎓 Ученик</option>
                                                    <option value="parent">👨‍👩‍👧 Родитель</option>
                                                    <option value="teacher">👨‍🏫 Учитель</option>
                                                    <option value="admin">👑 Администратор</option>
                                                </select>
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
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
                                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                    </svg>
                                                </div>
                                                <select
                                                    name="id_knave"
                                                    id="id_knave"
                                                    className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-main focus:border-transparent appearance-none bg-white"
                                                >
                                                    <option value="">Выберите значение</option>
                                                    {(funcRole == 'student' || funcRole == 'teacher') ? (
                                                        groups.map((item: any) => (
                                                            <option value={item.id} key={item.id}>{item.name}</option>
                                                        ))
                                                    ) : funcRole == 'parent' ? (
                                                        users
                                                            .filter((item: any) => item.role == 'student')
                                                            .map((item: any) => (
                                                                <option value={item.id} key={item.id}>{item.name}</option>
                                                            ))
                                                    ) : (
                                                        <option value="">Нет дополнительных параметров</option>
                                                    )}
                                                </select>
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <button
                                    type="submit"
                                    disabled={disabled}
                                    className="w-full px-4 py-3 bg-main text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
                                >
                                    {disabled ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Обработка...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>
                                                {booking?.status === 'waiting'
                                                    ? (isForgotPassword ? 'Сбросить пароль' : 'Принять заявку')
                                                    : (isForgotPassword ? 'Сбросить пароль' : 'Сохранить изменения')}
                                            </span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}
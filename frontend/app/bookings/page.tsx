'use client'

import { api, type AppUser, Booking } from "@/api";
import MainLayout from "@/layouts/MainLayout";
import { convertSegmentPathToStaticExportFilename } from "next/dist/shared/lib/segment-cache/segment-value-encoding";
import Link from "next/link";
import { useState, useEffect, MouseEvent } from 'react';

export default function SuccessPage() {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchParam, setSearchParam] = useState('');
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);

    useEffect(() => {
        loadPage();
    }, []);

    const loadPage = async () => {
        try {
            const userData = await api.getUser();
            setUser(userData);
            await getBookings();
        } finally {
            setLoading(false);
        }
    };

    const getBookings = async () => {
        setLoading(true);
        const data = await api.getBooking('');
        setBookings(data.data);
        searchRes('');
        setLoading(false)
    }

    const searchRes = (value: any) => {
        const currentSearchParam = typeof value === 'string'
            ? value.toLowerCase().trim().replace(/\s+/g, '')
            : value.target.value.toLowerCase().trim().replace(/\s+/g, '');
        setSearchParam(currentSearchParam);

        if (!currentSearchParam || currentSearchParam == '') {
            const allWaitingBookings = bookings.filter(booking => booking.status === 'waiting');
            setFilteredBookings(allWaitingBookings);
            return;
        }

        const filtered = bookings.filter(booking => {
            if (booking.status !== 'waiting') {
                return false;
            }

            let fullName

            if (user?.role == 'admin') {
                fullName = `${booking.id} ${booking.name} ${booking.surname} ${booking.email} ${booking.tel}`.toLowerCase().replace(/\s+/g, '');

            } else if (user?.role != 'admin') {
                fullName = `${booking.id} ${booking.name} ${booking.surname}`.toLowerCase().replace(/\s+/g, '');
            }

            return fullName?.includes(currentSearchParam);
        });

        setFilteredBookings(filtered);
    };

    const [alertMess, setAlertMess] = useState<{ content: any }>();

    const copyText = async (event: MouseEvent) => {
        try {
            const text = event.currentTarget.textContent;
            await navigator.clipboard.writeText(text);
            const alertContent = (
                <div>
                    <div>тект скопирован в буфер обмена:</div>
                    <div className="font-semibold my-1">{text}</div>
                    <div className="text-xs text-gray-500">
                        в {new Date().toLocaleTimeString()}, {new Date().toLocaleDateString()}
                    </div>
                </div>
            );
            setAlertMess({ content: alertContent });
        } catch (error: any) {
            setAlertMess(error.message + Date.now())
        }
    }

    if (loading) {
        return (
            <div className="h-170 flex flex-col items-center justify-center">
                Загрузка...
            </div>
        )
    }
    return (
        <MainLayout alertMess={alertMess?.content}>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Здесь вы можете посмотреть все заявки в очереди
            </h2>
            <div className="flex justify-center">
                <form action="" className="flex" >
                    <input type="search" onChange={searchRes} placeholder="Поиск..." className="w-full flex items-center justify-center px-8 py-3 border-l border-y border-green-600 text-base font-medium outline-transparent rounded-l-lg text-green-600 bg-white hover:bg-gray-50 md:py-2 md:text-lg md:px-2 " />
                    <input type="submit" value="🔍︎" className="w-1/4 flex items-center justify-center px-8 py-3 border-r border-y border-green-600 text-base font-medium rounded-r-lg text-green-600 bg-white hover:bg-gray-50 md:py-2 md:text-lg md:px-2" />
                </form>
                <button onClick={getBookings}
                    className="flex items-center justify-center px-8 py-2 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 md:py-2 md:text-lg md:px-10">
                    Обновить
                </button>
            </div>



            <div className="">
                <div className="grid grid-cols-5 bg-foreground">
                    <div className="col-span-1 border border-green-600 px-2 py-1">номер заявки</div>
                    <div className="col-span-1 border border-green-600 px-2 py-1">Имя</div>
                    <div className="col-span-1 border border-green-600 px-2 py-1">Фамилия</div>
                    <div className="col-span-1 border border-green-600 px-2 py-1">Почта</div>
                    <div className="col-span-1 border border-green-600 px-2 py-1">Телефон</div>
                </div>
                {(searchParam ? filteredBookings : bookings.filter(b => b.status === 'waiting')).map((booking: Booking) => (
                    <div key={booking.id}
                        id="bookings-list"
                        className="grid grid-cols-5 bg-foreground">
                        <button
                            onClick={(e) => copyText(e)}
                            id="bookings-list-id"
                            className="col-span-1 border border-green-600 px-2 py-1 text-left"
                        >{booking.id}</button>
                        <button
                            onClick={(e) => copyText(e)}
                            id="bookings-list-name"
                            className="col-span-1 border border-green-600 px-2 py-1 text-left"
                        >{booking.name}</button>
                        <button
                            onClick={(e) => copyText(e)}
                            id="bookings-list-surname"
                            className="col-span-1 border border-green-600 px-2 py-1 text-left"
                        >{booking.surname}</button>
                        <button
                            onClick={(e) => copyText(e)}
                            id="bookings-list-email"
                            className="col-span-1 border border-green-600 px-2 py-1 text-left"
                        >{user?.role == 'admin' ? booking.email : "***"}</button>
                        <button
                            onClick={(e) => copyText(e)}
                            id="bookings-list-tel"
                            className="col-span-1 border border-green-600 px-2 py-1 text-left"
                        >{user?.role == 'admin' ? booking.tel : "***"}</button>
                    </div>
                ))}
                {/* {filteredBookings.length == 0 && (
                    <div className="w-full flex justify-center p-5 text-4xl">
                        Заявок нет
                    </div>
                )} */}
                {(searchParam != '' && filteredBookings.length == 0) && (
                    <div className="w-full flex justify-center p-5 text-4xl">
                        По запросу "{searchParam}" ничего не найдено
                    </div>
                )}

            </div>

        </MainLayout >
    )
}
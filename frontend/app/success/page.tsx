'use client'

import MainLayout from "@/layouts/MainLayout";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SuccessPage() {

    // переделать и добавить проверку по логину а не номеру заявки

    const [taskNum, setTaskNum] = useState('')
    useEffect(() => {

        if (window) { setTaskNum(window.location.hash.substring(1)) }
    })


    return (
        <MainLayout>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Ваша заявка успешно отправлена
            </h2>
            <p>
                Ожидайте пока наши администраторы рассмотрят вашу заявку, о результатах можете узнать на указанном вами адресу почты или номеру телефона
            </p>
            <p>
                Номер вашей заявки : {taskNum}
            </p>
            <Link
                className="hover:text-green-600"
                href='/bookings'>📄 К заявкам</Link>
            <Link
                className="hover:text-green-600"
                href='/'>🏠 На главную</Link>
        </MainLayout>
    )
}
'use client'

import { api, AppUser } from "@/api";
import MainLayout from "@/layouts/MainLayout";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function UserPanel() {
    const router = useRouter();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUser();
    }, []);

    const getUsers = async () => {
        const res = await api.getUsers();
        setUsers(res)
    }

    const loadUser = async () => {
        try {
            const userData = await api.getUser();
            setUser(userData);
            getUsers()
        } catch (error) {
            console.error('Ошибка загрузки пользователя:', error);
            router.push('/login');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !user) {
        return (
            <div className="h-170 flex flex-col items-center justify-center">
                Загрузка...
            </div>
        )
    }

    if(user?.role != 'admin'){
        return notFound();
    }

    return (
        <MainLayout>
            <h2 className="text-4xl font-bold mb-8">
                <Link href='/admin' className="hover:text-green-600 transition-colors">
                    Панель Администратора
                </Link>
                <span className="mx-2">/</span>
                <span>Управление Пользователями</span>
            </h2>
            <div className="flex w-full text-left p-5 border-b-2 border-green-600">
                <div className="w-1/4">
                    <h3>student</h3>
                    <div className="flex flex-col py-5">
                        {users.map((user: AppUser) => (
                            user.role == 'student' && (
                                <Link href={`users/${user.id}`} className="" key={user.id}>{user.name}</Link>
                            )
                        ))}
                    </div>
                </div>
                <div className="w-1/4">
                    <h3>teacher</h3>
                    <div className="flex flex-col py-5">
                        {users.map((user: AppUser) => (
                            user.role == 'teacher' && (
                                <div className="" key={user.id}>{user.name}</div>
                            )
                        ))}</div>
                </div>
                <div className="w-1/4">
                    <h3>parent</h3>
                    <div className="flex flex-col py-5">
                        {users.map((user: AppUser) => (
                            user.role == 'parent' && (
                                <div className=""  key={user.id}>{user.name}</div>
                            )

                        ))}</div>
                </div>
                <div className="w-1/4">
                    <h3>admin</h3>
                    <div className="flex flex-col py-5">
                        {users.map((user: AppUser) => (
                            user.role == 'admin' && (
                                <div  key={user.id}>{user.name}</div>
                            )
                        ))}</div>
                </div>
            </div>
        </MainLayout>
    )
}
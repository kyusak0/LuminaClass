'use client'

import { link } from "fs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface SidebarProps {
    items: Array<{ id: number, el: string }>;
    onItemClick?: (id: number) => void;
    type?: string;
}

export default function Sidebar({ items, onItemClick, type }: SidebarProps) {
    const router = useRouter();

    const changeEl = (id: number) => {
        router.push(`#${id}`);
        if (onItemClick) {
            onItemClick(id);
        }
    }
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const openSidebar = () => setSidebarOpen(true);
    const closeSidebar = () => setSidebarOpen(false);

    return (
        <>
            <div className='fixed w-full top-0 left-0 z-1'>
                <div
                    onMouseMove={closeSidebar}
                    className={`duration-300 absolute h-screen bg-black ${sidebarOpen ? 'w-3/4' : 'w-0'} right-0 opacity-60`}
                ></div>
                <div
                    onMouseMove={openSidebar}
                    className={`duration-300 absolute h-screen bg-white left-0 flex flex-col gap-10 pt-40 text-nowrap ${sidebarOpen ? 'w-1/4 pl-20' : 'w-1/12 pl-10'} `}
                >
                    <div
                        className="absolute top-25 right-5"
                        onClick={sidebarOpen ? closeSidebar : openSidebar}
                    >
                        {sidebarOpen ? '❌' : '>'}
                    </div>
                    <div className={`h-170 flex flex-col gap-10 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
                        {items.map((item: any) => (
                            type == 'link' ? (
                                <Link
                                    className="text-left "
                                    key={item.id}
                                    href={`${item.id}`}
                                >{item.el}
                                </Link>
                            ) : (
                                <button
                                    className="text-left "
                                    key={item.id}
                                    onClick={() => changeEl(item.id)}
                                >{item.el}
                                </button>
                            )


                        ))}
                    </div>
                </div>
            </div>
        </>
    )
}
'use client'

import { ReactNode, useState } from "react"

interface PopupProps {
    children: ReactNode;
    id: string;
    openTrigger: React.ReactElement;
    sidebar: React.ReactElement | null;
}

export default function Popup({
    children, id, openTrigger, sidebar
}: PopupProps) {
    const [open, setOpen] = useState(false);
    const openPopup = () => setOpen(true);
    const closePopup = () => setOpen(false);
    const [fullScreen, setFullScreen] = useState(false);
    const [fullScreenSidebar, setFullScreenSidebar] = useState(false);

    const fullScreenResize = () => setFullScreen(!fullScreen);
    const fullScreenResizeSidebar = () => setFullScreenSidebar(!fullScreenSidebar);
    return (
        <>
            <div className="" onClick={openPopup}>
                {openTrigger}
            </div>
            {open && (
                <div className="fixed w-full top-0 left-0 z-4" id={id}>
                    <div className="absolute bg-gray-900 opacity-60 w-full h-screen top-0" onClick={closePopup}></div>

                    <div id='content' className={`absolute ${fullScreen ? 'w-full h-screen m-0 mt-10': `${sidebar ? 'm-30 h-120 w-2/4' : `${fullScreen ? 'w-full h-screen m-0' : 'mt-30 mx-100 h-120 w-2/4'}`}`}  z-index-3 bg-white p-5 flex flex-col justify-center items-center`}>
                        <div className="bg-gray-200 w-full h-10 absolute -top-10 flex items-top justify-end gap-5 pr-5">
                            <button
                                onClick={closePopup}
                                className="text-gray-500 hover:text-gray-700"
                                title="Свернуть"
                            >➖
                            </button>
                            <button
                                onClick={fullScreenResize}
                                className="text-gray-500 hover:text-gray-700"
                                title="Полный Экран"
                            >🖵</button>
                            <button
                                onClick={closePopup}
                                className="text-gray-500 hover:text-gray-700"
                                title="Закрыть"
                            >❌
                            </button>
                        </div>
                        
                            {children}
                    </div>
                    {(sidebar && !fullScreen) && (
                        <div className={`absolute ${fullScreenSidebar ? 'w-full h-screen' : 'w-1/4 h-120 mt-30 right-20'} z-index-3 bg-white overflow-y-auto p-5`}>

                            <div className="bg-gray-200 w-full h-10 absolute -top-10 flex items-top justify-end gap-5 pr-5"><button
                                onClick={fullScreenResizeSidebar}
                                className="text-gray-500 hover:text-gray-700"
                                title="Полный Экран"
                            >🖵</button>
                            </div>
                            {sidebar}
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
import { useEffect, useState } from "react";

export default function Alert({ alert }: any) {
    const [openedAlert, setOpenedAlert] = useState(false);
    const [currentAlert, setCurrentAlert] = useState('');
    const [num, setNum] = useState(10);

    const handleCloseAlert = () => {
        setOpenedAlert(false);
        setTimeout(() => {
            setCurrentAlert('');
            setNum(10);
        }, 300);
    };

    useEffect(() => {
        if (alert && alert.props?.children) {
            setCurrentAlert(alert);
            setOpenedAlert(true);
            setNum(10);

            const countdownTimer = setInterval(() => {
                setNum(prevNum => {
                    if (prevNum <= 1) {
                        clearInterval(countdownTimer);
                        return 0;
                    }
                    return prevNum - 1;
                });
            }, 1000);

            const closeTimer = setTimeout(() => {
                handleCloseAlert();
            }, 10000);

            return () => {
                clearInterval(countdownTimer);
                clearTimeout(closeTimer);
            };
        } else {
            setOpenedAlert(false);
        }
    }, [alert]);

    return (
        <>
            {openedAlert && (
                <div className="fixed top-4 right-4 sm:top-6 sm:right-6 md:top-8 md:right-8 z-50 animate-slide-in">
                    <div className="w-[calc(100vw-2rem)] sm:w-80 md:w-96 bg-white border-l-4 border-main rounded-lg shadow-lg overflow-hidden">
                        {/* Progress bar */}
                        <div className="relative h-1 bg-gray-100">
                            <div 
                                className="absolute h-full bg-main transition-all duration-1000 ease-linear"
                                style={{ width: `${(num / 10) * 100}%` }}
                            />
                        </div>

                        <div className="p-4">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <svg className="w-4 h-4 text-main" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>Уведомление</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleCloseAlert}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                    aria-label="Закрыть"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Content */}
                            <div className="mb-3 text-sm text-gray-700 break-words">
                                {currentAlert}
                            </div>

                            {/* Footer with timer */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                <div className="text-xs text-gray-400">
                                    Закроется через
                                </div>
                                <div className="flex items-center gap-1">
                                    <svg className="w-3 h-3 text-main animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-sm font-semibold text-main">{num}</span>
                                    <span className="text-xs text-gray-400">сек</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
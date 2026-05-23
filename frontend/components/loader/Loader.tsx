import MainLayout from "@/layouts/MainLayout";

export default function Loader() {
    return (
        <MainLayout>
            <div className="h-170 flex flex-col items-center justify-center">
                <div className="text-lg text-gray-500">Загрузка данных...</div>
                <div className="mt-4 w-16 h-16 border-4 border-main border-t-transparent rounded-full animate-spin"></div>
            </div>
        </MainLayout>
    )
}
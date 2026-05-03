import MainLayout from "@/layouts/MainLayout";
import Link from "next/link";

export default function docsPage() {
    return (
        <MainLayout>
            <div className="flex gap-5 justify-center">
                <Link href='/docs/terms'>Условия пользования</Link>
                <Link href='/docs/policy'>Политика конфидециальности</Link>
                <Link href='/docs/consent'>Пользовательское соглашение</Link>
            </div>
        </MainLayout>
    )
}
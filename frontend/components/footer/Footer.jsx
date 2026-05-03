import Link from "next/link";

export default function Footer() {
    return (
        <footer className="flex justify-evenly bg-green-600 p-10 text-white w-full">
            <div className="logo"><a href="/"><img src="/" alt="logo" title="to Home" /></a></div>
            <Link href='/docs/terms'>Условия пользования</Link>
            <Link href='/docs/policy'>Политика конфидециальности</Link>
            <Link href='/docs/consent'>Пользовательское соглашение</Link>
        </footer>
    )
}
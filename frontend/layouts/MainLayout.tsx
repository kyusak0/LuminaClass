'use client'
import Navigation from "@/components/navigation/Navigation";
import Footer from "@/components/footer/Footer";
import Alert from "@/components/alert/Alert";

interface MainLayoutProps {
  children: React.ReactNode;
  alertMess?: string | null
}

export default function MainLayout({ children, alertMess }: MainLayoutProps) {

  return (
    <>
      <div className="w-full flex items-center">
        <Navigation content={children} />
      </div>

      <Alert alert={alertMess} />
    </>
  );
}

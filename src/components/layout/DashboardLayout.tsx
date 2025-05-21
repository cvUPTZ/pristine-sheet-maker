
import { Outlet } from "react-router-dom";
import MainNavigation from "./MainNavigation";

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <MainNavigation />
      <main className="flex-1 p-6">
        {children || <Outlet />}
      </main>
    </div>
  );
}

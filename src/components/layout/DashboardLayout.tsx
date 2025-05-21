
import { ReactNode } from "react";
import MainNavigation from "./MainNavigation";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <MainNavigation />
      <main className="flex-1">{children}</main>
    </div>
  );
}

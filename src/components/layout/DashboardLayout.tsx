
import { Outlet } from "react-router-dom";
import MainNavigation from "./MainNavigation";

export default function DashboardLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <MainNavigation />
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}

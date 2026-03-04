import { Navigate, createFileRoute } from "@tanstack/react-router";

import AdminDashboard from "@/components/admin/DashboardPage";
import BannerSection from "@/components/home/BannerSection";
import HeaderSection from "@/components/home/HeaderSection";
import RecommendSection from "@/components/home/RecommendSection";
import ServiceSection from "@/components/home/ServiceSection";
import { useUserStore } from "@/stores/useUserStore";

export const Route = createFileRoute("/")({
  component: RouteComponent
});

function RouteComponent() {
  const { profile } = useUserStore();

  // If Admin, show Admin Dashboard
  if (profile?.role === "admin") {
    return <AdminDashboard />;
  }

  // If Freelance, show Freelance Dashboard
  if (profile?.role === "freelance") {
    return <Navigate to="/freelance" />;
  }

  // Otherwise, show regular Home Page
  return (
    <main className="relative pb-16 bg-[#FFF2EC]">
      <img src="home_header.png" alt="home_header" className="w-full" />

      <div className="container m-auto">
        <HeaderSection />
        <ServiceSection />
      </div>

      <BannerSection />

      <div className="container m-auto">
        <RecommendSection />
      </div>
    </main>
  );
}

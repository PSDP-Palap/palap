import { createFileRoute, Navigate } from "@tanstack/react-router";

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

  if (profile?.role === "admin") {
    return <AdminDashboard />;
  }

  if (profile?.role === "freelance") {
    return <Navigate to="/freelance" />;
  }

  return (
    <main className="relative pb-16 bg-[#FFF2EC]">
      <div className="relative">
        <img src="home_header.png" alt="home_header" className="w-full" />
        <HeaderSection />
      </div>

      <div className="max-w-6xl mx-auto px-4">
        <ServiceSection />
      </div>

      <BannerSection />

      <div className="max-w-6xl mx-auto px-4">
        <RecommendSection />
      </div>
    </main>
  );
}

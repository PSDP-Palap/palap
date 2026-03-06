import { createFileRoute, Navigate, redirect } from "@tanstack/react-router";

import BannerSection from "@/components/home/BannerSection";
import HeaderSection from "@/components/home/HeaderSection";
import RecommendSection from "@/components/home/RecommendSection";
import ServiceSection from "@/components/home/ServiceSection";
import Loading from "@/components/shared/Loading";
import { useUserStore } from "@/stores/useUserStore";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { initialize, isInitialized, fetchProfile } = useUserStore.getState();

    if (!isInitialized) {
      await initialize();
    }

    let currentProfile = useUserStore.getState().profile;

    if (!currentProfile) {
      currentProfile = await fetchProfile();
    }

    if (currentProfile?.role === "admin") {
      throw redirect({ to: "/management/admin" });
    }
  },
  component: RouteComponent,
  pendingComponent: () => <Loading />
});

function RouteComponent() {
  const { profile } = useUserStore();

  // If Freelance, show Freelance Dashboard
  if (profile?.role === "freelance") {
    return <Navigate to="/freelance" />;
  }

  // Otherwise, show regular Home Page (Customers & Guests)
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

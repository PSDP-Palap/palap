import { createFileRoute, Navigate, redirect } from "@tanstack/react-router";

import BannerSection from "@/components/home/BannerSection";
import HeaderSection from "@/components/home/HeaderSection";
import RecommendSection from "@/components/home/RecommendSection";
import ServiceSection from "@/components/home/ServiceSection";
import { useUserStore } from "@/stores/useUserStore";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { initialize, isInitialized, fetchProfile } = useUserStore.getState();

    if (!isInitialized) {
      await initialize();
    }

    let updatedProfile = useUserStore.getState().profile;

    if (!updatedProfile) {
      updatedProfile = await fetchProfile();
    }

    if (updatedProfile?.role === "admin") {
      throw redirect({ to: "/management/admin" });
    }
  },
  component: RouteComponent
});

function RouteComponent() {
  const { profile } = useUserStore();

  // If Admin, redirect to Management (Reactive fallback)
  if (profile?.role === "admin") {
    return <Navigate to="/management/admin" />;
  }

  // If Freelance, show Freelance Dashboard
  if (profile?.role === "freelance") {
    return (
      <div className="pt-24 container mx-auto text-center">
        <h1 className="text-2xl font-bold text-orange-600">
          Freelance Dashboard
        </h1>
        <p className="mt-4 text-gray-600">
          ยินดีต้อนรับ Freelance! คุณสามารถจัดการงานของคุณได้ที่นี่
        </p>

        <div className="mt-8 p-12 border-2 border-dashed border-gray-200 rounded-3xl">
          <p className="text-gray-400">Freelance Features Coming Soon...</p>
        </div>
      </div>
    );
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

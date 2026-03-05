import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";

import FloatingChatWidget from "@/components/chat/FloatingChatWidget";
import Navbar from "@/components/Navbar";
import Loading from "@/components/shared/Loading";
import GlobalOrderTrackingWidget from "@/components/tracking/GlobalOrderTrackingWidget";
import { useUserStore } from "@/stores/useUserStore";

export const Route = createRootRoute({
  component: RootLayout
});

function RootLayout() {
  const { isLoading, initialize, profile } = useUserStore();
  const isAdmin = profile?.role === "admin";
  const isFreelance = profile?.role === "customer";

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      <Toaster position="bottom-right" reverseOrder={false} />
      {!isAdmin && <Navbar />}
      <main>
        <Outlet />
      </main>
      {isFreelance && (
        <>
          <GlobalOrderTrackingWidget />
          <FloatingChatWidget />
        </>
      )}
      <TanStackRouterDevtools />
    </>
  );
}

import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";

import FloatingChatWidget from "@/components/chat/FloatingChatWidget";
import GlobalOrderTrackingWidget from "@/components/tracking/GlobalOrderTrackingWidget";
import Navbar from "@/components/Navbar";
import { useUserStore } from "@/stores/useUserStore";

export const Route = createRootRoute({
  component: RootLayout
});

function RootLayout() {
  const { isLoading, initialize } = useUserStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="bottom-right" reverseOrder={false} />
      <Navbar />
      <main>
        <Outlet />
      </main>
      <GlobalOrderTrackingWidget />
      <FloatingChatWidget />
      <TanStackRouterDevtools />
    </>
  );
}

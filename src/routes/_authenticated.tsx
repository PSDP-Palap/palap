import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { useUserStore } from "@/stores/useUserStore";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    console.log("[Router] Authenticated beforeLoad started");
    const { session, isInitialized } = useUserStore.getState();
    console.log("[Router] Authenticated beforeLoad state:", { isInitialized, hasSession: !!session });

    if (isInitialized && !session) {
      console.warn("[Router] No session found, redirecting to sign-in");
      throw redirect({
        to: "/sign-in"
      });
    }
  },
  component: () => <Outlet />
});

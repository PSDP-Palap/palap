import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { useUserStore } from "@/stores/useUserStore";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { session, isInitialized } = useUserStore.getState();

    if (isInitialized && !session) {
      throw redirect({
        to: "/sign-in"
      });
    }
  },
  component: () => <Outlet />
});

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { useUserStore } from "@/stores/useUserStore";

export const Route = createFileRoute("/_admin")({
	beforeLoad: async () => {
		const { initialize, isInitialized, fetchProfile } = useUserStore.getState();

		if (!isInitialized) {
			await initialize();
		}

		let updatedProfile = useUserStore.getState().profile;

		if (!updatedProfile) {
			updatedProfile = await fetchProfile();
		}

		if (!updatedProfile) {
			throw redirect({ to: "/sign-in" });
		}

		if (updatedProfile.role !== "admin") {
			throw redirect({ to: "/" });
		}
	},
	component: () => <Outlet />,
});

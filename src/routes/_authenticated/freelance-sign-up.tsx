import { createFileRoute, redirect } from "@tanstack/react-router";

import FreelanceRegisterForm from "@/components/auth/FreelanceRegisterForm";
import FreelanceRegisterHeader from "@/components/auth/FreelanceRegisterHeader";
import RegisterBackButton from "@/components/auth/RegisterBackButton";
import { useUserStore } from "@/stores/useUserStore";

export const Route = createFileRoute("/_authenticated/freelance-sign-up")({
	beforeLoad: async () => {
		const { profile } = useUserStore.getState();
		if (profile?.role === "freelance" || profile?.role === "admin") {
			throw redirect({ to: "/" });
		}
	},
	component: () => (
		<div className="min-h-screen flex items-center justify-center bg-linear-to-br from-orange-100 via-rose-50 to-amber-100 px-4">
			<div className="w-full max-w-2xl bg-white/90 backdrop-blur-sm shadow-xl rounded-3xl p-8 border border-orange-100 space-y-6">
				<div className="flex items-start justify-between gap-6">
					<RegisterBackButton />

					<div className="flex-1 space-y-5">
						<FreelanceRegisterHeader />
						<FreelanceRegisterForm />
					</div>
				</div>
			</div>
		</div>
	),
});

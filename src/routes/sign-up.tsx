import { createFileRoute, Link } from "@tanstack/react-router";

import RegisterBackButton from "@/components/auth/RegisterBackButton";
import RegisterForm from "@/components/auth/RegisterForm";
import RegisterHeader from "@/components/auth/RegisterHeader";

export const Route = createFileRoute("/sign-up")({
	component: () => (
		<div className="relative min-h-screen">
			<div className="absolute w-full h-full bg-[#FF6D2D] opacity-20" />
			<div className="absolute inset-0 bg-[url('/background.avif')] bg-cover bg-center opacity-30" />
			<div className="relative flex min-h-screen items-center justify-center px-4 pt-8 md:pt-28">
				<div className="w-full max-w-2xl bg-white/90 backdrop-blur-sm shadow-xl rounded-3xl p-8 border border-orange-100 space-y-6">
					<div className="flex items-start justify-between gap-6">
						<RegisterBackButton />

						<div className="flex-1 space-y-5">
							<RegisterHeader />
							<RegisterForm />

							<p className="text-center text-xs text-slate-600">
								Already have an account?{" "}
								<Link
									to="/sign-in"
									className="font-semibold text-orange-700 hover:text-orange-800 underline-offset-2 underline"
								>
									Login
								</Link>
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	),
});

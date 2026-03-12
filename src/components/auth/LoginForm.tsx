import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import toast from "react-hot-toast";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";

import supabase from "@/utils/supabase";

const LoginForm = () => {
	const router = useRouter();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const signIn = async (email: string, password: string) => {
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (error) {
			return { error: error.message };
		}

		return {};
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setSubmitting(true);

		const loadingToast = toast.loading("Authenticating...");

		try {
			const { error: signInError } = await signIn(email, password);

			if (signInError) {
				toast.error(signInError, { id: loadingToast });
				return;
			}

			toast.success("Welcome back!", { id: loadingToast });

			const {
				data: { session },
			} = await supabase.auth.getSession();
			const role = session?.user.app_metadata?.role;

			if (role === "admin") {
				router.navigate({ to: "/management/admin" });
			} else {
				router.navigate({ to: "/" });
			}
		} catch {
			toast.error("An unexpected error occurred. Please try again.", {
				id: loadingToast,
			});
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-5">
			<div className="space-y-2">
				<label className="text-xs font-black text-orange-900/50 uppercase tracking-[0.2em] ml-1">
					Email Address
				</label>
				<div className="relative group">
					<Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-300 group-focus-within:text-orange-500 transition-colors" />
					<input
						type="email"
						placeholder="example@gmail.com"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
						className="w-full bg-orange-50/30 border border-orange-100 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-[#4A2600] outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-300 transition-all placeholder:text-orange-200"
					/>
				</div>
			</div>

			<div className="space-y-2">
				<div className="flex justify-between items-center ml-1">
					<label className="text-xs font-black text-orange-900/50 uppercase tracking-[0.2em]">
						Password
					</label>
					<button
						type="button"
						className="text-[10px] font-black text-orange-600 hover:underline"
					>
						Forgot?
					</button>
				</div>
				<div className="relative group">
					<Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-300 group-focus-within:text-orange-500 transition-colors" />
					<input
						type={showPassword ? "text" : "password"}
						placeholder="••••••••"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
						className="w-full bg-orange-50/30 border border-orange-100 rounded-2xl py-3.5 pl-12 pr-12 text-sm font-bold text-[#4A2600] outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-300 transition-all placeholder:text-orange-200"
					/>
					<button
						type="button"
						onClick={() => setShowPassword(!showPassword)}
						className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-300 hover:text-orange-500 transition-colors"
					>
						{showPassword ? (
							<EyeOff className="w-5 h-5" />
						) : (
							<Eye className="w-5 h-5" />
						)}
					</button>
				</div>
			</div>

			<div className="flex items-center justify-between py-1">
				<label className="flex items-center gap-2 cursor-pointer group">
					<div className="relative flex items-center">
						<input
							type="checkbox"
							className="peer h-4 w-4 opacity-0 absolute cursor-pointer"
						/>
						<div className="h-4 w-4 bg-orange-50 border border-orange-200 rounded-md peer-checked:bg-orange-500 peer-checked:border-orange-500 transition-all shadow-inner" />
						<svg
							className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 left-0.5 pointer-events-none transition-opacity"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth="4"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M5 13l4 4L19 7"
							/>
						</svg>
					</div>
					<span className="text-xs font-bold text-orange-900/60 select-none group-hover:text-orange-900 transition-colors">
						Keep me signed in
					</span>
				</label>
			</div>

			<button
				type="submit"
				disabled={submitting}
				className="w-full group relative flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#FF914D] to-[#FF7F32] p-4 text-sm font-black text-white shadow-xl shadow-orange-900/20 hover:shadow-orange-900/30 hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
			>
				{submitting ? (
					<Loader2 className="w-5 h-5 animate-spin" />
				) : (
					<>
						Sign In
						<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
					</>
				)}
			</button>

			<p className="text-center text-xs font-bold text-gray-400">
				Don't have an account?{" "}
				<Link
					to="/sign-up"
					className="text-orange-600 hover:text-orange-700 transition-colors underline underline-offset-4"
				>
					Create account
				</Link>
			</p>
		</form>
	);
};

export default LoginForm;

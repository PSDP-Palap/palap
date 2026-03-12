import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useRouter,
} from "@tanstack/react-router";

import { useUserStore } from "@/stores/useUserStore";

export const Route = createFileRoute("/_admin/management")({
	beforeLoad: ({ location }) => {
		if (location.pathname === "/management") {
			throw redirect({ to: "/management/admin" });
		}
	},
	component: AdminManagementLayout,
});

function AdminManagementLayout() {
	const router = useRouter();
	const { profile, signOut } = useUserStore();

	const handleLogout = async () => {
		await signOut();
		router.navigate({ to: "/" });
	};

	const menuItems = [
		{ to: "/management/admin", label: "Admin" },
		{ to: "/management/freelance", label: "Freelance" },
		{ to: "/management/payment", label: "Payment" },
		{ to: "/management/shop", label: "Shop" },
		{ to: "/management/service", label: "Service" },
	] as const;

	return (
		<main className="min-h-screen bg-[#B73E00] flex overflow-hidden">
			<aside className="w-72 shrink-0 h-screen sticky top-0 flex flex-col py-4 pr-0 pl-0">
				<nav className="flex flex-col gap-2 bg-white p-4 pr-0 rounded-r-3xl shadow-sm h-full">
					<div className="mb-8 flex items-center gap-4 px-4">
						<div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0 shadow-sm border border-orange-100">
							<img
								src="/logo.png"
								alt="Palap"
								className="w-10 h-10 object-contain"
							/>
						</div>
						<div>
							<p className="text-[10px] font-bold text-orange-600 uppercase tracking-[0.2em] leading-none mb-1.5">
								Admin
							</p>
							<p className="font-black text-gray-900 text-lg leading-none">
								Management
							</p>
						</div>
					</div>

					<div className="flex-1 flex flex-col gap-2">
						{menuItems.map((item) => (
							<Link
								key={item.to}
								to={item.to}
								activeProps={{
									className: "bg-[#B73E00] border-[#A6411C] text-white",
								}}
								inactiveProps={{
									className:
										"bg-gray-50 border-transparent text-gray-700 hover:bg-orange-50 hover:border-orange-100",
								}}
								className="flex items-center gap-3 py-3 pl-5 pr-5 rounded-l-2xl rounded-r-none font-bold transition-all text-left border-2 border-r-0 text-sm"
							>
								{({ isActive }) => (
									<>
										<span className="flex-1">{item.label}</span>
										{isActive && (
											<div className="">
												<svg
													xmlns="http://www.w3.org/2000/svg"
													className="h-4 w-4"
													viewBox="0 0 20 20"
													fill="currentColor"
												>
													<path
														fillRule="evenodd"
														d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
														clipRule="evenodd"
													/>
												</svg>
											</div>
										)}
									</>
								)}
							</Link>
						))}
					</div>

					<button
						onClick={handleLogout}
						className="flex items-center gap-3 mt-auto py-3 px-5 mr-4 rounded-2xl font-bold transition-all text-left border-2 bg-red-50 border-transparent text-red-600 hover:bg-red-100 hover:border-red-200 text-sm"
					>
						<span className="flex-1">Logout</span>
						<div className="">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-4 w-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
								/>
							</svg>
						</div>
					</button>
				</nav>
			</aside>

			{/* Main Content Area - Scrollable Right */}
			<div className="flex-1 h-screen p-4 flex flex-col">
				<div className="w-full flex-1 flex flex-col min-h-0 space-y-6">
					<header className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between shrink-0">
						<div>
							<h1 className="text-3xl font-black text-gray-900 tracking-tight">
								Management System
							</h1>
							<p className="text-base text-gray-500 mt-1">
								ระบบจัดการหลังบ้านสำหรับผู้ดูแลระบบ
							</p>
						</div>
						{profile && (
							<div className="flex items-center gap-4 pl-8 border-l border-gray-100">
								<div className="text-right">
									<p className="font-black text-gray-900 text-lg leading-tight">
										{profile.full_name}
									</p>
									<p className="text-sm text-gray-500 font-medium mt-0.5">
										{profile.email}
									</p>
								</div>
								<div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center font-black text-orange-600 text-xl border-2 border-white shadow-md">
									{profile.full_name.charAt(0)}
								</div>
							</div>
						)}
					</header>

					<div className="min-w-0 flex-1 flex flex-col min-h-0">
						<Outlet />
					</div>
				</div>
			</div>
		</main>
	);
}

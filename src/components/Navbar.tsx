import { Link, useRouter } from "@tanstack/react-router";
import {
	History,
	Home,
	LogOut,
	Package,
	ShoppingCart,
	Stethoscope,
	User,
} from "lucide-react";
import { useRef, useState } from "react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCartStore } from "@/stores/useCartStore";
import { useUserStore } from "@/stores/useUserStore";

const Navbar = () => {
	const router = useRouter();
	const { session, profile, signOut } = useUserStore();
	const cartItems = useCartStore((s) => s.items);
	const itemCount = Object.values(cartItems).reduce((a, b) => a + b, 0);
	const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleLogout = async () => {
		console.log("Logging out...");
		await signOut();
		router.navigate({ to: "/" });
	};

	const isLoggedIn = !!session;
	const displayName = profile?.full_name || session?.user?.email || "User";
	const isFreelancer =
		String(profile?.role || "").toLowerCase() === "freelance";

	const [isDropdownOpen, setIsDropdownOpen] = useState(false);

	const handleMouseEnter = () => {
		if (closeTimeoutRef.current) {
			clearTimeout(closeTimeoutRef.current);
			closeTimeoutRef.current = null;
		}
		setIsDropdownOpen(true);
	};

	const handleMouseLeave = () => {
		closeTimeoutRef.current = setTimeout(() => {
			setIsDropdownOpen(false);
		}, 150);
	};

	return (
		<>
			{/* Desktop Navbar */}
			<nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-6xl bg-white rounded-full drop-shadow-xl z-100 pointer-events-auto hidden md:block">
				<div className="flex justify-between items-center py-4 px-8">
					<div className="flex items-center gap-2">
						<Link to="/" className="flex gap-2 items-center">
							<img src="/logo.png" alt="logo" className="h-8" />
							<img src="/logo_title.png" alt="logo_title.png" className="h-8" />
						</Link>
					</div>
					<ul className="flex gap-6 items-center">
						<li className="font-semibold hover:text-orange-500 transition-colors">
							{isFreelancer ? (
								<Link to="/freelance">แดชบอร์ด</Link>
							) : (
								<Link to="/">หน้าหลัก</Link>
							)}
						</li>
						{!isFreelancer && (
							<li className="font-semibold hover:text-orange-500 transition-colors">
								<Link to="/product">สินค้า</Link>
							</li>
						)}

						<li className="font-semibold hover:text-orange-500 transition-colors">
							<Link to="/service">บริการ</Link>
						</li>

						{!isFreelancer && (
							<li className="font-semibold hover:text-orange-500 transition-colors">
								<Link to="/cart" className="flex items-center gap-1.5 relative">
									<span>ตะกร้า</span>
									{itemCount > 0 && (
										<span className="bg-red-500 text-white text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full">
											{itemCount}
										</span>
									)}
								</Link>
							</li>
						)}

						{isLoggedIn ? (
							<div
								onMouseEnter={handleMouseEnter}
								onMouseLeave={handleMouseLeave}
							>
								<DropdownMenu
									open={isDropdownOpen}
									onOpenChange={setIsDropdownOpen}
									modal={false}
								>
									<DropdownMenuTrigger asChild>
										<li className="bg-[#F8CBB1] px-4 py-1.5 rounded-full text-sm text-gray-800 font-bold cursor-pointer hover:bg-[#F5BCA0] transition-colors flex items-center gap-2">
											<span>{displayName}</span>
											<div className="w-6 h-6 rounded-full bg-orange-700 text-white flex items-center justify-center text-[10px]">
												{displayName.charAt(0).toUpperCase()}
											</div>
										</li>
									</DropdownMenuTrigger>
									<DropdownMenuContent
										align="end"
										sideOffset={20}
										onMouseEnter={handleMouseEnter}
										onMouseLeave={handleMouseLeave}
										className="w-48 rounded-2xl p-2 bg-white border-orange-100 shadow-xl"
									>
										{" "}
										<DropdownMenuItem
											asChild
											className="rounded-xl focus:bg-orange-50 cursor-pointer"
										>
											<Link
												to="/profile"
												className="flex items-center gap-2 py-2"
											>
												<User className="w-4 h-4 text-orange-600" />
												<span className="font-bold text-gray-700">โปรไฟล์</span>
											</Link>
										</DropdownMenuItem>
										<DropdownMenuItem
											asChild
											className="rounded-xl focus:bg-orange-50 cursor-pointer"
										>
											<Link
												to="/order-history"
												className="flex items-center gap-2 py-2"
											>
												<History className="w-4 h-4 text-orange-600" />
												<span className="font-bold text-gray-700">
													ประวัติออเดอร์
												</span>
											</Link>
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={handleLogout}
											className="rounded-xl focus:bg-red-50 text-red-600 cursor-pointer flex items-center gap-2 py-2"
										>
											<LogOut className="w-4 h-4 text-orange-600" />
											<span className="font-bold">ออกจากระบบ</span>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						) : (
							<li className="font-semibold hover:text-orange-500 transition-colors">
								<Link to="/sign-in">เข้าสู่ระบบ</Link>
							</li>
						)}
					</ul>
				</div>
			</nav>

			<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-orange-100 z-100 px-2 py-2 md:hidden shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
				<ul className="flex justify-around items-center h-14">
					<li>
						<Link
							to={isFreelancer ? "/freelance" : "/"}
							className="flex flex-col items-center gap-1 text-gray-500 hover:text-orange-500 transition-colors"
							activeProps={{ className: "text-orange-600 font-bold" }}
						>
							<Home className="w-5 h-5" />
							<span className="text-[10px]">
								{isFreelancer ? "แดชบอร์ด" : "หน้าหลัก"}
							</span>
						</Link>
					</li>
					{!isFreelancer && (
						<li>
							<Link
								to="/product"
								className="flex flex-col items-center gap-1 text-gray-500 hover:text-orange-500 transition-colors"
								activeProps={{ className: "text-orange-600 font-bold" }}
							>
								<Package className="w-5 h-5" />
								<span className="text-[10px]">สินค้า</span>
							</Link>
						</li>
					)}
					<li>
						<Link
							to="/service"
							className="flex flex-col items-center gap-1 text-gray-500 hover:text-orange-500 transition-colors"
							activeProps={{ className: "text-orange-600 font-bold" }}
						>
							<Stethoscope className="w-5 h-5" />
							<span className="text-[10px]">บริการ</span>
						</Link>
					</li>
					{!isFreelancer && (
						<li>
							<Link
								to="/cart"
								className="flex flex-col items-center gap-1 text-gray-500 hover:text-orange-500 transition-colors"
								activeProps={{ className: "text-orange-600 font-bold" }}
							>
								<div className="relative">
									<ShoppingCart className="w-5 h-5" />
									{itemCount > 0 && (
										<span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white">
											{itemCount > 9 ? "9+" : itemCount}
										</span>
									)}
								</div>
								<span className="text-[10px]">ตะกร้า</span>
							</Link>
						</li>
					)}
					{isLoggedIn ? (
						<li>
							<Link
								to="/profile"
								className="flex flex-col items-center gap-1 text-gray-500 hover:text-orange-500 transition-colors"
								activeProps={{ className: "text-orange-600 font-bold" }}
							>
								<User className="w-5 h-5" />
								<span className="text-[10px]">โปรไฟล์</span>
							</Link>
						</li>
					) : (
						<li>
							<Link
								to="/sign-in"
								className="flex flex-col items-center gap-1 text-gray-500 hover:text-orange-500 transition-colors"
								activeProps={{ className: "text-orange-600 font-bold" }}
							>
								<User className="w-5 h-5" />
								<span className="text-[10px]">เข้าสู่ระบบ</span>
							</Link>
						</li>
					)}
				</ul>
			</nav>
		</>
	);
};

export default Navbar;

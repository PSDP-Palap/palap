import { Link, useRouter } from "@tanstack/react-router";
import { History, LogOut, User } from "lucide-react";
import { useRef, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useUserStore } from "@/stores/useUserStore";

const Navbar = () => {
  const router = useRouter();
  const { session, profile, signOut } = useUserStore();
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
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-6xl bg-white rounded-full drop-shadow-xl z-100 pointer-events-auto">
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
              <Link to="/freelance">DASHBOARD</Link>
            ) : (
              <Link to="/">HOME</Link>
            )}
          </li>
          {!isFreelancer && (
            <li className="font-semibold hover:text-orange-500 transition-colors">
              <Link to="/product">PRODUCT</Link>
            </li>
          )}

          <li className="font-semibold hover:text-orange-500 transition-colors">
            <Link to="/service">SERVICE</Link>
          </li>

          {isLoggedIn ? (
            <div
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <DropdownMenu
                open={isDropdownOpen}
                onOpenChange={setIsDropdownOpen}
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
                      <span className="font-bold text-gray-700">Profile</span>
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
                          Order History
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="rounded-xl focus:bg-red-50 text-red-600 cursor-pointer flex items-center gap-2 py-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="font-bold">Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <li className="font-semibold hover:text-orange-500 transition-colors">
              <Link to="/sign-in">LOGIN</Link>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;

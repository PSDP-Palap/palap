// Navbar.tsx
import { Link, useRouter } from "@tanstack/react-router";
import { useUserStore } from "@/stores/useUserStore";

const Navbar = () => {
  const router = useRouter();
  const { session, profile, signOut } = useUserStore();

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Logging out...");
    await signOut();
    router.navigate({ to: "/" });
  };

  const isLoggedIn = !!session;
  const displayName = profile?.full_name || session?.user?.email || null;
  
  // เช็คว่าเป็น Freelance หรือไม่
  const isFreelance = profile?.role === 'freelance'; 

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-6xl bg-white rounded-full drop-shadow-xl z-[100] pointer-events-auto">
      <div className="flex justify-between items-center py-4 px-8">
        <div className="flex items-center gap-2">
          <span>🐾</span>
          <span className="font-bold">Palap</span>
        </div>
        <ul className="flex gap-6 items-center">
          <li className="font-semibold hover:text-orange-500 transition-colors">
            <Link to="/">HOME</Link>
          </li>

          {/* --- ส่วนที่เพิ่มเข้ามา --- */}
          {isLoggedIn && isFreelance && (
            <li className="font-semibold hover:text-orange-500 transition-colors">
              <Link 
                to="/freelance" 
                activeProps={{ className: "text-orange-600 underline decoration-2 underline-offset-4" }}
              >
                DASHBOARD
              </Link>
            </li>
          )}
          {/* ----------------------- */}

          <li className="font-semibold hover:text-orange-500 transition-colors">
            <Link to="/service">SERVICE</Link>
          </li>

          {isLoggedIn ? (
            <>
              {/* ตกแต่งส่วน Welcome ให้เหมือน Mockup */}
              <li className="bg-[#F8CBB1] px-4 py-1 rounded-full text-sm text-gray-800">
                Welcome <Link to="/profile" className="text-orange-700 font-bold ml-1">{displayName}</Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="font-semibold text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                >
                  LOGOUT
                </button>
              </li>
            </>
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
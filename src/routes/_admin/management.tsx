import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useRouter
} from "@tanstack/react-router";

import { useUserStore } from "@/stores/useUserStore";

export const Route = createFileRoute("/_admin/management")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/management") {
      throw redirect({ to: "/management/admin" });
    }
  },
  component: AdminManagementLayout
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
    { to: "/management/service", label: "Service" }
  ] as const;

  return (
    <main className="min-h-screen bg-gray-50 pt-16 pb-16">
      <div className="container mx-auto px-4">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              ระบบจัดการหลังบ้านสำหรับผู้ดูแลระบบ
            </p>
          </div>

          {profile && (
            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="text-right">
                <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">
                  Admin Access
                </p>
                <p className="font-bold text-gray-800 text-lg">
                  {profile.full_name}
                </p>
                <p className="text-xs text-gray-400">{profile.email}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <span className="text-xl font-bold text-orange-600">
                  {profile.full_name.charAt(0)}
                </span>
              </div>
            </div>
          )}
        </header>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-72 shrink-0">
            <nav className="flex flex-col gap-2 sticky top-16">
              {menuItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeProps={{
                    className: "bg-[#A6411C] border-[#A6411C] text-white"
                  }}
                  inactiveProps={{
                    className:
                      "bg-white border-transparent text-gray-700 hover:bg-orange-50 hover:border-orange-100"
                  }}
                  className="flex items-center gap-3 py-4 px-6 rounded-2xl font-bold transition-all text-left shadow-sm border-2"
                >
                  {({ isActive }) => (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {isActive && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </>
                  )}
                </Link>
              ))}

              <button
                onClick={handleLogout}
                className="flex items-center gap-3 mt-4 py-4 px-6 rounded-2xl font-bold transition-all text-left shadow-sm border-2 bg-white border-transparent text-red-600 hover:bg-red-50 hover:border-red-100"
              >
                <span className="flex-1">Logout</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
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
              </button>
            </nav>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
    </main>
  );
}

import {
  createFileRoute,
  Link,
  Outlet,
  redirect
} from "@tanstack/react-router";

import { useUserStore } from "@/stores/useUserStore";

export const Route = createFileRoute("/_freelance/freelance")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/freelance") {
      throw redirect({ to: "/freelance/dashboard" });
    }
  },
  component: FreelanceManagementLayout
});

function FreelanceManagementLayout() {
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;
  const displayName = profile?.full_name || session?.user?.email || "Freelance";

  const roleBadges = Array.from(
    new Set(
      [
        (profile?.role || "freelance").toUpperCase(),
        currentUserId ? "FREELANCE" : null
      ].filter(Boolean) as string[]
    )
  );

  const menuItems = [
    { to: "/freelance/dashboard", label: "Dashboard" },
    { to: "/freelance/jobs", label: "My Jobs" },
    { to: "/freelance/messages", label: "Messages" },
    { to: "/freelance/earning", label: "Earning" },
    { to: "/freelance/account", label: "Account Setting" }
  ] as const;

  return (
    <div className="h-screen bg-[#FCE6D5] pt-24 pb-6 font-sans overflow-hidden">
      <main className="max-w-6xl mx-auto px-4 h-full">
        <section className="w-full h-full bg-[#e9bc9a] rounded-2xl border border-orange-100 p-4 md:p-6 flex flex-col min-h-0 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4 md:gap-6 flex-1 min-h-0 overflow-hidden">
            {/* Sidebar Boxed inside the section */}
            <aside className="space-y-3 flex flex-col min-h-0 h-full">
              <div className="bg-white rounded-[26px] p-5 flex flex-col items-center shadow-sm border border-gray-100 relative shrink-0">
                <div className="w-20 h-20 rounded-full overflow-hidden border-[3px] border-[#8E3A19] mb-3 shadow-sm flex items-center justify-center bg-orange-100 text-2xl font-black text-[#5D2611]">
                  {String(displayName).charAt(0).toUpperCase()}
                </div>

                <h3 className="font-bold text-base mb-3 text-gray-800 text-center leading-tight">
                  {displayName}
                </h3>

                <div className="flex flex-col gap-1.5 w-full px-2">
                  {roleBadges.map((role) => (
                    <span
                      key={role}
                      className="bg-[#8E3A19] text-white text-[10px] font-bold py-1 rounded-md text-center tracking-tight uppercase"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>

              <nav className="flex flex-col gap-2 overflow-y-auto pr-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    activeProps={{
                      className: "bg-[#C04E21] text-white border-[#C04E21]"
                    }}
                    inactiveProps={{
                      className:
                        "bg-white text-gray-600 border-transparent hover:bg-orange-50"
                    }}
                    className="py-2.5 px-6 rounded-2xl font-bold text-xs shadow-sm transition-all text-center border-2 shrink-0"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </aside>

            {/* Content Area - Scrollable */}
            <section className="space-y-4 min-w-0 h-full overflow-y-auto overscroll-behavior-none">
              <Outlet />
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}

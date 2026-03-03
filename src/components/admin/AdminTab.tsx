import { useEffect, useState } from "react";

import type { AdminUser, Profile } from "@/types/user";
import supabase from "@/utils/supabase";

import { AddAdminDialog } from "./AddAdminDialog";
import { DeleteAdminDialog } from "./DeleteAdminDialog";
import { EditAdminDialog } from "./EditAdminDialog";

export const AdminTab = () => {
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Profile | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState<Profile | null>(null);

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "management-admin",
        {
          method: "GET"
        }
      );

      if (error) {
        if (error.name === "AbortError" || error.message === "Fetch is aborted")
          return;
        throw error;
      }

      if (data?.error) throw new Error(data.error);

      const rawList = Array.isArray(data) ? data : data?.data || [];
      const adminList = rawList.map((admin: AdminUser) => ({
        ...admin,
        full_name:
          admin.full_name ||
          admin.user_metadata?.full_name ||
          admin.user_metadata?.display_name ||
          "Admin"
      })) as Profile[];
      setAdmins(adminList);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (
        error.name === "AbortError" ||
        error.message?.includes("AbortError") ||
        error.message === "Fetch is aborted"
      )
        return;
      console.error("Error fetching admins via edge function:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchAdmins();
    return () => controller.abort();
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-800">Admin</h2>
          <button
            onClick={() => fetchAdmins()}
            disabled={isLoading}
            className="p-2 text-gray-500 hover:text-[#A6411C] hover:bg-orange-50 rounded-xl transition-all disabled:opacity-50"
            title="รีเฟรชข้อมูล"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-[#A6411C] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#8e3718] transition-colors"
        >
          เพิ่ม Admin ใหม่
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-sm">
              <th className="px-6 py-4 font-semibold">No.</th>
              <th className="px-6 py-4 font-semibold">ID</th>
              <th className="px-6 py-4 font-semibold">Name</th>
              <th className="px-6 py-4 font-semibold">Email</th>
              <th className="px-6 py-4 font-semibold text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-10 text-center text-gray-500"
                >
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            ) : admins.length > 0 ? (
              admins.map((admin, index) => (
                <tr
                  key={admin.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-500">
                    {admin.id}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {admin.full_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {admin.email}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => setEditingAdmin(admin)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
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
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeletingAdmin(admin)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-10 text-center text-gray-500"
                >
                  ไม่พบข้อมูล Admin
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddAdminDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSuccess={() => {
          // Wait 1.5s for Supabase trigger to create the profile
          setTimeout(() => {
            fetchAdmins();
          }, 1500);
        }}
      />

      <EditAdminDialog
        isOpen={!!editingAdmin}
        admin={editingAdmin}
        onClose={() => setEditingAdmin(null)}
        onSuccess={() => fetchAdmins()}
      />

      <DeleteAdminDialog
        isOpen={!!deletingAdmin}
        admin={deletingAdmin}
        onClose={() => setDeletingAdmin(null)}
        onSuccess={() => fetchAdmins()}
      />
    </div>
  );
};

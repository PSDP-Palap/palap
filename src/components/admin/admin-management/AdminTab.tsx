import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import Loading from "@/components/shared/Loading";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import type { AdminUser, Profile } from "@/types/user";
import supabase from "@/utils/supabase";

import { AddAdminDialog } from "./AddAdminDialog";
import { DeleteAdminDialog } from "./DeleteAdminDialog";
import { EditAdminDialog } from "./EditAdminDialog";

const AdminTab = () => {
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
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

  const filteredAdmins = admins.filter(
    (admin) =>
      admin.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex items-center justify-center h-full min-h-100">
        <Loading fullScreen={false} size={150} />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative flex flex-col h-full">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
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
          <div className="relative w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="ค้นหา..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#A6411C] focus:bg-white transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 text-gray-600 text-sm">
                <th className="px-6 py-4 font-semibold">No.</th>
                <th className="px-6 py-4 font-semibold">ID</th>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold text-center">
                  Management
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAdmins.length > 0 ? (
                filteredAdmins.map((admin, index) => (
                  <tr
                    key={admin.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-500">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="cursor-pointer hover:text-[#A6411C] transition-colors"
                            onClick={() => {
                              navigator.clipboard.writeText(admin.id);
                              toast.success("คัดลอก ID เรียบร้อยแล้ว");
                            }}
                          >
                            {admin.id.split("-")[0]}...
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{admin.id}</p>
                        </TooltipContent>
                      </Tooltip>
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
                    {searchTerm
                      ? "ไม่พบข้อมูลที่ตรงกับการค้นหา"
                      : "ไม่พบข้อมูล Admin"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Floating Add Button */}
        <div className="fixed bottom-8 right-8 z-50">
          <button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-white text-[#A6411C] p-4 rounded-full shadow-2xl hover:bg-orange-50 transition-all flex items-center gap-2 group hover:scale-110 active:scale-95 border border-orange-100"
            title="เพิ่ม Admin ใหม่"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap text-sm font-semibold">
              เพิ่ม Admin ใหม่
            </span>
          </button>
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
    </TooltipProvider>
  );
};

export default AdminTab;

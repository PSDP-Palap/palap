import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import supabase from "@/utils/supabase";

interface EditAdminDialogProps {
  isOpen: boolean;
  admin: { id: string; full_name: string; email: string } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditAdminDialog = ({
  isOpen,
  admin,
  onClose,
  onSuccess
}: EditAdminDialogProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (admin) {
      setName(admin.full_name || "");
      setEmail(admin.email || "");
    }
  }, [admin]);

  if (!isOpen || !admin) return null;

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const loadingToast = toast.loading("กำลังอัปเดต Admin...");

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("เซสชันหมดอายุ");

      const { data, error } = await supabase.functions.invoke(
        `management-admin?id=${admin.id}`,
        {
          method: "PUT",
          body: {
            name: name.trim(),
            email: email.trim()
          }
        }
      );

      if (error) {
        let errorMessage = error.message;
        if (error.context && typeof error.context.json === "function") {
          try {
            const body = await error.context.json();
            errorMessage = body.error || body.message || errorMessage;
            // eslint-disable-next-line unused-imports/no-unused-vars
          } catch (e) {
            // ignore
          }
        }
        throw new Error(errorMessage);
      }
      if (data?.error) throw new Error(data.error);

      toast.success("อัปเดต Admin เรียบร้อยแล้ว", { id: loadingToast });
      onSuccess();
      onClose();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error updating admin:", error);
      toast.error(error.message || "เกิดข้อผิดพลาดในการอัปเดต Admin", {
        id: loadingToast
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">แก้ไข Admin</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              ชื่อ-นามสกุล
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A6411C] focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              อีเมล
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A6411C] focus:border-transparent transition-all"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[#A6411C] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#8e3718] transition-all"
            >
              {isSubmitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

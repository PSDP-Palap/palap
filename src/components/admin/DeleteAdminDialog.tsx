import { useState } from "react";
import toast from "react-hot-toast";

import supabase from "@/utils/supabase";

interface DeleteAdminDialogProps {
  isOpen: boolean;
  admin: { id: string; full_name: string; email: string } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeleteAdminDialog = ({
  isOpen,
  admin,
  onClose,
  onSuccess
}: DeleteAdminDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !admin) return null;

  const handleDelete = async () => {
    setIsSubmitting(true);
    const loadingToast = toast.loading("กำลังลบ Admin...");

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("เซสชันหมดอายุ");

      const { data, error } = await supabase.functions.invoke(
        `management-admin?id=${admin.id}`,
        {
          method: "DELETE"
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

      toast.success("ลบ Admin เรียบร้อยแล้ว", { id: loadingToast });
      onSuccess();
      onClose();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error deleting admin:", error);
      toast.error(error.message || "เกิดข้อผิดพลาดในการลบ Admin", {
        id: loadingToast
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
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
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">ยืนยันการลบ</h2>
          <p className="text-gray-500 text-sm mb-6">
            คุณแน่ใจหรือไม่ว่าต้องการลบ Admin{" "}
            <span className="font-bold text-gray-800">"{admin.full_name}"</span>
            ? การดำเนินการนี้ไม่สามารถย้อนกลับได้
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleDelete}
              disabled={isSubmitting}
              className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? "กำลังลบ..." : "ยืนยันการลบ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

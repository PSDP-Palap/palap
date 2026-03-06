import { useRef, useState } from "react";
import toast from "react-hot-toast";

import Loading from "@/components/shared/Loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useServiceStore } from "@/stores/useServiceStore";
import type { Service, ServiceCategory } from "@/types/service";

interface AddServiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: Omit<Service, "service_id">) => Promise<void>;
}

export const AddServiceDialog = ({
  isOpen,
  onClose,
  onSuccess
}: AddServiceDialogProps) => {
  const { uploadServiceImage } = useServiceStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState<Omit<Service, "service_id">>({
    name: "",
    price: 0,
    category: "SHOPPING",
    pickup_address_id: "",
    destination_address_id: "",
    image_url: "",
    detail_1: "",
    detail_2: ""
  });

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "price" ? Number(value) || 0 : value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("ขนาดไฟล์รูปภาพต้องไม่เกิน 2MB");
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("กรุณาระบุชื่อบริการ");
      return;
    }

    const loadingToast = toast.loading("กำลังเพิ่มบริการ...");
    setIsSubmitting(true);
    try {
      let finalImageUrl = form.image_url;

      if (selectedFile) {
        finalImageUrl = await uploadServiceImage(selectedFile);
      }

      await onSuccess({ ...form, image_url: finalImageUrl });
      toast.success("เพิ่มบริการเรียบร้อยแล้ว", { id: loadingToast });

      // Reset
      setForm({
        name: "",
        price: 0,
        category: "SHOPPING",
        pickup_address_id: "",
        destination_address_id: "",
        image_url: "",
        detail_1: "",
        detail_2: ""
      });
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
      onClose();
      // eslint-disable-next-line unused-imports/no-unused-vars
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการเพิ่มบริการ", { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm font-sans overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-200 my-auto relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-all z-20 disabled:opacity-50"
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

        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-orange-600"
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
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Add Service</h2>
              <p className="text-sm text-gray-400">สร้างบริการใหม่สำหรับระบบ</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Image Area */}
            <div className="flex flex-col items-center gap-2 mb-4">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block self-start mb-1">
                Service Image
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`relative w-full h-48 rounded-2xl border-2 border-dashed transition-all flex items-center justify-center overflow-hidden cursor-pointer group ${
                  previewUrl
                    ? "border-orange-100 hover:border-orange-300"
                    : "border-gray-200 hover:border-orange-300 bg-gray-50 hover:bg-orange-50/30"
                }`}
              >
                {previewUrl ? (
                  <>
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <span className="bg-white/90 px-3 py-1.5 rounded-full text-xs font-bold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                        เปลี่ยนรูปภาพ
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-orange-400 transition-colors">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-10 w-10"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-sm font-bold">
                      คลิกเพื่อเลือกรูปภาพ
                    </span>
                  </div>
                )}

                {isSubmitting && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loading fullScreen={false} size={40} />
                      <span className="text-xs font-bold text-orange-600">
                        กำลังอัพโหลด...
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Service Name
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="เช่น ซื้อของ, รับ-ส่ง, ดูแล"
                className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Price (฿)
                </label>
                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  min={0}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Category
                </label>
                <Select
                  value={form.category}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      category: value as ServiceCategory
                    }))
                  }
                >
                  <SelectTrigger className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-3 h-auto text-sm focus:ring-2 focus:ring-orange-500 transition-all">
                    <SelectValue placeholder="เลือกหมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    <SelectItem value="DELIVERY">รับ-ส่ง</SelectItem>
                    <SelectItem value="SHOPPING">ซื้อของ</SelectItem>
                    <SelectItem value="CARE">ดูแล</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Detail 1
              </label>
              <textarea
                name="detail_1"
                value={form.detail_1 || ""}
                onChange={handleChange}
                placeholder="รายละเอียดเพิ่มเติมส่วนที่ 1"
                className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Detail 2
              </label>
              <textarea
                name="detail_2"
                value={form.detail_2 || ""}
                onChange={handleChange}
                placeholder="รายละเอียดเพิ่มเติมส่วนที่ 2"
                className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-20"
              />
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? "กำลังดำเนินการ..." : "Create Service"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

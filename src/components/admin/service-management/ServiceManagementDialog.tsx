/* eslint-disable unused-imports/no-unused-vars */
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import Loading from "@/components/shared/Loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { useServiceStore } from "@/stores/useServiceStore";
import type { Service, ServiceCategory } from "@/types/service";
import type { UserRole } from "@/types/user";

interface ServiceManagementDialogProps {
  isOpen: boolean;
  service: Service | null;
  userRole?: UserRole | null;
  onClose: () => void;
  onUpdate: (
    id: string,
    data: Partial<Omit<Service, "service_id">>
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const ServiceManagementDialog = ({
  isOpen,
  service,
  userRole,
  onClose,
  onUpdate,
  onDelete
}: ServiceManagementDialogProps) => {
  const { uploadServiceImage } = useServiceStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(
    service?.image_url || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const isFreelancer = userRole === "freelance";

  const [form, setForm] = useState<Omit<Service, "service_id">>({
    name: service?.name || "",
    price: service?.price || 0,
    category: service?.category || "SHOPPING",
    pickup_address_id: service?.pickup_address_id || "",
    destination_address_id: service?.destination_address_id || "",
    image_url: service?.image_url || "",
    detail_1: service?.detail_1 || "",
    detail_2: service?.detail_2 || ""
  });

  // Update form when service changes
  useEffect(() => {
    if (service) {
      setForm({
        name: service.name || "",
        price: service.price || 0,
        category: service.category || "SHOPPING",
        pickup_address_id: service.pickup_address_id || "",
        destination_address_id: service.destination_address_id || "",
        image_url: service.image_url || "",
        detail_1: service.detail_1 || "",
        detail_2: service.detail_2 || ""
      });
      setPreviewUrl(service.image_url || "");
    }
  }, [service]);

  if (!isOpen || !service) return null;

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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading("กำลังบันทึกข้อมูล...");
    setIsSubmitting(true);
    try {
      let finalImageUrl = form.image_url;

      if (selectedFile) {
        finalImageUrl = await uploadServiceImage(selectedFile);
      }

      // Clean data: convert empty strings to null for UUID fields
      const updateData = {
        ...form,
        image_url: finalImageUrl,
        pickup_address_id: form.pickup_address_id?.trim() === "" ? null : form.pickup_address_id,
        destination_address_id: form.destination_address_id?.trim() === "" ? null : form.destination_address_id,
      };

      await onUpdate(service.service_id!, updateData);
      toast.success("บันทึกข้อมูลเรียบร้อยแล้ว", { id: loadingToast });
      setIsEditing(false);
      setSelectedFile(null);
      onClose();
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(error?.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล", { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("คุณต้องการลบบริการนี้ใช่หรือไม่?")) {
      const loadingToast = toast.loading("กำลังลบข้อมูล...");
      try {
        await onDelete(service.service_id!);
        toast.success("ลบข้อมูลเรียบร้อยแล้ว", { id: loadingToast });
        onClose();
      } catch (error) {
        toast.error("เกิดข้อผิดพลาดในการลบข้อมูล", { id: loadingToast });
      }
    }
  };

  const categoryLabel = (category: ServiceCategory) => {
    switch (category) {
      case "DELIVERY":
        return "รับ-ส่ง";
      case "SHOPPING":
        return "ซื้อของ";
      case "CARE":
        return "ดูแล";
      default:
        return category;
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm font-sans overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-200 my-auto relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-gray-400 hover:text-gray-600 rounded-full bg-white/80 hover:bg-gray-50 transition-all z-20 disabled:opacity-50 shadow-sm"
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

        <div className="p-6 md:p-8">
          <div className="space-y-6">
            {/* 1. Image Area */}
            <div className="flex flex-col items-center gap-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider self-start">
                Service Image
              </label>
              <div
                onClick={() => isEditing && fileInputRef.current?.click()}
                className={`relative w-full h-56 rounded-2xl border-2 border-dashed transition-all flex items-center justify-center overflow-hidden ${
                  isEditing
                    ? "cursor-pointer group hover:border-orange-300 bg-gray-50 hover:bg-orange-50/30"
                    : "border-gray-100"
                }`}
              >
                {previewUrl ? (
                  <>
                    <img
                      src={previewUrl}
                      alt={service.name}
                      className="w-full h-full object-contain p-4 transition-transform duration-500"
                    />
                    {isEditing && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <span className="bg-white/90 px-3 py-1.5 rounded-full text-xs font-bold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                          เปลี่ยนรูปภาพ
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12"
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
                    {isEditing && (
                      <span className="text-sm font-bold text-gray-400">
                        คลิกเพื่ออัพโหลด
                      </span>
                    )}
                  </div>
                )}

                {isSubmitting && selectedFile && (
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

            {/* 2. Service ID (Read-only) */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Service ID
              </label>
              <p className="text-xs font-mono text-gray-500 break-all">
                {service.service_id!}
              </p>
            </div>

            {!isEditing ? (
              /* VIEW MODE */
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="border-b border-gray-50 pb-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Name
                    </label>
                    <p className="font-bold text-gray-800">{service.name}</p>
                  </div>
                  <div className="border-b border-gray-50 pb-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Price
                    </label>
                    <p className="font-black text-[#A6411C] text-lg">
                      {service.price.toLocaleString()} ฿
                    </p>
                  </div>
                </div>

                <div className="border-b border-gray-50 pb-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Category
                  </label>
                  <span className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-bold rounded-full border border-orange-100 inline-block mt-1">
                    {categoryLabel(service.category)}
                  </span>
                </div>

                <div className="border-b border-gray-50 pb-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Detail 1
                  </label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {service.detail_1 || "-"}
                  </p>
                </div>

                <div className="border-b border-gray-50 pb-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Detail 2
                  </label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {service.detail_2 || "-"}
                  </p>
                </div>

                <div className="pt-4 flex gap-3">
                  {!isFreelancer ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition-colors shadow-lg shadow-orange-100"
                    >
                      Edit Service
                    </button>
                  ) : (
                    <button
                      onClick={handleDelete}
                      className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-bold hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* EDIT MODE */
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Price (฿)
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={form.price}
                      onChange={handleChange}
                      className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Category
                    </label>
                    <TooltipProvider>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <div
                            className={
                              isFreelancer ? "cursor-not-allowed" : ""
                            }
                          >
                            <Select
                              value={form.category}
                              disabled={isFreelancer}
                              onValueChange={(value) =>
                                setForm((prev) => ({
                                  ...prev,
                                  category: value as ServiceCategory
                                }))
                              }
                            >
                              <SelectTrigger className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-2 h-auto text-sm focus:ring-2 focus:ring-orange-500 transition-all z-70 disabled:cursor-not-allowed disabled:opacity-70">
                                <SelectValue placeholder="เลือกหมวดหมู่" />
                              </SelectTrigger>
                              <SelectContent
                                position="popper"
                                sideOffset={4}
                                className="z-80"
                              >
                                <SelectItem value="DELIVERY">รับ-ส่ง</SelectItem>
                                <SelectItem value="SHOPPING">ซื้อของ</SelectItem>
                                <SelectItem value="CARE">ดูแล</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TooltipTrigger>
                        {isFreelancer && (
                          <TooltipContent>
                            <p>Category cannot be changed after creation.</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
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
                    className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-20"
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
                    className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-20"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-100 disabled:opacity-50"
                  >
                    {isSubmitting ? "กำลังบันทึก..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={isSubmitting}
                    className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

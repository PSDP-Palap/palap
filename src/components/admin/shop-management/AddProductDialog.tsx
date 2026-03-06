import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import Loading from "@/components/shared/Loading";
import MapPicker from "@/components/shared/MapPicker";
import { useProductStore } from "@/stores/useProductStore";
import type { Product } from "@/types/product";

interface AddProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (
    data: Omit<Product, "product_id" | "created_at" | "id">
  ) => Promise<void>;
}

export const AddProductDialog = ({
  isOpen,
  onClose,
  onSuccess
}: AddProductDialogProps) => {
  const { uploadImage, loadAddresses, createAddress } = useProductStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState({
    name: "",
    address_detail: "",
    lat: 0,
    lng: 0
  });

  const [form, setForm] = useState<
    Omit<Product, "product_id" | "created_at" | "pickup_address" | "id">
  >({
    name: "",
    price: 0,
    qty: 0,
    image_url: "",
    pickup_address_id: ""
  });

  useEffect(() => {
    if (isOpen) {
      loadAddresses();
    }
  }, [isOpen, loadAddresses]);

  const handleMapChange = useCallback((lat: number, lng: number) => {
    setNewAddressForm((prev) => ({ ...prev, lat, lng }));
  }, []);

  // 2. Conditional Return (Must come AFTER hooks)
  if (!isOpen) return null;

  // 3. Handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "price" || name === "qty" ? Number(value) || 0 : value
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
      toast.error("กรุณาระบุชื่อสินค้า");
      return;
    }

    if (!isAddingNewAddress && !form.pickup_address_id) {
      toast.error("กรุณาระบุที่อยู่รับสินค้า");
      return;
    }

    const loadingToast = toast.loading("กำลังเพิ่มสินค้า...");
    setIsSubmitting(true);
    try {
      let finalImageUrl = form.image_url;
      let finalAddressId = form.pickup_address_id;

      if (selectedFile) {
        finalImageUrl = await uploadImage(selectedFile);
      }

      if (isAddingNewAddress) {
        if (!newAddressForm.name.trim()) {
          toast.error("กรุณาระบุชื่อที่อยู่");
          setIsSubmitting(false);
          toast.dismiss(loadingToast);
          return;
        }
        const createdAddr = await createAddress(newAddressForm);
        finalAddressId = createdAddr.id;
      }

      await onSuccess({
        ...form,
        image_url: finalImageUrl,
        pickup_address_id: finalAddressId
      });
      toast.success("เพิ่มสินค้าเรียบร้อยแล้ว", { id: loadingToast });

      // Reset
      setForm({
        name: "",
        price: 0,
        qty: 0,
        image_url: "",
        pickup_address_id: ""
      });
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
      setIsAddingNewAddress(false);
      setNewAddressForm({ name: "", address_detail: "", lat: 0, lng: 0 });
      onClose();
      // eslint-disable-next-line unused-imports/no-unused-vars
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการเพิ่มสินค้า", { id: loadingToast });
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
              <h2 className="text-2xl font-black text-gray-900">Add Product</h2>
              <p className="text-sm text-gray-400">เพิ่มสินค้าใหม่ลงในคลัง</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Image Area */}
            <div className="flex flex-col items-center gap-2 mb-4">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block self-start mb-1">
                Product Image
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="ชื่อสินค้า"
                  className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
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
                  className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  min={0}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  name="qty"
                  value={form.qty}
                  onChange={handleChange}
                  className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  min={0}
                  required
                />
              </div>
            </div>

            {/* Address Selection */}
            <div className="space-y-3 pt-2 border-t border-gray-50">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                Pickup Address
              </label>

              {!isAddingNewAddress ? (
                <button
                  type="button"
                  onClick={() => setIsAddingNewAddress(true)}
                  className="w-full py-8 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center gap-2 text-gray-400 hover:border-orange-300 hover:text-orange-500 hover:bg-orange-50/30 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
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
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-bold">
                    ระบุที่อยู่นัดรับสินค้า
                  </span>
                </button>
              ) : (
                <div className="space-y-3 p-4 bg-orange-50/30 rounded-2xl border border-orange-100/50 relative animate-in fade-in slide-in-from-top-2 duration-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNewAddress(false);
                      setNewAddressForm({
                        name: "",
                        address_detail: "",
                        lat: 0,
                        lng: 0
                      });
                    }}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-white transition-all"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  <input
                    type="text"
                    placeholder="ชื่อที่อยู่ (เช่น บ้าน, คลังสินค้า)"
                    value={newAddressForm.name}
                    onChange={(e) =>
                      setNewAddressForm((prev) => ({
                        ...prev,
                        name: e.target.value
                      }))
                    }
                    className="w-full border border-white bg-white/80 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                  <input
                    type="text"
                    placeholder="รายละเอียดที่อยู่"
                    value={newAddressForm.address_detail}
                    onChange={(e) =>
                      setNewAddressForm((prev) => ({
                        ...prev,
                        address_detail: e.target.value
                      }))
                    }
                    className="w-full border border-white bg-white/80 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      เลือกตำแหน่งบนแผนที่
                    </label>
                    <MapPicker onChange={handleMapChange} />
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono text-gray-400">
                      <span>Lat: {newAddressForm.lat.toFixed(6)}</span>
                      <span>Lng: {newAddressForm.lng.toFixed(6)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? "กำลังดำเนินการ..." : "Create Product"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

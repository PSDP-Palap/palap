import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import Loading from "@/components/shared/Loading";
import MapPicker from "@/components/shared/MapPicker";
import { useProductStore } from "@/stores/useProductStore";
import type { Product } from "@/types/product";

interface ProductManagementDialogProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onUpdate: (
    id: string,
    data: Omit<Product, "product_id" | "created_at" | "pickup_address" | "id">
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const ProductManagementDialog = ({
  isOpen,
  product,
  onClose,
  onUpdate,
  onDelete
}: ProductManagementDialogProps) => {
  const { uploadImage, loadAddresses, createAddress } = useProductStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(
    product?.image_url || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
    name: product?.name || "",
    price: product?.price || 0,
    qty: product?.qty || 0,
    image_url: product?.image_url || "",
    pickup_address_id: product?.pickup_address_id || ""
  });

  useEffect(() => {
    if (isOpen) {
      loadAddresses();
    }
  }, [isOpen, loadAddresses]);

  const handleMapChange = useCallback((lat: number, lng: number) => {
    setNewAddressForm((prev) => ({ ...prev, lat, lng }));
  }, []);

  if (!isOpen || !product) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading("กำลังบันทึกข้อมูล...");
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

      await onUpdate(product.product_id!, {
        ...form,
        image_url: finalImageUrl,
        pickup_address_id: finalAddressId
      });

      toast.success("บันทึกข้อมูลเรียบร้อยแล้ว", { id: loadingToast });
      setIsEditing(false);
      setSelectedFile(null);
      onClose();
      // eslint-disable-next-line unused-imports/no-unused-vars
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล", { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("คุณต้องการลบสินค้านี้ใช่หรือไม่?")) {
      const loadingToast = toast.loading("กำลังลบสินค้า...");
      try {
        await onDelete(product.product_id!);
        toast.success("ลบสินค้าเรียบร้อยแล้ว", { id: loadingToast });
        onClose();
        // eslint-disable-next-line unused-imports/no-unused-vars
      } catch (error) {
        toast.error("เกิดข้อผิดพลาดในการลบสินค้า", { id: loadingToast });
      }
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
          <div className="space-y-6">
            {/* 1. Image Area */}
            <div className="flex flex-col items-center gap-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider self-start">
                Product Image
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
                      alt={product.name}
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

            {/* 2. Product ID (Read-only) */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Product ID
              </label>
              <p className="text-xs font-mono text-gray-500 break-all">
                {product.product_id!}
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
                    <p className="font-bold text-gray-800">{product.name}</p>
                  </div>
                  <div className="border-b border-gray-50 pb-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Price
                    </label>
                    <p className="font-black text-[#A6411C] text-lg">
                      {product.price.toLocaleString()} ฿
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="border-b border-gray-50 pb-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Quantity
                    </label>
                    <p className="font-bold text-gray-800">
                      {product.qty!.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-left">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Pickup Location
                  </label>
                  {product.pickup_address ? (
                    <div>
                      <p className="text-sm font-bold text-gray-800">
                        {product.pickup_address.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {product.pickup_address.address_detail || "-"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">
                      ไม่ได้ระบุที่อยู่นัดรับ
                    </p>
                  )}
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition-colors shadow-lg shadow-orange-100"
                  >
                    Edit Product
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-bold hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
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
                      Quantity
                    </label>
                    <input
                      type="number"
                      name="qty"
                      value={form.qty}
                      onChange={handleChange}
                      className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-gray-50 text-left">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                    Pickup Address
                  </label>

                  {!isAddingNewAddress ? (
                    <div className="space-y-3">
                      {form.pickup_address_id ? (
                        <div className="p-4 bg-orange-50/30 rounded-2xl border border-orange-100/50 flex justify-between items-center group text-left">
                          <div>
                            <p className="text-sm font-bold text-gray-800">
                              {product?.pickup_address?.name ||
                                "ที่อยู่ปัจจุบัน"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {product?.pickup_address?.address_detail || "-"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingNewAddress(true);
                              if (product?.pickup_address) {
                                setNewAddressForm({
                                  name: product.pickup_address.name || "",
                                  address_detail:
                                    product.pickup_address.address_detail || "",
                                  lat: product.pickup_address.lat || 0,
                                  lng: product.pickup_address.lng || 0
                                });
                              }
                            }}
                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-orange-600 hover:bg-orange-50 transition-all opacity-0 group-hover:opacity-100"
                          >
                            แก้ไขที่อยู่
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsAddingNewAddress(true)}
                          className="w-full py-6 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center gap-2 text-gray-400 hover:border-orange-300 hover:text-orange-500 hover:bg-orange-50/30 transition-all group"
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
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                          </svg>
                          <span className="text-sm font-bold">
                            ระบุที่อยู่นัดรับสินค้า
                          </span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 p-4 bg-orange-50/30 rounded-2xl border border-orange-100/50 relative animate-in fade-in slide-in-from-top-2 duration-200 text-left">
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
                        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-white transition-all shadow-sm"
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
                        placeholder="ชื่อที่อยู่"
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
                        placeholder="รายละเอียด"
                        value={newAddressForm.address_detail}
                        onChange={(e) =>
                          setNewAddressForm((prev) => ({
                            ...prev,
                            address_detail: e.target.value
                          }))
                        }
                        className="w-full border border-white bg-white/80 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                      />
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          เลือกตำแหน่งบนแผนที่
                        </label>
                        <MapPicker
                          lat={product?.pickup_address?.lat}
                          lng={product?.pickup_address?.lng}
                          onChange={handleMapChange}
                        />
                        <div className="flex justify-between text-[10px] font-mono text-gray-400 px-1">
                          <span>Lat: {newAddressForm.lat.toFixed(6)}</span>
                          <span>Lng: {newAddressForm.lng.toFixed(6)}</span>
                        </div>
                      </div>
                    </div>
                  )}
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

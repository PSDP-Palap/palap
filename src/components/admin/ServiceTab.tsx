import { useEffect, useState } from "react";
import { useServiceStore } from "@/stores/useServiceStore";
import type { Service, ServiceCategory } from "@/types/service";

type ServiceFormState = Omit<Service, "service_id">;

const emptyForm: ServiceFormState = {
  name: "",
  price: 0,
  category: "SHOPPING",
  pickup_address: "",
  dest_address: ""
};

export const ServiceTab = () => {
  const {
    services,
    loadServices,
    createService,
    updateService,
    deleteService
  } = useServiceStore();

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceFormState>(emptyForm);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "price" ? Number(value) || 0 : value
    }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleEdit = (service: Service) => {
    const { service_id, ...rest } = service;
    setEditingId(service_id);
    setForm(rest);
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editingId) {
      updateService(editingId, form);
    } else {
      createService(form);
    }
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm("ลบบริการนี้หรือไม่ ?")) {
      deleteService(id);
      if (editingId === id) {
        resetForm();
      }
    }
  };

  const categoryLabel = (category: ServiceCategory) => {
    switch (category) {
      case "DELIVERY": return "รับ-ส่ง";
      case "SHOPPING": return "ซื้อของ";
      case "CARE": return "ดูแล";
      default: return category;
    }
  };

  return (
    <section className="grid md:grid-cols-[2fr,1.3fr] gap-8 items-start">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 overflow-x-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Service</h2>
          <span className="text-sm text-gray-500 font-medium">
            ทั้งหมด {services.length} รายการ
          </span>
        </div>

        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-gray-600">
              <th className="text-left py-3 px-2 font-semibold">ID</th>
              <th className="text-left py-3 px-2 font-semibold">ชื่อบริการ</th>
              <th className="text-left py-3 px-2 font-semibold">หมวดหมู่</th>
              <th className="text-right py-3 px-2 font-semibold">ราคา</th>
              <th className="text-left py-3 px-2 font-semibold">ต้นทาง</th>
              <th className="text-left py-3 px-2 font-semibold">ปลายทาง</th>
              <th className="text-right py-3 px-2 font-semibold">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {services.map((service) => (
              <tr
                key={service.service_id}
                className="hover:bg-orange-50/40 transition-colors"
              >
                <td className="py-3 px-2 align-top text-xs text-gray-500 font-mono">
                  {service.service_id}
                </td>
                <td className="py-3 px-2 align-top font-semibold text-gray-800">
                  {service.name}
                </td>
                <td className="py-3 px-2 align-top text-gray-600">
                  {categoryLabel(service.category)}
                </td>
                <td className="py-3 px-2 align-top text-right font-medium">
                  {service.price.toLocaleString()} ฿
                </td>
                <td className="py-3 px-2 align-top max-w-40">
                  <p className="line-clamp-2 text-xs text-gray-600">
                    {service.pickup_address}
                  </p>
                </td>
                <td className="py-3 px-2 align-top max-w-40">
                  <p className="line-clamp-2 text-xs text-gray-600">
                    {service.dest_address}
                  </p>
                </td>
                <td className="py-3 px-2 align-top text-right space-x-2 whitespace-nowrap">
                  <button
                    type="button"
                    className="text-xs px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 font-semibold hover:bg-orange-200 transition-colors"
                    onClick={() => handleEdit(service)}
                  >
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    className="text-xs px-3 py-1.5 rounded-full bg-red-100 text-red-700 font-semibold hover:bg-red-200 transition-colors"
                    onClick={() => handleDelete(service.service_id)}
                  >
                    ลบ
                  </button>
                </td>
              </tr>
            ))}

            {services.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="py-12 text-center text-gray-400 text-sm italic"
                >
                  ยังไม่มีบริการ โปรดเพิ่มบริการใหม่จากแบบฟอร์มด้านขวา
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">
            {editingId ? "แก้ไขบริการ" : "เพิ่มบริการใหม่"}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
            >
              ยกเลิก
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block mb-1.5 font-semibold text-gray-700">
              ชื่อบริการ
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              placeholder="เช่น ซื้อของ, รับ-ส่ง, ดูแล"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 font-semibold text-gray-700">
                ราคา (บาท)
              </label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                min={0}
              />
            </div>

            <div>
              <label className="block mb-1.5 font-semibold text-gray-700">
                หมวดหมู่
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              >
                <option value="DELIVERY">รับ-ส่ง</option>
                <option value="SHOPPING">ซื้อของ</option>
                <option value="CARE">ดูแล</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block mb-1.5 font-semibold text-gray-700">
              ที่อยู่รับสัตว์เลี้ยง
            </label>
            <input
              type="text"
              name="pickup_address"
              value={form.pickup_address}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              placeholder="เช่น บ้านลูกค้า, คอนโด, จุดนัดรับ"
            />
          </div>

          <div>
            <label className="block mb-1.5 font-semibold text-gray-700">
              ที่อยู่ปลายทาง
            </label>
            <input
              type="text"
              name="dest_address"
              value={form.dest_address}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              placeholder="เช่น โรงพยาบาลสัตว์, ร้านอาบน้ำตัดขน"
            />
          </div>

          <div className="pt-4 flex gap-2 justify-end">
            <button
              type="submit"
              className="w-full px-6 py-3 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 shadow-md shadow-orange-200 transition-all active:scale-95"
            >
              {editingId ? "บันทึกการแก้ไข" : "เพิ่มบริการ"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import Loading from "@/components/shared/Loading";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { useServiceStore } from "@/stores/useServiceStore";
import type { Service, ServiceCategory } from "@/types/service";

import { ServiceManagementDialog } from "./ServiceManagementDialog";

const ServiceTab = () => {
  const { services, loadServices, updateService, deleteService } =
    useServiceStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    try {
      await loadServices();
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setIsLoading(false);
    }
  }, [loadServices]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.service_id!.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const getCategoryBadge = (category: ServiceCategory) => {
    switch (category) {
      case "DELIVERY":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "SHOPPING":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "CARE":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

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
            <h2 className="text-xl font-bold text-gray-800">Services</h2>
            <button
              onClick={() => fetchServices()}
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
              placeholder="ค้นหาชื่อ, หมวดหมู่, ID..."
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
                <th className="px-6 py-4 font-semibold">ID</th>
                <th className="px-6 py-4 font-semibold">Image</th>
                <th className="px-6 py-4 font-semibold">Service Name</th>
                <th className="px-6 py-4 font-semibold text-right">Price</th>
                <th className="px-6 py-4 font-semibold text-left pl-24">
                  Category
                </th>
                <th className="px-6 py-4 font-semibold text-center">
                  Management
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredServices.length > 0 ? (
                filteredServices.map((service) => (
                  <tr
                    key={service.service_id!}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-mono text-gray-500">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="cursor-pointer hover:text-[#A6411C] transition-colors"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                service.service_id!
                              );
                              toast.success("คัดลอก ID เรียบร้อยแล้ว");
                            }}
                          >
                            {service.service_id!.split("-")[0]}...
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{service.service_id!}</p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center overflow-hidden border border-orange-100">
                        {service.image_url ? (
                          <img
                            src={service.image_url}
                            alt={service.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src="/logo.png"
                            className="w-6 h-6 object-contain opacity-20"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      {service.name}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-[#A6411C]">
                      {service.price.toLocaleString()} ฿
                    </td>
                    <td className="px-6 py-4 pl-24">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold border ${getCategoryBadge(
                          service.category
                        )}`}
                      >
                        {categoryLabel(service.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedService(service)}
                        className="px-4 py-2 bg-gray-50 text-gray-600 hover:bg-orange-50 hover:text-[#A6411C] border border-gray-100 rounded-xl text-xs font-bold transition-all"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-gray-500"
                  >
                    {searchTerm
                      ? "ไม่พบข้อมูลที่ตรงกับการค้นหา"
                      : "ไม่พบข้อมูลบริการ"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <ServiceManagementDialog
          key={selectedService?.service_id || "new"}
          isOpen={!!selectedService}
          service={selectedService}
          onClose={() => setSelectedService(null)}
          onUpdate={updateService}
          onDelete={deleteService}
        />
      </div>
    </TooltipProvider>
  );
};
export default ServiceTab;

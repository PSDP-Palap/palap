import { useRouter } from "@tanstack/react-router";

import type { Service } from "@/types/service";

interface ServiceCardProps {
  service: Service;
  defaultImage: string;
  defaultDescription: string;
}

export function ServiceCard({
  service,
  defaultImage,
  defaultDescription
}: ServiceCardProps) {
  const router = useRouter();

  return (
    <div className="relative h-full">
      <div
        onClick={() =>
          router.navigate({
            to: "/service/$service_id",
            params: { service_id: service.service_id || service.id || "" }
          })
        }
        className="bg-white rounded-2xl p-5 shadow-sm transition-all cursor-pointer border-2 h-full flex flex-col group border-transparent hover:border-orange-200 hover:shadow-md"
      >
        <div className="w-full h-44 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 mb-4">
          <img
            src={service.image_url || defaultImage}
            alt={service.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        <h3 className="font-bold text-2xl text-[#4A2600] leading-tight mb-2">
          {service.name}
        </h3>
        <p className="text-base text-gray-700 line-clamp-3 leading-relaxed grow">
          {service.description || defaultDescription}
        </p>

        <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">
              Category
            </p>
            <p className="text-sm font-black text-[#4A2600]">
              {service.category || "General"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-sm font-black text-orange-600">
              ฿{service.price}
            </span>
            <div
              className="w-9 h-9 rounded-full bg-orange-100 border border-orange-200 overflow-hidden flex items-center justify-center text-xs font-black text-[#4A2600]"
              title={service.creator_name || "Freelance user"}
            >
              {service.creator_avatar_url ? (
                <img
                  src={service.creator_avatar_url}
                  alt={service.creator_name || "Freelance user"}
                  className="w-full h-full object-cover"
                />
              ) : (
                (service.creator_name || "F").charAt(0).toUpperCase()
              )}
            </div>
          </div>
        </div>

        <span className="mt-4 text-[12px] font-bold uppercase tracking-wide text-gray-500 group-hover:text-orange-600 transition-colors">
          View Service →
        </span>
      </div>
    </div>
  );
}

import { useRouter } from "@tanstack/react-router";
import { ArrowRight, MapPin, Tag } from "lucide-react";

import type { Service } from "@/types/service";

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const router = useRouter();

  return (
    <div className="relative h-full group">
      <div
        onClick={() =>
          router.navigate({
            to: "/service/$service_id",
            params: { service_id: service.service_id || service.id || "" }
          })
        }
        className="bg-white rounded-[2rem] p-5 shadow-sm transition-all duration-500 cursor-pointer border-4 border-transparent hover:border-orange-200 hover:shadow-2xl hover:shadow-orange-100 hover:-translate-y-2 h-full flex flex-col relative overflow-hidden"
      >
        {/* Category Badge */}
        <div className="absolute top-8 left-8 z-10">
          <span className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-black text-orange-600 uppercase tracking-widest shadow-sm border border-orange-50 flex items-center gap-1.5">
            <Tag className="w-3 h-3" />
            {service.category || "General"}
          </span>
        </div>

        {/* Image Container */}
        <div className="w-full h-56 bg-orange-50 rounded-[1.5rem] overflow-hidden border-2 border-orange-50 mb-5 relative">
          <img
            src={service.image_url || "/dog.png"}
            alt={service.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 px-1">
          <h3 className="font-black text-2xl text-[#4A2600] leading-tight mb-3 group-hover:text-orange-700 transition-colors">
            {service.name}
          </h3>

          <div className="flex items-center gap-2 mb-4 text-gray-400 group-hover:text-orange-400 transition-colors">
            <MapPin className="w-4 h-4 shrink-0" />
            <p className="text-xs font-bold truncate">
              {service.detail_1 ||
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (service.pickup_address as any)?.address_detail ||
                "Location provided on request"}
            </p>
          </div>

          <p className="text-sm font-medium text-gray-500 line-clamp-2 leading-relaxed mb-6">
            {service.description || "No description provided for this service."}
          </p>

          <div className="mt-auto pt-5 border-t border-orange-50 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-orange-300 uppercase tracking-widest mb-0.5">
                Price
              </span>
              <span className="text-2xl font-black text-[#A03F00]">
                ฿{Number(service.price).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center -space-x-2">
              <div
                className="w-10 h-10 rounded-2xl bg-orange-100 border-2 border-white overflow-hidden flex items-center justify-center text-xs font-black text-[#4A2600] shadow-sm relative z-10"
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
              <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-100 group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

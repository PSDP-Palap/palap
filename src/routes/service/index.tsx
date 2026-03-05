import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import supabase from "@/utils/supabase";
import { ServiceCard } from "@/components/service/ServiceCard";
import type { Service } from "@/types/service";

const DEFAULT_DESCRIPTION = "Reliable and professional pet service tailored for your needs.";
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1517849845537-4d257902454a?q=80&w=1200&auto=format&fit=crop";

export const Route = createFileRoute("/service/")({
  loader: async () => {
    console.log("[Router] Service loader started");

    const { data, error } = await supabase
      .from("services")
      .select("*")
      .neq("category", "DELIVERY_SESSION")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[Router] Supabase error fetching services:", error);
      throw error;
    }

    console.log("[Router] Service loader finished, count:", data?.length);

    const visibleServices: Service[] = (data ?? [])
      .map((item: any) => ({
        id: String(item.service_id ?? item.id ?? ""),
        name: item.name ?? "Unnamed Service",
        price: Number(item.price ?? 0),
        category: item.category ?? null,
        pickup_address: item.pickup_address ?? null,
        dest_address: item.dest_address ?? null,
        description: item.description ?? DEFAULT_DESCRIPTION,
        image_url: item.image_url ?? DEFAULT_IMAGE,
        creator_id: item.freelancer_id ?? item.created_by ?? item.user_id ?? item.profile_id ?? null,
        creator_name: "Freelancer",
        creator_avatar_url: null,
      }))
      .filter((item) => {
        const name = String(item.name || "").toLowerCase();
        return !name.includes("order session");
      });

    return { services: visibleServices };
  },
  component: RouteComponent,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-[#F9E6D8] flex flex-col items-center justify-center">
      <p className="text-red-600 font-bold mb-4">{error.message || "Failed to load services"}</p>
      <button
        className="bg-[#D35400] text-white px-6 py-2 rounded-lg"
        onClick={() => window.location.reload()}
      >
        Retry
      </button>
    </div>
  ),
  pendingComponent: () => (
    <div className="min-h-screen bg-[#F9E6D8] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#D35400] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#D35400] font-bold animate-pulse">Loading Services...</p>
      </div>
    </div>
  )
});

function RouteComponent() {
  const { services: initialServices } = Route.useLoaderData();
  const [services, setServices] = useState<Service[]>(initialServices);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync services if loader data changes
  useEffect(() => {
    setServices(initialServices);
  }, [initialServices]);

  const filteredServices = services.filter((service) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return (
      service.name.toLowerCase().includes(query) ||
      (service.description ?? "").toLowerCase().includes(query) ||
      (service.category ?? "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-[#F9E6D8] font-sans pb-14">
      <main className="max-w-6xl mx-auto p-6 pt-28">
        <div className="bg-[#FF914D] rounded-2xl p-8 mb-8 relative overflow-hidden shadow-lg border-b-4 border-orange-600/20">
          <h1 className="text-3xl font-black text-white uppercase">SELECT SERVICES</h1>
          <p className="text-white/90 text-sm font-semibold mt-1">Choose a service for your pet</p>
        </div>

        <div className="mb-8 bg-white rounded-xl border border-orange-200 p-2 shadow-sm flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 px-2">
            <Search className="w-5 h-5 text-gray-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              type="text"
              placeholder="Search services"
              className="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none"
            />
          </div>
          <button
            type="button"
            className="bg-[#A74607] hover:bg-[#923c05] text-white text-xs font-black uppercase tracking-wide px-5 py-2 rounded-lg transition-colors"
          >
            Search
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              defaultImage={DEFAULT_IMAGE}
              defaultDescription={DEFAULT_DESCRIPTION}
            />
          ))}
        </div>

        {services.length === 0 && (
          <div className="mt-6 text-center text-sm font-semibold text-[#4A2600]/70">No services available.</div>
        )}

        {services.length > 0 && filteredServices.length === 0 && (
          <div className="mt-6 text-center text-sm font-semibold text-[#4A2600]/70">
            No services found for "{searchQuery}".
          </div>
        )}
      </main>
    </div>
  );
}

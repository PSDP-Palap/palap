import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ServiceCard } from "@/components/service/ServiceCard";
import Loading from "@/components/shared/Loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import type { Service } from "@/types/service";
import supabase from "@/utils/supabase";

const DEFAULT_DESCRIPTION =
  "Reliable and professional pet service tailored for your needs.";
const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1517849845537-4d257902454a?q=80&w=1200&auto=format&fit=crop";

const categoryLabelMap: Record<string, string> = {
  all: "All Categories",
  SHOPPING: "ซื้อของ",
  DELIVERY: "รับ-ส่ง",
  CARE: "ดูแลสัตว์เลี้ยง"
};

export const Route = createFileRoute("/service/")({
  loader: async () => {
    const { data, error } = await supabase
      .from("services")
      .select("*, pickup_address:addresses!pickup_address_id(*), dest_address:addresses!destination_address_id(*)")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const visibleServices: Service[] = (data ?? [])
      .map((item) => ({
        id: String(item.service_id ?? item.id ?? ""),
        name: item.name ?? "Unnamed Service",
        price: Number(item.price ?? 0),
        category: item.category ?? null,
        pickup_address: item.pickup_address ?? null,
        dest_address: item.dest_address ?? null,
        pickup_address_id: item.pickup_address_id ?? null,
        destination_address_id: item.destination_address_id ?? null,
        description: item.description ?? DEFAULT_DESCRIPTION,
        image_url: item.image_url ?? DEFAULT_IMAGE,
        creator_id:
          item.freelancer_id ??
          item.created_by ??
          item.user_id ??
          item.profile_id ??
          null,
        creator_name: "Freelancer",
        creator_avatar_url: null,
        created_at: item.created_at
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
      <p className="text-red-600 font-bold mb-4">
        {error.message || "Failed to load services"}
      </p>
      <button
        className="bg-[#D35400] text-white px-6 py-2 rounded-lg"
        onClick={() => window.location.reload()}
      >
        Retry
      </button>
    </div>
  ),
  pendingComponent: () => (
    <div className="min-h-screen bg-[#F9E6D8] flex items-center justify-center pt-24">
      <Loading fullScreen={false} size={150} />
    </div>
  )
});

function RouteComponent() {
  const { services: initialServices } = Route.useLoaderData();
  const [services, setServices] = useState<Service[]>(initialServices);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortOption, setSortOption] = useState("created_at_desc");

  // Sync services if loader data changes
  useEffect(() => {
    setServices(initialServices);
  }, [initialServices]);

  const filteredAndSortedServices = useMemo(() => {
    const filtered = services.filter((service) => {
      const query = searchQuery.trim().toLowerCase();
      if (selectedCategory !== "all" && service.category !== selectedCategory) {
        return false;
      }

      if (!query) return true;

      return (
        service.name.toLowerCase().includes(query) ||
        (service.description ?? "").toLowerCase().includes(query)
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case "price_asc":
          return a.price - b.price;
        case "price_desc":
          return b.price - a.price;
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "created_at_desc":
        default:
          return (
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
          );
      }
    });

    return sorted;
  }, [services, searchQuery, selectedCategory, sortOption]);

  return (
    <div className="min-h-screen bg-[#F9E6D8] font-sans pb-14">
      <main className="max-w-6xl mx-auto p-6 pt-28">
        <div className="flex items-center pl-8 bg-[#FF914D] rounded-2xl mb-8 relative overflow-hidden shadow-lg">
          <div>
            <h1 className="text-3xl font-black text-white uppercase ">
              SELECT SERVICES
            </h1>
            <p className="text-white/90 text-sm font-semibold mt-1">
              Choose a service for your pet
            </p>
          </div>
          <img src="/cat.png" alt="cat" className="ml-auto" />
        </div>

        <div className="mb-4 flex items-center gap-4">
          <div className="flex-1 bg-white rounded-xl border border-orange-200 p-2 shadow-sm flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-500 ml-2" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              type="text"
              placeholder="Search services..."
              className="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none"
            />
          </div>
          <div className="flex-none">
            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger className="w-auto bg-white border-orange-200 shadow-sm text-xs font-bold text-gray-600">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at_desc">Newest</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
                <SelectItem value="name_asc">Name: A-Z</SelectItem>
                <SelectItem value="name_desc">Name: Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2">
          {Object.entries(categoryLabelMap).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setSelectedCategory(value)}
              type="button"
              className={`px-4 py-2 text-xs font-bold rounded-full transition-colors ${
                selectedCategory === value
                  ? "bg-[#A74607] text-white shadow-md"
                  : "bg-white text-[#A74607] hover:bg-orange-50 border border-orange-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              defaultImage={DEFAULT_IMAGE}
              defaultDescription={DEFAULT_DESCRIPTION}
            />
          ))}
        </div>

        {services.length === 0 && (
          <div className="mt-6 text-center text-sm font-semibold text-[#4A2600]/70">
            No services available.
          </div>
        )}

        {filteredAndSortedServices.length === 0 && services.length > 0 && (
          <div className="mt-6 text-center text-sm font-semibold text-[#4A2600]/70">
            No services found for your criteria.
          </div>
        )}
      </main>
    </div>
  );
}

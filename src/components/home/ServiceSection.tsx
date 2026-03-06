import { Link } from "@tanstack/react-router";
import { useEffect } from "react";

import { useServiceStore } from "@/stores/useServiceStore";
import type { ServiceCategory } from "@/types/service";

const categoryIconMap: Record<ServiceCategory, string> = {
  SHOPPING: "🍲",
  DELIVERY: "🚐",
  CARE: "🦮"
};

const categoryLabelMap: Record<ServiceCategory, string> = {
  SHOPPING: "ซื้อของ",
  DELIVERY: "รับ-ส่ง",
  CARE: "ดูแลสัตว์เลี้ยง"
};

const ServiceSection = () => {
  const { services, loadServices } = useServiceStore();

  useEffect(() => {
    loadServices(3);
  }, [loadServices]);

  return (
    <section id="services" className="flex flex-col gap-8 py-12 scroll-mt-24">
      <div className="flex justify-between items-end px-2">
        <div>
          <h3 className="text-3xl font-black text-[#9a3c0b] uppercase">
            Service
          </h3>
          <p className="text-gray-500 font-medium">
            บริการที่เราพร้อมดูแลสัตว์เลี้ยงของคุณ
          </p>
        </div>
        <Link
          to="/service"
          className="text-[#9a3c0b] font-bold underline underline-offset-4 hover:text-orange-600 transition-colors"
        >
          ดูทั้งหมด
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <Link
            to="/service/$service_id"
            params={{ service_id: service.service_id || service.id || "" }}
            key={service.service_id}
            className="group"
          >
            <div
              className="flex flex-col p-0 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border border-orange-100 overflow-hidden group relative"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255, 155, 69, 0.3) 0%, rgba(255, 155, 69, 1) 100%)"
              }}
            >
              {/* Category Badge */}
              <div className="absolute top-4 right-4 z-10">
                <span className="px-3 py-1 bg-white/80 backdrop-blur-sm text-[#9a3c0b] text-xs font-black rounded-full shadow-sm border border-white/50">
                  {categoryLabelMap[service.category]}
                </span>
              </div>

              <div className="h-48 w-full flex items-center justify-center overflow-hidden">
                {service.image_url ? (
                  <img
                    src={service.image_url}
                    alt={service.name}
                    className="w-full h-full object-contain p-4 transform group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="text-6xl transform group-hover:scale-110 transition-transform duration-300">
                    {categoryIconMap[service.category] ?? "🐾"}
                  </div>
                )}
              </div>
              <div className="p-8 pt-0 flex flex-col items-center">
                <h4 className="font-black text-xl text-black text-center">
                  {service.name}
                </h4>
                <div className="mt-4 px-6 py-2 bg-white text-[#9a3c0b] text-xs font-black rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 shadow-lg">
                  จองเลย
                </div>
              </div>
            </div>
          </Link>
        ))}

        {services.length === 0 && (
          <div className="col-span-3 py-20 text-center bg-white/50 rounded-[2.5rem] border-2 border-dashed border-orange-200">
            <p className="text-orange-300 font-bold">
              กำลังโหลดบริการที่น่าสนใจ...
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-64 flex justify-between bg-linear-to-r from-orange-400 to-amber-400 rounded-2xl overflow-hidden shadow-lg group">
          <div className="flex flex-col justify-center pl-10 z-10">
            <h2 className="text-3xl font-black text-white leading-tight">
              สัตว์เลี้ยงคุณยิ้ม
              <br />
              เราก็ยิ้มมม...
            </h2>
            <p className="text-white/80 text-sm mt-2 mb-6">
              บริการด้วยใจ เพื่อเพื่อนสี่ขาของคุณ
            </p>
            <button
              onClick={() =>
                document
                  .getElementById("services")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="bg-white text-orange-500 font-bold py-3 px-8 rounded-full shadow-md hover:bg-orange-50 transition-all w-fit"
            >
              ลองเลย
            </button>
          </div>
          <div className="relative w-1/2">
            <img
              src="./shiba.png"
              className="absolute bottom-0 right-16 h-[110%] object-contain transform group-hover:scale-110 transition-transform duration-500"
              alt="Shiba"
            />
          </div>
        </div>

        <div className="h-64 flex justify-between bg-[#9a3c0b] rounded-2xl overflow-hidden shadow-lg group">
          <div className="relative w-1/2">
            <img
              src="./parrot-eating.png"
              className="absolute bottom-0 left-16 h-[110%] object-contain transform group-hover:scale-110 transition-transform duration-500"
              alt="Dog"
            />
          </div>
          <div className="flex flex-col justify-center pr-10 text-right z-10">
            <h2 className="text-3xl font-black text-white leading-tight">
              ดูแลเหมือน
              <br />
              คนในครอบครัว
            </h2>
            <p className="text-white/60 text-sm mt-2 mb-6">
              ความปลอดภัยของสัตว์เลี้ยงคือที่หนึ่ง
            </p>
            <div className="flex justify-end">
              <button className="bg-orange-400 text-white font-bold py-3 px-8 rounded-full shadow-md hover:bg-orange-500 transition-all w-fit">
                อ่านต่อ
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServiceSection;

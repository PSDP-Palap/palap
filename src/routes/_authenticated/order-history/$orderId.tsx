/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
    Package,
    MapPin,
    User,
    ArrowLeft,
    Clock,
    CheckCircle2,
    ShieldCheck,
    CreditCard,
    Building,
    Navigation,
    XCircle,
} from "lucide-react";

import { useOrderStore } from "@/stores/useOrderStore";
import { useUserStore } from "@/stores/useUserStore";
import {
    getOrderIdFromSystemMessage,
    isCompletedOrderStatus,
} from "@/utils/helpers";
import supabase from "@/utils/supabase";
import Loading from "@/components/shared/Loading";

export const Route = createFileRoute("/_authenticated/order-history/$orderId")({
    component: RouteComponent,
});

type OrderDetail = {
    orderId: string;
    productName: string;
    productImage: string | null;
    serviceName: string;
    customerName: string;
    freelancerName: string;
    status: string;
    price: number;
    createdAt: string;
    updatedAt: string;
    pickupName: string;
    pickupDetail: string;
    destinationName: string;
    destinationDetail: string;
    isCompleted: boolean;
};

function RouteComponent() {
    const { orderId } = Route.useParams();
    const router = useRouter();
    const { profile, session } = useUserStore();
    const currentUserId = profile?.id || session?.user?.id || null;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [detail, setDetail] = useState<OrderDetail | null>(null);

    useEffect(() => {
        const loadOrderDetail = async () => {
            if (!currentUserId || !orderId) return;

            try {
                setLoading(true);
                setError(null);

                // 1. ดึงข้อมูล Order
                const { data: row, error: orderError } = await supabase
                    .from("orders")
                    .select("*")
                    .eq("order_id", orderId)
                    .maybeSingle();

                if (orderError) throw orderError;
                if (!row) throw new Error("Order not found.");

                // 2. ดึงข้อมูลที่เกี่ยวข้องทั้งหมด (เน้นดึง detail จาก Services เผื่อไว้)
                const [
                    { data: productRow },
                    { data: serviceRow },
                    { data: customerRow },
                    { data: freelancerRow },
                    { data: addressRows },
                    { data: doneMarkerRow },
                ] = await Promise.all([
                    row.product_id ? supabase.from("products").select("name, image_url").eq("product_id", String(row.product_id)).maybeSingle() : Promise.resolve({ data: null as any }),
                    row.service_id ? supabase.from("services").select("name, detail_1, detail_2").eq("service_id", String(row.service_id)).maybeSingle() : Promise.resolve({ data: null as any }),
                    row.customer_id ? supabase.from("profiles").select("full_name, email").eq("id", String(row.customer_id)).maybeSingle() : Promise.resolve({ data: null as any }),
                    row.freelance_id ? supabase.from("profiles").select("full_name, email").eq("id", String(row.freelance_id)).maybeSingle() : Promise.resolve({ data: null as any }),
                    supabase.from("addresses").select("id, name, address_detail").in("id", [row.pickup_address_id, row.destination_address_id].filter(Boolean)),
                    supabase.from("chat_messages").select("id").eq("order_id", orderId).eq("message_type", "SYSTEM_DELIVERY_DONE").maybeSingle(),
                ]);

                const addressMap = new Map(((addressRows as any[]) ?? []).map((item: any) => [String(item.id), item]));
                const rawStatus = String(row.status || "").toUpperCase();
                const normalizedStatus = !!doneMarkerRow || isCompletedOrderStatus(rawStatus) ? "COMPLETE" : rawStatus || "WAITING";

                // --- 🚨 Logic การดึงชื่อที่อยู่ (รองรับทั้ง UUID และ Text) ---
                let finalPickupName = "Pickup Point";
                let finalPickupDetail = "Information not available";
                let finalDestName = "Destination";
                let finalDestDetail = "Information not available";

                // เช็ค Pickup
                const addrP = addressMap.get(String(row.pickup_address_id));
                if (addrP) {
                    finalPickupName = addrP.name || "Pickup Point";
                    finalPickupDetail = addrP.address_detail || "";
                } else if (serviceRow?.detail_1) {
                    finalPickupName = serviceRow.detail_1;
                    finalPickupDetail = "Service Origin";
                }

                // เช็ค Destination
                const addrD = addressMap.get(String(row.destination_address_id));
                if (addrD) {
                    finalDestName = addrD.name || "Destination";
                    finalDestDetail = addrD.address_detail || "";
                } else if (serviceRow?.detail_2) {
                    finalDestName = serviceRow.detail_2;
                    finalDestDetail = "Service Destination";
                }

                setDetail({
                    orderId: String(row.order_id),
                    productName: productRow?.name || "Premium Product",
                    productImage: productRow?.image_url || null,
                    serviceName: serviceRow?.name || "Delivery Service",
                    customerName: customerRow?.full_name || customerRow?.email || "Customer",
                    freelancerName: freelancerRow?.full_name || freelancerRow?.email || "Assigning Freelancer...",
                    status: normalizedStatus,
                    price: Number(row.price || 0),
                    createdAt: String(row.created_at || ""),
                    updatedAt: String(row.updated_at || row.created_at || ""),
                    pickupName: finalPickupName,
                    pickupDetail: finalPickupDetail,
                    destinationName: finalDestName,
                    destinationDetail: finalDestDetail,
                    isCompleted: normalizedStatus === "COMPLETE",
                });
            } catch (err: any) {
                setError(err?.message || "Unable to load order detail.");
            } finally {
                setLoading(false);
            }
        };

        loadOrderDetail();
    }, [currentUserId, orderId]);

    if (loading) return <Loading />;

    if (error || !detail) {
        return (
            <div className="min-h-screen bg-[#FDFCFB] pt-24 flex flex-col items-center justify-center p-4">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
                    <Package className="w-10 h-10 text-red-300" />
                </div>
                <h2 className="text-2xl font-black text-[#4A2600] mb-2">Order Not Found</h2>
                <p className="text-gray-500 font-bold mb-8">{error || "This order may have been moved or deleted."}</p>
                <Link to="/order-history" className="px-8 py-4 rounded-2xl bg-[#A03F00] text-white font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                    Back to My Orders
                </Link>
            </div>
        );
    }

    const steps = [
        { id: "WAITING", label: "Order Placed", icon: Package },
        { id: "ON_MY_WAY", label: "Accepted", icon: CheckCircle2 },
        { id: "IN_SERVICE", label: "In Service", icon: Building },
        { id: "COMPLETE", label: "Delivered", icon: ShieldCheck },
    ];

    const currentStepIndex = steps.findIndex((s) => s.id === detail.status);
    const isCancelled = detail.status === "CANCEL";

    return (
        <div className="min-h-screen bg-[#FDFCFB] pt-24 pb-20">
            <main className="max-w-4xl mx-auto px-4">
                <div className="flex items-center justify-between mb-8">
                    <Link to="/order-history" className="flex items-center gap-2 text-gray-400 hover:text-orange-600 transition-colors group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest pt-0.5">Back to Orders</span>
                    </Link>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order ID</p>
                        <p className="text-xs font-black text-[#4A2600]">{detail.orderId}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    {!isCancelled && (
                        <section className="bg-white rounded-[2.5rem] border border-orange-50 shadow-xl p-8 sm:p-10">
                            <div className="relative flex justify-between">
                                <div className="absolute top-5 left-0 w-full h-1 bg-orange-50 -z-0 rounded-full" />
                                <div className="absolute top-5 left-0 h-1 bg-[#A03F00] transition-all duration-1000 rounded-full" style={{ width: `${(Math.max(0, currentStepIndex) / (steps.length - 1)) * 100}%` }} />
                                {steps.map((step, idx) => {
                                    const Icon = step.icon;
                                    const isActive = idx <= currentStepIndex;
                                    return (
                                        <div key={step.id} className="relative z-10 flex flex-col items-center">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${isActive ? "bg-[#A03F00] text-white shadow-lg" : "bg-white border-2 border-orange-50 text-gray-200"} ${idx === currentStepIndex ? "ring-4 ring-orange-100 scale-110" : ""}`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <p className={`mt-3 text-[9px] font-black uppercase tracking-wider hidden sm:block ${isActive ? "text-[#A03F00]" : "text-gray-300"}`}>{step.label}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            <section className="bg-white rounded-[2.5rem] border border-orange-50 shadow-xl p-8 flex flex-col sm:flex-row gap-8">
                                <div className="w-32 h-32 rounded-3xl bg-orange-50 overflow-hidden shrink-0 shadow-inner border border-orange-100">
                                    <img src={detail.productImage || "/parrot-eating.png"} alt={detail.productName} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black text-orange-600/60 uppercase tracking-[0.2em] mb-2">Item Ordered</p>
                                    <h2 className="text-3xl font-black text-[#4A2600] leading-tight mb-4">{detail.productName}</h2>
                                    <div className="flex flex-wrap gap-4">
                                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-50 border border-orange-100">
                                            <Navigation className="w-4 h-4 text-orange-600" />
                                            <span className="text-[10px] font-black text-[#A03F00] uppercase tracking-widest">{detail.serviceName}</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <section className="bg-white rounded-[2.5rem] border border-orange-50 shadow-lg p-8">
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Location History</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-[9px] font-black text-green-600/60 uppercase tracking-widest mb-1">Pickup from</p>
                                            <p className="text-sm font-black text-[#4A2600]">{detail.pickupName}</p>
                                            <p className="text-[10px] text-gray-400">{detail.pickupDetail}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-orange-600/60 uppercase tracking-widest mb-1">Delivery to</p>
                                            <p className="text-sm font-black text-[#4A2600]">{detail.destinationName}</p>
                                            <p className="text-[10px] text-gray-400">{detail.destinationDetail}</p>
                                        </div>
                                    </div>
                                </section>
                                <section className="bg-white rounded-[2.5rem] border border-orange-50 shadow-lg p-8">
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Provider Details</h3>
                                    <div className="space-y-4">
                                        <p className="text-[9px] font-black text-blue-600/60 uppercase tracking-widest mb-1">Customer</p>
                                        <p className="text-sm font-black text-[#4A2600] mb-3">{detail.customerName}</p>
                                        <p className="text-[9px] font-black text-orange-600/60 uppercase tracking-widest mb-1">Freelancer</p>
                                        <p className="text-sm font-black text-[#4A2600]">{detail.freelancerName}</p>
                                    </div>
                                </section>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <section className="bg-white rounded-[2.5rem] shadow-xl border-2 border-orange-50 p-8 text-[#4A2600]">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Payment Summary</h3>
                                <div className="flex justify-between items-end pt-2">
                                    <span className="text-xs font-black uppercase tracking-widest text-orange-600">Total Price</span>
                                    <span className="text-3xl font-black italic text-[#4A2600]">฿{detail.price.toLocaleString()}</span>
                                </div>
                            </section>

                            <div className="flex flex-col gap-3">
                                {!detail.isCompleted && detail.status !== "CANCEL" && (
                                    <button onClick={() => router.navigate({ to: "/order/$order_id" as any, params: { order_id: detail.orderId } as any })} className="w-full py-5 rounded-2xl bg-white text-[#A03F00] font-black text-xs uppercase tracking-[0.2em] shadow-xl border border-orange-100 hover:bg-orange-50 transition-all active:scale-95 flex items-center justify-center gap-2">
                                        <Navigation className="w-4 h-4" /> Live Tracking
                                    </button>
                                )}
                                <button onClick={() => router.navigate({ to: "/order-history" })} className="w-full py-5 rounded-2xl bg-gray-50 text-gray-400 font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-100 transition-all">Return to History</button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
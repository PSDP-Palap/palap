import { Link } from "@tanstack/react-router";
import { ImageIcon, MapPin, Plus, Settings, Tag, Zap } from "lucide-react";
import { useState } from "react";

import { ServiceManagementDialog } from "@/components/admin/service-management/ServiceManagementDialog";
import { AddServiceDialog } from "@/components/freelance/AddServiceDialog";
import Loading from "@/components/shared/Loading";
import { useUserStore } from "@/stores/useUserStore";
import type {
  DeliveryOrderItem,
  OngoingServiceJobItem,
  PendingHireRequestItem
} from "@/types/freelance";
import type { Service } from "@/types/service";

interface MyJobsTabProps {
  refreshJobBoard: () => Promise<void>;
  refreshingJobBoard: boolean;
  loadingDeliveryOrders: boolean;
  loadingPendingHireRequests: boolean;
  loadingOngoingServiceJobs: boolean;
  jobBoardLastUpdatedAt: string | null;
  pendingHireRequests: PendingHireRequestItem[];
  acceptHireRequest: (request: PendingHireRequestItem) => Promise<void>;
  rejectHireRequest: (request: PendingHireRequestItem) => Promise<void>;
  acceptingHireRoomId: string | null;
  ongoingServiceJobs: OngoingServiceJobItem[];
  updateJobStatus: (orderId: string, status: string) => Promise<void>;
  updatingJobId: string | null;
  availableDeliveryOrders: DeliveryOrderItem[];
  acceptDeliveryOrder: (order: DeliveryOrderItem) => Promise<void>;
  acceptingOrderId: string | null;
  myDeliveryOrders: DeliveryOrderItem[];
  completeDeliveryOrder: (order: DeliveryOrderItem) => Promise<void>;
  completingOrderId: string | null;
  createMyService: (data: any) => Promise<void>;
  updateMyService: (
    serviceId: string,
    data: Partial<Omit<Service, "service_id">>
  ) => Promise<void>;
  deleteMyService: (serviceId: string) => Promise<void>;
  creating: boolean;
  services: Service[];
  loadingServices: boolean;
  error: string | null;
  success: string | null;
}

const MyJobsTab = ({
  refreshJobBoard,
  refreshingJobBoard,
  loadingDeliveryOrders,
  loadingPendingHireRequests,
  loadingOngoingServiceJobs,
  jobBoardLastUpdatedAt,
  pendingHireRequests,
  acceptHireRequest,
  rejectHireRequest,
  acceptingHireRoomId,
  ongoingServiceJobs,
  updateJobStatus,
  updatingJobId,
  availableDeliveryOrders,
  acceptDeliveryOrder,
  acceptingOrderId,
  myDeliveryOrders,
  completeDeliveryOrder,
  completingOrderId,
  createMyService,
  updateMyService,
  deleteMyService,
  services,
  loadingServices,
  error,
  success
}: MyJobsTabProps) => {
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;

  // Management State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const isAnyLoading =
    loadingDeliveryOrders ||
    loadingPendingHireRequests ||
    loadingOngoingServiceJobs;

  const getNextStatus = (currentStatus: string) => {
    const s = String(currentStatus || "").toUpperCase();
    if (s === "ON_MY_WAY") return "IN_SERVICE";
    if (s === "IN_SERVICE") return "COMPLETE";
    return null;
  };

  const getStatusLabel = (status: string) => {
    const s = String(status || "").toUpperCase();
    const labels: Record<string, string> = {
      ON_MY_WAY: "On My Way",
      IN_SERVICE: "In Service",
      COMPLETE: "Complete",
      REJECT: "Rejected",
      WAITING: "Waiting",
      CANCEL: "Cancelled"
    };
    return labels[s] || status;
  };

  return (
    <div
      className={`space-y-4 min-h-full pb-10 flex flex-col ${isAnyLoading ? "justify-center" : ""}`}
    >
      <div className="bg-white rounded-[2rem] border-4 border-orange-50 p-6 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-[#4A2600] mb-1">My Jobs</h2>
          <p className="text-sm font-bold text-gray-400">
            Manage your active jobs and service listings.
          </p>
        </div>
        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-[#A03F00] text-white px-6 py-3 rounded-2xl font-black hover:bg-[#803300] transition-all shadow-xl shadow-orange-200 active:scale-95 flex items-center gap-2"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
          Create Service
        </button>
      </div>

      <section className="bg-white rounded-[2rem] border-4 border-orange-50 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xl font-black text-[#4A2600]">
            Service Job Board
          </h3>
          <div className="text-right">
            <button
              type="button"
              onClick={refreshJobBoard}
              disabled={
                refreshingJobBoard ||
                loadingDeliveryOrders ||
                loadingPendingHireRequests ||
                loadingOngoingServiceJobs
              }
              className="px-4 py-2 rounded-xl text-xs font-black bg-orange-100 text-[#A03F00] hover:bg-orange-200 transition-all disabled:bg-gray-100 disabled:text-gray-400"
            >
              {refreshingJobBoard ? "Refreshing..." : "Refresh Board"}
            </button>
            <p className="mt-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Last updated:{" "}
              {jobBoardLastUpdatedAt
                ? new Date(jobBoardLastUpdatedAt).toLocaleTimeString()
                : "-"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-[1.5rem] border-2 border-orange-50 p-5 bg-orange-50/20">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h4 className="font-black text-[#4A2600]">
                Pending Hire Requests
              </h4>
              <span className="px-3 py-1 rounded-full bg-orange-500 text-white text-[10px] font-black shadow-lg shadow-orange-100">
                {pendingHireRequests.length}
              </span>
            </div>

            {loadingPendingHireRequests ? (
              <Loading fullScreen={false} size={40} />
            ) : pendingHireRequests.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">No pending requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingHireRequests.map((request) => (
                  <div
                    key={request.orderId}
                    className="bg-white border-2 border-orange-50 rounded-2xl p-4 shadow-sm space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-black text-[#4A2600]">
                          {request.customerName}
                        </p>
                        <p className="text-xs font-bold text-orange-500 uppercase tracking-wider">
                          {request.serviceName}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-orange-50/50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-orange-300 mb-1">
                        Customer Message
                      </p>
                      <p className="text-xs font-bold text-[#5D2611] leading-relaxed">
                        {request.requestMessage}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                       <p className="text-[10px] font-bold text-gray-400">
                        {request.requestedAt
                          ? new Date(request.requestedAt).toLocaleString()
                          : "-"}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => rejectHireRequest(request)}
                          disabled={acceptingHireRoomId === request.orderId}
                          className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-[10px] font-black hover:bg-red-100 transition-all disabled:bg-gray-50"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => acceptHireRequest(request)}
                          disabled={acceptingHireRoomId === request.orderId}
                          className="px-4 py-2 rounded-xl bg-green-500 text-white text-[10px] font-black hover:bg-green-600 transition-all shadow-lg shadow-green-100 disabled:bg-gray-300"
                        >
                          {acceptingHireRoomId === request.orderId
                            ? "Accepting..."
                            : "Accept Job"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[1.5rem] border-2 border-orange-50 p-5 bg-orange-50/20">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h4 className="font-black text-[#4A2600]">
                Ongoing Service Jobs
              </h4>
              <span className="px-3 py-1 rounded-full bg-blue-500 text-white text-[10px] font-black shadow-lg shadow-blue-100">
                {ongoingServiceJobs.length}
              </span>
            </div>

            {loadingOngoingServiceJobs ? (
              <Loading fullScreen={false} size={40} />
            ) : ongoingServiceJobs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">No ongoing jobs</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ongoingServiceJobs.map((job) => (
                  <div
                    key={job.orderId}
                    className="bg-white border-2 border-orange-50 rounded-2xl p-4 shadow-sm space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-black text-[#4A2600]">
                          {job.serviceName}
                        </p>
                        <p className="text-xs font-bold text-orange-500 uppercase tracking-wider">
                          Customer: {job.customerName}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${String(job.status || "").toUpperCase() === "COMPLETE" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}
                      >
                        {getStatusLabel(job.status)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-orange-50">
                      <p className="text-lg font-black text-[#5D2611]">
                        ฿ {job.price.toFixed(2)}
                      </p>
                      <div className="flex gap-2">
                        {getNextStatus(job.status) && (
                          <button
                            type="button"
                            onClick={() =>
                              updateJobStatus(
                                job.orderId,
                                getNextStatus(job.status)!
                              )
                            }
                            disabled={updatingJobId === job.orderId}
                            className="px-4 py-2 rounded-xl bg-orange-500 text-white text-[10px] font-black hover:bg-orange-600 shadow-lg shadow-orange-100 transition-all disabled:bg-orange-300"
                          >
                            {updatingJobId === job.orderId
                              ? "Updating..."
                              : `Mark ${getStatusLabel(getNextStatus(job.status)!)}`}
                          </button>
                        )}
                        <Link
                          to="/chat/$id"
                          params={{ id: job.roomId }}
                          className="px-4 py-2 rounded-xl bg-[#A03F00] text-white text-[10px] font-black hover:bg-[#803300] transition-all shadow-lg shadow-orange-200"
                        >
                          Chat
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white rounded-[2rem] border-4 border-orange-50 p-6 shadow-sm space-y-4">
        <h3 className="text-xl font-black text-[#4A2600]">
          Delivery Job Board
        </h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-[1.5rem] border-2 border-orange-50 p-5 bg-orange-50/20">
            <h4 className="font-black text-[#4A2600] mb-4">Waiting Orders</h4>
            {availableDeliveryOrders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">No waiting orders</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableDeliveryOrders.map((order) => (
                  <div
                    key={order.orderId}
                    className="bg-white border-2 border-orange-50 rounded-2xl p-4 shadow-sm space-y-3"
                  >
                    <div>
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Order: {order.orderId.slice(0,8)}</p>
                      <p className="font-black text-[#4A2600]">
                        {order.productName}
                      </p>
                      <p className="text-xs font-bold text-orange-500">
                        Customer: {order.customerName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                      <span className="px-2 py-0.5 bg-orange-50 text-orange-400 rounded-md">PICKUP</span>
                      <span className="truncate">{order.pickupLabel}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                      <span className="px-2 py-0.5 bg-green-50 text-green-400 rounded-md">DROP</span>
                      <span className="truncate">{order.destinationLabel}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-3 border-t border-orange-50">
                      <p className="text-lg font-black text-[#5D2611]">
                        ฿ {order.price.toFixed(2)}
                      </p>
                      <button
                        type="button"
                        onClick={() => acceptDeliveryOrder(order)}
                        disabled={acceptingOrderId === order.orderId}
                        className="px-4 py-2 rounded-xl bg-[#A03F00] text-white text-[10px] font-black hover:bg-[#803300] shadow-lg shadow-orange-200 transition-all"
                      >
                        {acceptingOrderId === order.orderId
                          ? "Accepting..."
                          : "Accept Order"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[1.5rem] border-2 border-orange-50 p-5 bg-orange-50/20">
            <h4 className="font-black text-[#4A2600] mb-4">
              My Active Deliveries
            </h4>
            {myDeliveryOrders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">No active deliveries</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myDeliveryOrders.map((order) => (
                  <div
                    key={order.orderId}
                    className="bg-white border-2 border-orange-50 rounded-2xl p-4 shadow-sm space-y-3"
                  >
                     <div>
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Order: {order.orderId.slice(0,8)}</p>
                      <p className="font-black text-[#4A2600]">
                        {order.productName}
                      </p>
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-orange-500">
                          Customer: {order.customerName}
                        </p>
                        <span className="text-[10px] font-black px-3 py-1 bg-blue-50 text-blue-500 rounded-full uppercase">
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                      <span className="px-2 py-0.5 bg-orange-50 text-orange-400 rounded-md">PICKUP</span>
                      <span className="truncate">{order.pickupLabel}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                      <span className="px-2 py-0.5 bg-green-50 text-green-400 rounded-md">DROP</span>
                      <span className="truncate">{order.destinationLabel}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-3 border-t border-orange-50">
                      <p className="text-lg font-black text-[#5D2611]">
                        ฿ {order.price.toFixed(2)}
                      </p>
                      <button
                        type="button"
                        onClick={() => completeDeliveryOrder(order)}
                        disabled={completingOrderId === order.orderId}
                        className="px-4 py-2 rounded-xl bg-green-500 text-white text-[10px] font-black hover:bg-green-600 shadow-lg shadow-green-100 transition-all"
                      >
                        {completingOrderId === order.orderId
                          ? "Finishing..."
                          : "Done Delivery"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white rounded-[2rem] border-4 border-orange-50 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="text-xl font-black text-[#4A2600]">My Published Services</h3>
        </div>
        {loadingServices ? (
          <Loading fullScreen={false} size={40} />
        ) : services.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-orange-50 rounded-2xl">
            <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">No services published yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => {
              const hasActiveJobs = ongoingServiceJobs.some(job => job.serviceId === (service.id || service.service_id));
              return (
                <div
                  key={String(service.service_id || service.id)}
                  className="group bg-white rounded-3xl p-5 border-2 border-orange-50 hover:border-orange-200 hover:shadow-2xl hover:shadow-orange-100 transition-all duration-300 flex flex-col"
                >
                  <div className="aspect-video rounded-2xl bg-orange-50 mb-4 overflow-hidden relative">
                    {service.image_url ? (
                      <img src={service.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-orange-200">
                         <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[9px] font-black text-orange-600 uppercase tracking-widest shadow-sm border border-orange-50 flex items-center gap-1.5">
                        <Tag className="w-3 h-3" />
                        {service.category}
                      </span>
                      {hasActiveJobs && (
                        <span className="px-3 py-1 bg-blue-500/90 backdrop-blur-md rounded-full text-[9px] font-black text-white uppercase tracking-widest shadow-sm border border-blue-300 flex items-center gap-1.5">
                          <Zap className="w-3 h-3" />
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col flex-1">
                    <p className="font-black text-[#4A2600] text-lg mb-2 truncate group-hover:text-orange-700 transition-colors">{service.name}</p>
                    
                    <div className="flex items-center gap-2 mb-4 text-gray-400 group-hover:text-orange-400 transition-colors">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <p className="text-xs font-bold truncate">
                        {service.detail_1 || "No pickup location set"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-orange-50">
                      <p className="text-2xl font-black text-[#A03F00]">
                        ฿ {Number(service.price ?? 0).toLocaleString()}
                      </p>
                      <button
                        onClick={() => setSelectedService(service)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-50 text-orange-500 text-[10px] font-black hover:bg-orange-100 hover:text-orange-600 transition-all group-hover:shadow-lg group-hover:shadow-orange-50"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Manage
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <AddServiceDialog 
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSuccess={createMyService}
      />

      <ServiceManagementDialog
        key={selectedService?.service_id || "new"}
        userRole={profile?.role}
        isOpen={!!selectedService}
        service={selectedService}
        onClose={() => setSelectedService(null)}
        onUpdate={updateMyService}
        onDelete={deleteMyService}
      />

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-2xl shadow-xl font-bold animate-in slide-in-from-right-4">
          {error}
        </div>
      )}
      {success && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-2xl shadow-xl font-bold animate-in slide-in-from-right-4">
          {success}
        </div>
      )}
    </div>
  );
};

export default MyJobsTab;

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  Clock,
  Compass,
  ImageIcon,
  MapPin,
  Plus,
  Settings,
  Tag,
  Zap
} from "lucide-react";
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
  const { profile } = useUserStore();
  const freelanceStatus = (profile as any)?.status || "unverified";
  const isVerified = freelanceStatus === "verified";
  const isBanned = freelanceStatus === "banned";
  const canAcceptJobs = isVerified;

  // Management State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Job Confirmation Modal State
  const [confirmJob, setConfirmJob] = useState<{
    type: "HIRE" | "DELIVERY";
    data: any;
  } | null>(null);

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

  const formatAppointment = (dateStr?: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return {
      date: d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
      }),
      time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
  };

  const openInGoogleMaps = (lat?: number | null, lng?: number | null) => {
    if (lat && lng) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        "_blank"
      );
    }
  };

  const handleConfirmAccept = async () => {
    if (!confirmJob || !canAcceptJobs) return;

    try {
      if (confirmJob.type === "HIRE") {
        await acceptHireRequest(confirmJob.data);
      } else {
        await acceptDeliveryOrder(confirmJob.data);
      }
      setConfirmJob(null);
    } catch (err) {
      console.error("Failed to accept job:", err);
    }
  };

  return (
    <div
      className={`space-y-4 min-h-full pb-10 flex flex-col ${isAnyLoading ? "justify-center" : ""}`}
    >
      <div className="bg-white rounded-[2rem] border-4 border-orange-50 p-6 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 shadow-inner">
            <Zap className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#4A2600] mb-1">My Jobs</h2>
            <p className="text-sm font-bold text-gray-400">
              Manage your active jobs and service listings.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-[#A03F00] text-white px-6 py-3 rounded-2xl font-black hover:bg-[#803300] transition-all shadow-xl shadow-orange-200 active:scale-95 flex items-center gap-2"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
          Create Service
        </button>
      </div>

      {!isVerified && (
        <div
          className={`p-5 rounded-3xl border-4 flex items-start gap-4 animate-in slide-in-from-top-4 duration-500 ${isBanned ? "bg-red-50 border-red-100 text-red-800" : "bg-orange-50 border-orange-100 text-orange-800"}`}
        >
          <div
            className={`p-3 rounded-2xl shadow-sm ${isBanned ? "bg-red-500 text-white" : "bg-orange-500 text-white"}`}
          >
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-lg font-black mb-1">
              {isBanned ? "Account Banned" : "Account Verification Pending"}
            </p>
            <p className="text-sm font-bold opacity-80 leading-relaxed">
              {isBanned
                ? "Your account has been restricted due to violations of our terms. You cannot accept any new jobs at this time."
                : "Your account is currently unverified. You can browse requests, but you must be verified by an administrator before you can accept any jobs."}
            </p>
          </div>
        </div>
      )}

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
                <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">
                  No pending requests
                </p>
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

                    {request.appointmentAt && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                        <Zap className="w-3 h-3 text-blue-500" />
                        <p className="text-[10px] font-black text-blue-700 uppercase tracking-tight">
                          Appointment:{" "}
                          {formatAppointment(request.appointmentAt)?.date} @{" "}
                          {formatAppointment(request.appointmentAt)?.time}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold text-gray-400">
                        {request.requestedAt
                          ? new Date(request.requestedAt).toLocaleString()
                          : "-"}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmJob({ type: "HIRE", data: request })
                          }
                          disabled={
                            acceptingHireRoomId === request.orderId ||
                            !canAcceptJobs
                          }
                          className="px-4 py-2 rounded-xl bg-green-500 text-white text-[10px] font-black hover:bg-green-600 transition-all shadow-lg shadow-green-100 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
                        >
                          {acceptingHireRoomId === request.orderId
                            ? "Accepting..."
                            : !canAcceptJobs
                              ? "Verification Required"
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
                <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">
                  No ongoing jobs
                </p>
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

                    {job.appointmentAt && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                        <Zap className="w-3 h-3 text-blue-500" />
                        <p className="text-[10px] font-black text-blue-700 uppercase tracking-tight">
                          Appointment:{" "}
                          {formatAppointment(job.appointmentAt)?.date} @{" "}
                          {formatAppointment(job.appointmentAt)?.time}
                        </p>
                      </div>
                    )}

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
                <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">
                  No waiting orders
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableDeliveryOrders.map((order) => (
                  <div
                    key={order.orderId}
                    className="bg-white border-2 border-orange-50 rounded-2xl p-4 shadow-sm space-y-3"
                  >
                    <div>
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                        Order: {order.orderId.slice(0, 8)}
                      </p>
                      <p className="font-black text-[#4A2600]">
                        {order.productName}
                      </p>
                      <p className="text-xs font-bold text-orange-500">
                        Customer: {order.customerName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                      <span className="px-2 py-0.5 bg-orange-50 text-orange-400 rounded-md">
                        PICKUP
                      </span>
                      <span className="truncate">{order.pickupLabel}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                      <span className="px-2 py-0.5 bg-green-50 text-green-400 rounded-md">
                        DROP
                      </span>
                      <span className="truncate">{order.destinationLabel}</span>
                    </div>

                    {order.appointmentAt && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        <div className="flex flex-col">
                          <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-0.5">
                            Pickup Time
                          </p>
                          <p className="text-[10px] font-black text-indigo-700 uppercase leading-none">
                            {formatAppointment(order.appointmentAt)?.date} @{" "}
                            {formatAppointment(order.appointmentAt)?.time}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2 pt-3 border-t border-orange-50">
                      <p className="text-lg font-black text-[#5D2611]">
                        ฿ {order.price.toFixed(2)}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmJob({ type: "DELIVERY", data: order })
                        }
                        disabled={
                          acceptingOrderId === order.orderId || !canAcceptJobs
                        }
                        className="px-4 py-2 rounded-xl bg-[#A03F00] text-white text-[10px] font-black hover:bg-[#803300] shadow-lg shadow-orange-200 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
                      >
                        {acceptingOrderId === order.orderId
                          ? "Accepting..."
                          : !canAcceptJobs
                            ? "Restricted"
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
                <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">
                  No active deliveries
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {myDeliveryOrders.map((order) => (
                  <div
                    key={order.orderId}
                    className="bg-white border-2 border-orange-50 rounded-2xl p-4 shadow-sm space-y-3"
                  >
                    <div>
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                        Order: {order.orderId.slice(0, 8)}
                      </p>
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
                      <span className="px-2 py-0.5 bg-orange-50 text-orange-400 rounded-md">
                        PICKUP
                      </span>
                      <span className="truncate">{order.pickupLabel}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                      <span className="px-2 py-0.5 bg-green-50 text-green-400 rounded-md">
                        DROP
                      </span>
                      <span className="truncate">{order.destinationLabel}</span>
                    </div>

                    {order.appointmentAt && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        <div className="flex flex-col">
                          <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-0.5">
                            Pickup Time
                          </p>
                          <p className="text-[10px] font-black text-indigo-700 uppercase leading-none">
                            {formatAppointment(order.appointmentAt)?.date} @{" "}
                            {formatAppointment(order.appointmentAt)?.time}
                          </p>
                        </div>
                      </div>
                    )}
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
          <h3 className="text-xl font-black text-[#4A2600]">
            My Published Services
          </h3>
        </div>
        {loadingServices ? (
          <Loading fullScreen={false} size={40} />
        ) : services.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-orange-50 rounded-2xl">
            <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">
              No services published yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => {
              const hasActiveJobs = ongoingServiceJobs.some(
                (job) => job.serviceId === (service.id || service.service_id)
              );
              return (
                <div
                  key={String(service.service_id || service.id)}
                  className="group bg-white rounded-3xl p-5 border-2 border-orange-50 hover:border-orange-200 hover:shadow-2xl hover:shadow-orange-100 transition-all duration-300 flex flex-col"
                >
                  <div className="aspect-video rounded-2xl bg-orange-50 mb-4 overflow-hidden relative">
                    {service.image_url ? (
                      <img
                        src={service.image_url}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
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
                    <p className="font-black text-[#4A2600] text-lg mb-2 truncate group-hover:text-orange-700 transition-colors">
                      {service.name}
                    </p>

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
              );
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

      {/* Job Confirmation Dialog */}
      {confirmJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-[#A03F00] p-6 text-white text-center">
              <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <h3 className="text-2xl font-black">Confirm Job Acceptance</h3>
              <p className="text-orange-100 text-xs font-bold uppercase tracking-widest mt-1">
                Please review job details carefully
              </p>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-orange-50 pb-3">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                    Customer
                  </span>
                  <span className="font-bold text-[#4A2600]">
                    {confirmJob.data.customerName}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-orange-50 pb-3">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                    Job Type
                  </span>
                  <span className="font-bold text-orange-600">
                    {confirmJob.type === "HIRE"
                      ? confirmJob.data.serviceName
                      : confirmJob.data.productName}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Total Paid by Customer
                    </span>
                    <span className="text-sm font-bold text-gray-500">
                      ฿ {Number(confirmJob.data.price || 0).toLocaleString()}
                    </span>
                  </div>

                  {confirmJob.type === "DELIVERY" && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black text-red-300 uppercase tracking-widest">
                        Product Price (Deducted)
                      </span>
                      <span className="text-sm font-bold text-red-300">
                        - ฿{" "}
                        {(confirmJob.data.price / 1.236).toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }
                        )}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      System Fee (20% of{" "}
                      {confirmJob.type === "HIRE" ? "Job" : "Delivery"})
                    </span>
                    <span className="text-sm font-bold text-red-400">
                      - ฿{" "}
                      {(confirmJob.type === "HIRE"
                        ? (confirmJob.data.price / 1.03) * 0.2
                        : (confirmJob.data.price / 1.236) * 0.2 * 0.2
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </span>
                  </div>
                  <div className="h-px bg-gray-200 mb-3" />
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-[#A03F00] uppercase tracking-widest">
                      Your Net Income
                    </span>
                    <span className="font-black text-2xl text-[#A03F00]">
                      ฿{" "}
                      {(confirmJob.type === "HIRE"
                        ? (confirmJob.data.price / 1.03) * 0.8
                        : (confirmJob.data.price / 1.236) * 0.2 * 0.8
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </span>
                  </div>
                </div>
                {confirmJob.data.appointmentAt && (
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">
                      Appointment Time
                    </p>
                    <p className="font-black text-blue-700">
                      {formatAppointment(confirmJob.data.appointmentAt)?.date} @{" "}
                      {formatAppointment(confirmJob.data.appointmentAt)?.time}
                    </p>
                  </div>
                )}

                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                  <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-2">
                    Location Details
                  </p>
                  {confirmJob.type === "HIRE" ? (
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-bold text-[#4A2600] leading-relaxed">
                        <MapPin className="w-3 h-3 inline mr-1 mb-0.5 text-orange-500" />
                        {confirmJob.data.locationLabel}
                      </p>
                      <button
                        onClick={() =>
                          openInGoogleMaps(
                            confirmJob.data.locationLat,
                            confirmJob.data.locationLng
                          )
                        }
                        className="p-2 bg-white rounded-lg border border-orange-200 text-orange-500 hover:bg-orange-500 hover:text-white transition-all shadow-sm shrink-0"
                        title="Open in Google Maps"
                      >
                        <Compass className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-orange-300 uppercase">
                            Pickup Point
                          </p>
                          <p className="text-xs font-bold text-[#4A2600] leading-relaxed">
                            <span className="text-orange-500 mr-1">↑</span>
                            {confirmJob.data.pickupLabel}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            openInGoogleMaps(
                              confirmJob.data.pickupLat,
                              confirmJob.data.pickupLng
                            )
                          }
                          className="p-2 bg-white rounded-lg border border-orange-200 text-orange-500 hover:bg-orange-500 hover:text-white transition-all shadow-sm shrink-0 mt-2"
                        >
                          <Compass className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="h-px bg-orange-100/50" />
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-green-300 uppercase">
                            Drop-off Point
                          </p>
                          <p className="text-xs font-bold text-[#4A2600] leading-relaxed">
                            <span className="text-green-500 mr-1">↓</span>
                            {confirmJob.data.destinationLabel}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            openInGoogleMaps(
                              confirmJob.data.destinationLat,
                              confirmJob.data.destinationLng
                            )
                          }
                          className="p-2 bg-white rounded-lg border border-orange-200 text-orange-500 hover:bg-orange-500 hover:text-white transition-all shadow-sm shrink-0 mt-2"
                        >
                          <Compass className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setConfirmJob(null)}
                  className="flex-1 py-4 rounded-2xl font-black text-gray-400 hover:bg-gray-50 transition-all uppercase text-xs tracking-widest"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAccept}
                  disabled={!canAcceptJobs}
                  className="flex-1 py-4 rounded-2xl bg-[#A03F00] text-white font-black shadow-xl shadow-orange-200 hover:bg-[#803300] transition-all uppercase text-xs tracking-widest disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
                >
                  {!canAcceptJobs ? "Restricted" : "Accept Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

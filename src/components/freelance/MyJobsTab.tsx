import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";

import { ServiceManagementDialog } from "@/components/admin/service-management/ServiceManagementDialog";
import Loading from "@/components/shared/Loading";
import { useUserStore } from "@/stores/useUserStore";
import type {
  DeliveryOrderItem,
  LocationField,
  OngoingServiceJobItem,
  PendingHireRequestItem
} from "@/types/freelance";
import type { Service, ServiceCategory } from "@/types/service";

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
  createMyService: (
    data: Partial<Service> & {
      pickupAddress?: string;
      destinationAddress?: string;
      imageFile?: File | null;
      mapLat?: number;
      mapLng?: number;
    }
  ) => Promise<void>;
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

function MapCenterTracker({
  onCenterChange
}: {
  onCenterChange: (lat: number, lng: number) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      onCenterChange(center.lat, center.lng);
    },
    zoomend: () => {
      const center = map.getCenter();
      onCenterChange(center.lat, center.lng);
    }
  });
  return null;
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
  creating,
  services,
  loadingServices,
  error,
  success
}: MyJobsTabProps) => {
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;
  // Local form state
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [category, setCategory] = useState<ServiceCategory>("DELIVERY");
  const [pickupAddress, setPickupAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mapLat, setMapLat] = useState(13.7563);
  const [mapLng, setMapLng] = useState(100.5018);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [activeLocationField, setActiveLocationField] =
    useState<LocationField>("pickup");
  const [resolvingAddress, setResolvingAddress] = useState(false);

  // Management State
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImageUrl(objectUrl);
  };

  const resolveAddressFromCoordinates = async (
    latitude: number,
    longitude: number
  ) => {
    try {
      setResolvingAddress(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
        { headers: { Accept: "application/json" } }
      );
      if (!response.ok) return "";
      const data = await response.json();
      return data?.display_name || "";
    } catch {
      return "";
    } finally {
      setResolvingAddress(false);
    }
  };

  const applyLocationFromPin = async () => {
    const resolved = await resolveAddressFromCoordinates(mapLat, mapLng);
    const fallbackText = `${mapLat.toFixed(6)}, ${mapLng.toFixed(6)}`;
    const addressText = resolved || fallbackText;
    if (activeLocationField === "pickup") {
      setPickupAddress(addressText);
    } else {
      setDestinationAddress(addressText);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMyService({
      name,
      price,
      category,
      pickupAddress,
      destinationAddress,
      imageFile: selectedFile,
      mapLat,
      mapLng
    });
    // Reset form on success if handle internally or assume success
    setName("");
    setPrice(0);
    setCategory("DELIVERY");
    setPickupAddress("");
    setDestinationAddress("");
    setImageUrl("");
    setSelectedFile(null);
  };

  const mapBounds = {
    left: mapLng - 0.02,
    right: mapLng + 0.02,
    top: mapLat + 0.02,
    bottom: mapLat - 0.02
  };
  const mapLeafletBounds: [[number, number], [number, number]] = [
    [mapBounds.bottom, mapBounds.left],
    [mapBounds.top, mapBounds.right]
  ];

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
      <div className="bg-white rounded-xl border border-orange-100 p-4 shadow-sm">
        <h2 className="text-xl font-black text-[#4A2600] mb-2">My Jobs</h2>
        <p className="text-sm text-gray-600">
          Manage services created and linked to this freelance account below.
        </p>
      </div>

      <section className="bg-white rounded-xl border border-orange-100 p-5 shadow-sm space-y-4">
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
              className="px-3 py-1.5 rounded-md text-xs font-black bg-orange-100 text-[#A03F00] disabled:bg-gray-100 disabled:text-gray-400"
            >
              {refreshingJobBoard ? "Refreshing..." : "Refresh"}
            </button>
            <p className="mt-1 text-[10px] text-gray-500">
              Last updated:{" "}
              {jobBoardLastUpdatedAt
                ? new Date(jobBoardLastUpdatedAt).toLocaleTimeString()
                : "-"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-xl border border-orange-100 p-4 bg-orange-50/40">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h4 className="font-black text-[#4A2600]">
                Pending Hire Requests
              </h4>
              <span className="px-2 py-1 rounded-full bg-orange-100 text-[#A03F00] text-xs font-black">
                {pendingHireRequests.length}
              </span>
            </div>

            {loadingPendingHireRequests ? (
              <Loading fullScreen={false} size={40} />
            ) : pendingHireRequests.length === 0 ? (
              <p className="text-sm text-gray-500">
                No pending hire requests right now.
              </p>
            ) : (
              <div className="space-y-2">
                {pendingHireRequests.map((request) => (
                  <div
                    key={request.orderId}
                    className="bg-white border border-orange-100 rounded-lg p-3 space-y-1"
                  >
                    <p className="font-bold text-[#4A2600] truncate">
                      {request.customerName}
                    </p>
                    <p className="text-xs text-orange-700 truncate">
                      {request.serviceName}
                    </p>
                    <div className="rounded-md border border-orange-100 bg-orange-50 px-2.5 py-2 mt-1">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-orange-700/80 mb-1">
                        Customer Message
                      </p>
                      <p className="text-xs text-[#5D2611] leading-relaxed wrap-break-word">
                        {request.requestMessage}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      Requested:{" "}
                      {request.requestedAt
                        ? new Date(request.requestedAt).toLocaleString()
                        : "-"}
                    </p>
                    <div className="flex items-center justify-end gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => rejectHireRequest(request)}
                        disabled={acceptingHireRoomId === request.orderId}
                        className="px-3 py-1.5 rounded-md bg-red-100 text-red-700 text-xs font-black disabled:bg-gray-100"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => acceptHireRequest(request)}
                        disabled={acceptingHireRoomId === request.orderId}
                        className="px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-black disabled:bg-gray-300"
                      >
                        {acceptingHireRoomId === request.orderId
                          ? "Accepting..."
                          : "Accept Request"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-orange-100 p-4 bg-orange-50/40">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h4 className="font-black text-[#4A2600]">
                Ongoing Service Jobs
              </h4>
              <span className="px-2 py-1 rounded-full bg-orange-100 text-[#A03F00] text-xs font-black">
                {ongoingServiceJobs.length}
              </span>
            </div>

            {loadingOngoingServiceJobs ? (
              <Loading fullScreen={false} size={40} />
            ) : ongoingServiceJobs.length === 0 ? (
              <p className="text-sm text-gray-500">No ongoing jobs yet.</p>
            ) : (
              <div className="space-y-2">
                {ongoingServiceJobs.map((job) => (
                  <div
                    key={job.orderId}
                    className="bg-white border border-orange-100 rounded-lg p-3 space-y-1"
                  >
                    <p className="font-bold text-[#4A2600] truncate">
                      {job.serviceName}
                    </p>
                    <div className="flex justify-between items-start">
                      <p className="text-xs text-orange-700 truncate">
                        Customer: {job.customerName}
                      </p>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${String(job.status || "").toUpperCase() === "COMPLETE" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}
                      >
                        {getStatusLabel(job.status)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Started:{" "}
                      {job.acceptedAt
                        ? new Date(job.acceptedAt).toLocaleString()
                        : "-"}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-orange-50">
                      <p className="font-black text-[#5D2611]">
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
                            className="px-3 py-1.5 rounded-md bg-orange-600 text-white text-xs font-black disabled:bg-orange-300"
                          >
                            {updatingJobId === job.orderId
                              ? "Updating..."
                              : `Mark ${getStatusLabel(getNextStatus(job.status)!)}`}
                          </button>
                        )}
                        <Link
                          to="/chat/$id"
                          params={{ id: job.roomId }}
                          className="px-3 py-1.5 rounded-md bg-[#A03F00] text-white text-xs font-black"
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

      <section className="bg-white rounded-xl border border-orange-100 p-5 shadow-sm space-y-4">
        <h3 className="text-xl font-black text-[#4A2600]">
          Delivery Job Board
        </h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-xl border border-orange-100 p-4 bg-orange-50/40">
            <h4 className="font-black text-[#4A2600] mb-2">Waiting Orders</h4>
            {availableDeliveryOrders.length === 0 ? (
              <p className="text-sm text-gray-500">
                No waiting delivery orders.
              </p>
            ) : (
              <div className="space-y-2">
                {availableDeliveryOrders.map((order) => (
                  <div
                    key={order.orderId}
                    className="bg-white border border-orange-100 rounded-lg p-3 space-y-1"
                  >
                    <p className="text-xs text-gray-500">
                      Order: {order.orderId}
                    </p>
                    <p className="font-bold text-[#4A2600]">
                      {order.productName}
                    </p>
                    <p className="text-sm text-gray-600">
                      Customer: {order.customerName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {order.pickupLabel} → {order.destinationLabel}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="font-black text-[#5D2611]">
                        ฿ {order.price.toFixed(2)}
                      </p>
                      <button
                        type="button"
                        onClick={() => acceptDeliveryOrder(order)}
                        disabled={acceptingOrderId === order.orderId}
                        className="px-3 py-1.5 rounded-md bg-[#A03F00] text-white text-xs font-black"
                      >
                        {acceptingOrderId === order.orderId
                          ? "Accepting..."
                          : "Accept"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-orange-100 p-4 bg-orange-50/40">
            <h4 className="font-black text-[#4A2600] mb-2">
              My Active Deliveries
            </h4>
            {myDeliveryOrders.length === 0 ? (
              <p className="text-sm text-gray-500">No active delivery jobs.</p>
            ) : (
              <div className="space-y-2">
                {myDeliveryOrders.map((order) => (
                  <div
                    key={order.orderId}
                    className="bg-white border border-orange-100 rounded-lg p-3 space-y-1"
                  >
                    <p className="text-xs text-gray-500">
                      Order: {order.orderId}
                    </p>
                    <p className="font-bold text-[#4A2600]">
                      {order.productName}
                    </p>
                    <p className="text-sm text-gray-600">
                      Customer: {order.customerName}
                    </p>
                    <p className="text-xs text-gray-500">
                      Status: {getStatusLabel(order.status)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {order.pickupLabel} → {order.destinationLabel}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="font-black text-[#5D2611]">
                        ฿ {order.price.toFixed(2)}
                      </p>
                      <button
                        type="button"
                        onClick={() => completeDeliveryOrder(order)}
                        disabled={completingOrderId === order.orderId}
                        className="px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-black"
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

      <section className="bg-white rounded-xl border border-orange-100 p-5 shadow-sm">
        <h3 className="text-xl font-black text-[#4A2600]">Create Service</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            placeholder="Service name"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={price}
              onChange={(e) => setPrice(Number(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Price"
              type="number"
              min={0}
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ServiceCategory)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="DELIVERY">DELIVERY</option>
              <option value="SHOPPING">SHOPPING</option>
              <option value="CARE">CARE</option>
            </select>
          </div>
          <input
            value={pickupAddress}
            onChange={(e) => setPickupAddress(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            placeholder="Pickup address"
          />
          <input
            value={destinationAddress}
            onChange={(e) => setDestinationAddress(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            placeholder="Destination address"
          />
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-orange-700/70">
              Upload Service Image
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-orange-100 text-orange-700 font-black text-xs uppercase hover:bg-orange-200 cursor-pointer">
              Upload Image
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Service preview"
                className="w-24 h-24 rounded-md object-cover border border-orange-100"
              />
            )}
          </div>

          <div className="space-y-2 border border-orange-100 rounded-xl p-3 bg-orange-50/50">
            <p className="text-xs font-bold uppercase tracking-wider text-orange-700/70">
              Select Location by Map
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveLocationField("pickup")}
                className={`px-3 py-1.5 rounded-md text-xs font-black uppercase ${activeLocationField === "pickup" ? "bg-[#A03F00] text-white" : "bg-white text-[#4A2600] border border-orange-200"}`}
              >
                Pickup
              </button>
              <button
                type="button"
                onClick={() => setActiveLocationField("destination")}
                className={`px-3 py-1.5 rounded-md text-xs font-black uppercase ${activeLocationField === "destination" ? "bg-[#A03F00] text-white" : "bg-white text-[#4A2600] border border-orange-200"}`}
              >
                Destination
              </button>
              <button
                type="button"
                onClick={() => setMapExpanded((prev) => !prev)}
                className="px-3 py-1.5 rounded-md bg-white text-[#4A2600] border border-orange-200 font-black text-xs uppercase"
              >
                {mapExpanded ? "Collapse Map" : "Expand Map"}
              </button>
            </div>

            <div
              className={`rounded-md overflow-hidden border border-orange-200 relative ${mapExpanded ? "h-95" : "h-48"}`}
            >
              <MapContainer
                bounds={mapLeafletBounds}
                className="w-full h-full z-0"
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapCenterTracker
                  onCenterChange={(lat, lng) => {
                    setMapLat(Number(lat.toFixed(6)));
                    setMapLng(Number(lng.toFixed(6)));
                  }}
                />
              </MapContainer>
              <div className="absolute inset-0 z-1000 pointer-events-none flex items-center justify-center">
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-black/20" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-black/20" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-2 w-4 h-1.5 rounded-full bg-black/20 blur-[1px]" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/90" />
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={applyLocationFromPin}
              disabled={resolvingAddress}
              className="px-3 py-1.5 rounded-md bg-[#A03F00] text-white font-black text-xs uppercase"
            >
              {resolvingAddress
                ? "Resolving..."
                : `Use Pin for ${activeLocationField === "pickup" ? "Pickup" : "Destination"}`}
            </button>
          </div>

          <button
            type="submit"
            disabled={creating || !currentUserId}
            className="px-5 py-2 rounded-md bg-[#A03F00] text-white font-black text-sm disabled:bg-gray-300"
          >
            {creating ? "Creating..." : "Create Service"}
          </button>
        </form>
        {error && (
          <p className="text-sm text-red-600 font-semibold mt-3">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-700 font-semibold mt-3">{success}</p>
        )}
      </section>

      <section className="bg-white rounded-xl border border-orange-100 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl font-black text-[#4A2600]">My Services</h3>
        </div>
        {loadingServices ? (
          <Loading fullScreen={false} size={40} />
        ) : services.length === 0 ? (
          <p className="text-sm text-gray-500 mt-2">No services created yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {services.map((service) => (
              <div
                key={String(service.service_id)}
                className="border border-gray-100 rounded-lg p-3 flex items-center justify-between text-sm"
              >
                <div>
                  <p className="font-bold text-[#4A2600]">{service.name}</p>
                  <p className="text-gray-500">
                    {service.category} • ฿
                    {Number(service.price ?? 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {typeof service.pickup_address === "object"
                      ? `${service.pickup_address?.name || ""} ${service.pickup_address?.address_detail || ""}`.trim() ||
                        service.pickup_address_id
                      : service.pickup_address || service.pickup_address_id}{" "}
                    →{" "}
                    {typeof service.dest_address === "object"
                      ? `${service.dest_address?.name || ""} ${service.dest_address?.address_detail || ""}`.trim() ||
                        service.destination_address_id
                      : service.dest_address || service.destination_address_id}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-xs text-gray-400">
                    {String(service.service_id)}
                  </p>
                  <button
                    onClick={() => setSelectedService(service)}
                    className="px-3 py-1 rounded-md bg-orange-100 text-[#A03F00] text-xs font-black"
                  >
                    Manage
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <ServiceManagementDialog
        key={selectedService?.service_id || "new"}
        isOpen={!!selectedService}
        service={selectedService}
        onClose={() => setSelectedService(null)}
        onUpdate={updateMyService}
        onDelete={deleteMyService}
      />
    </div>
  );
};

export default MyJobsTab;

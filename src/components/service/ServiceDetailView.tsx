import { Link } from "@tanstack/react-router";

import Loading from "@/components/shared/Loading";
import type { PendingHireRoomView, Service } from "@/types/service";
import type { FreelanceProfile } from "@/types/user";

interface ServiceDetailViewProps {
  service: Service;
  creator: FreelanceProfile;
  defaultImage: string;
  defaultDescription: string;
  defaultHireMessage: string;
  openChat: () => Promise<void>;
  startingChat: boolean;
  canTryHire: boolean;
  isHireRequested: boolean;
  hireRequestMessage: string;
  setHireRequestMessage: (val: string) => void;
  sendHireRequest: () => Promise<void>;
  sendingHireRequest: boolean;
  cancelHireRequest: () => Promise<void>;
  cancelingHireRequest: boolean;
  requestLoading: boolean;
  canRequestHire: boolean;
  hasPendingHire: boolean;
  hasAcceptedHire: boolean;
  isServiceOwner: boolean;
  pendingHireRequests: PendingHireRoomView[];
  acceptHireRequest: (request: PendingHireRoomView) => Promise<void>;
  acceptingRequestRoomId: string | null;
  declineHireRequest: (request: PendingHireRoomView) => Promise<void>;
  decliningRequestRoomId: string | null;
  chatError: string | null;
  requestError: string | null;
  activeOrderId: string | null;
  hasActiveOrder: boolean;
}

export function ServiceDetailView({
  service,
  creator,
  defaultImage,
  defaultDescription,
  defaultHireMessage,
  openChat,
  startingChat,
  canTryHire,
  isHireRequested,
  hireRequestMessage,
  setHireRequestMessage,
  sendHireRequest,
  sendingHireRequest,
  cancelHireRequest,
  cancelingHireRequest,
  requestLoading,
  canRequestHire,
  hasPendingHire,
  hasAcceptedHire,
  isServiceOwner,
  pendingHireRequests,
  acceptHireRequest,
  acceptingRequestRoomId,
  declineHireRequest,
  decliningRequestRoomId,
  chatError,
  requestError,
  hasActiveOrder
}: ServiceDetailViewProps) {
  return (
    <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-10">
      <main className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-2xl border border-orange-100 shadow-lg p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
              <img
                src={service.image_url || defaultImage}
                alt={service.name}
                className="w-full aspect-4/3 object-cover rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-4">
              <p className="text-xs font-bold uppercase tracking-widest text-orange-700/70">
                Service Detail
              </p>
              <h1 className="text-4xl font-black text-[#4A2600] leading-tight">
                {service.name}
              </h1>

              <p className="text-lg text-gray-700 leading-relaxed">
                {service.description || defaultDescription}
              </p>

              <div className="space-y-2 text-sm text-gray-700 bg-gray-50 rounded-xl p-4 border border-gray-100">
                {(service.pickup_address || service.pickup_address_id) && (
                  <p>
                    • Pickup:{" "}
                    {typeof service.pickup_address === "object"
                      ? `${service.pickup_address?.name || ""} ${service.pickup_address?.address_detail || ""}`.trim() ||
                        service.pickup_address_id
                      : service.pickup_address || service.pickup_address_id}
                  </p>
                )}
                {(service.dest_address || service.destination_address_id) && (
                  <p>
                    • Destination:{" "}
                    {typeof service.dest_address === "object"
                      ? `${service.dest_address?.name || ""} ${service.dest_address?.address_detail || ""}`.trim() ||
                        service.destination_address_id
                      : service.dest_address || service.destination_address_id}
                  </p>
                )}
                {service.category && <p>• Category: {service.category}</p>}
              </div>

              <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-orange-700/70 mb-2">
                  Created By
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 border border-orange-200 overflow-hidden flex items-center justify-center text-sm font-black text-[#4A2600]">
                    {creator?.avatar_url ? (
                      <img
                        src={creator?.avatar_url || ""}
                        alt={
                          creator?.full_name ||
                          creator?.email ||
                          "Freelance user"
                        }
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (creator?.full_name || creator?.email || "F")
                        .charAt(0)
                        .toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="text-base font-black text-[#4A2600]">
                      {creator?.full_name || creator?.email || "Freelance user"}
                    </p>
                    <p className="text-xs text-orange-900/60 mt-1">
                      {creator?.role
                        ? `Role: ${creator?.role}`
                        : "Role: freelance"}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-5xl font-black text-[#111111]">
                ฿ {service.price}
              </p>

              <div className="pt-2 flex flex-wrap gap-2 items-center">
                {hasActiveOrder ? (
                  <button
                    type="button"
                    onClick={openChat}
                    disabled={startingChat}
                    className={`inline-flex px-5 py-2 rounded-xl text-white font-bold ${startingChat ? "bg-gray-300 cursor-not-allowed" : "bg-[#D35400] hover:bg-[#b34700]"}`}
                  >
                    {startingChat ? "Loading Order..." : "View Order Details"}
                  </button>
                ) : (
                  <>
                    {canTryHire && !isHireRequested && (
                      <div className="w-full">
                        <p className="text-xs font-bold uppercase tracking-wider text-orange-700/70 mb-2">
                          Message to freelancer
                        </p>
                        <textarea
                          value={hireRequestMessage}
                          onChange={(event) =>
                            setHireRequestMessage(event.target.value)
                          }
                          className="w-full border border-orange-200 rounded-xl px-3 py-2 text-sm bg-white min-h-22"
                          placeholder="Write your request message to the freelancer"
                        />
                      </div>
                    )}

                    {canTryHire && !isHireRequested && (
                      <button
                        type="button"
                        onClick={sendHireRequest}
                        disabled={
                          sendingHireRequest || requestLoading || !canRequestHire
                        }
                        className={`inline-flex px-5 py-2 rounded-xl text-white font-bold ${sendingHireRequest || requestLoading || !canRequestHire ? "bg-gray-300 cursor-not-allowed" : "bg-[#D35400] hover:bg-[#b34700]"}`}
                      >
                        {sendingHireRequest
                          ? "Sending Request..."
                          : "I Want to Hire This"}
                      </button>
                    )}

                    {canTryHire && hasPendingHire && (
                      <div className="flex flex-wrap gap-2 items-center">
                        <button
                          type="button"
                          disabled
                          className="inline-flex px-5 py-2 rounded-xl text-white font-bold bg-gray-300 cursor-not-allowed"
                        >
                          Waiting for Freelance Approval
                        </button>
                        <button
                          type="button"
                          onClick={cancelHireRequest}
                          disabled={cancelingHireRequest}
                          className={`inline-flex px-5 py-2 rounded-xl text-white font-bold ${cancelingHireRequest ? "bg-gray-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"}`}
                        >
                          {cancelingHireRequest ? "Canceling..." : "Cancel Request"}
                        </button>
                      </div>
                    )}

                    {canTryHire &&
                      isHireRequested &&
                      !hasPendingHire &&
                      !hasAcceptedHire && (
                        <button
                          type="button"
                          onClick={sendHireRequest}
                          disabled={
                            sendingHireRequest || requestLoading || !canRequestHire
                          }
                          className={`inline-flex px-5 py-2 rounded-xl text-white font-bold ${sendingHireRequest || requestLoading || !canRequestHire ? "bg-gray-300 cursor-not-allowed" : "bg-[#D35400] hover:bg-[#b34700]"}`}
                        >
                          {sendingHireRequest
                            ? "Sending Request..."
                            : "Request Again"}
                        </button>
                      )}
                  </>
                )}

                <Link
                  to="/service"
                  className="inline-flex px-5 py-2 rounded-xl bg-gray-100 text-gray-800 font-bold hover:bg-gray-200"
                >
                  Close
                </Link>
              </div>

              {canTryHire && !canRequestHire && (
                <p className="text-sm text-red-600 font-semibold">
                  This service has no linked freelancer owner yet, so request
                  cannot be sent.
                </p>
              )}

              {isServiceOwner && (
                <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-700/70">
                    Hire Requests
                  </p>

                  {requestLoading && <Loading fullScreen={false} size={40} />}

                  {!requestLoading && pendingHireRequests.length === 0 && (
                    <p className="text-sm text-gray-600">
                      No pending requests right now.
                    </p>
                  )}

                  {!requestLoading &&
                    pendingHireRequests.map((request) => (
                      <div
                        key={request.room_id}
                        className="bg-white border border-orange-100 rounded-xl p-3 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-orange-100 border border-orange-200 overflow-hidden flex items-center justify-center text-xs font-black text-[#4A2600]">
                            {request.customer_avatar_url ? (
                              <img
                                src={request.customer_avatar_url}
                                alt={request.customer_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              request.customer_name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-[#4A2600] truncate">
                              {request.customer_name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {request.request_message || defaultHireMessage}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => acceptHireRequest(request)}
                          disabled={
                            acceptingRequestRoomId === request.room_id ||
                            decliningRequestRoomId === request.room_id
                          }
                          className={`inline-flex px-4 py-1.5 rounded-lg text-white font-bold text-sm ${acceptingRequestRoomId === request.room_id ? "bg-gray-300 cursor-not-allowed" : "bg-[#D35400] hover:bg-[#b34700]"}`}
                        >
                          {acceptingRequestRoomId === request.room_id
                            ? "Accepting..."
                            : "Accept"}
                        </button>

                        <button
                          type="button"
                          onClick={() => declineHireRequest(request)}
                          disabled={
                            decliningRequestRoomId === request.room_id ||
                            acceptingRequestRoomId === request.room_id
                          }
                          className={`inline-flex px-4 py-1.5 rounded-lg text-white font-bold text-sm ${decliningRequestRoomId === request.room_id ? "bg-gray-300 cursor-not-allowed" : "bg-gray-600 hover:bg-gray-700"}`}
                        >
                          {decliningRequestRoomId === request.room_id
                            ? "Declining..."
                            : "Decline"}
                        </button>
                      </div>
                    ))}
                </div>
              )}

              {chatError && (
                <p className="text-sm text-red-600 font-semibold">
                  {chatError}
                </p>
              )}

              {requestError && (
                <p className="text-sm text-red-600 font-semibold">
                  {requestError}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

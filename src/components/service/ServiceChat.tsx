/* eslint-disable @typescript-eslint/no-explicit-any */
import { Send } from "lucide-react";
import type { RefObject } from "react";

import type { ChatMessage, ChatRoomListItem } from "@/types/service";
import Loading from "@/components/shared/Loading";
import { useUserStore } from "@/stores/useUserStore";

interface ServiceChatProps {
  chatRoomSearch: string;
  setChatRoomSearch: (val: string) => void;
  loadingChatRoomList: boolean;
  filteredChatRoomList: ChatRoomListItem[];
  roomId: string | null;
  hashRoomId: string | null;
  setRoomId: (val: string) => void;
  loadRoomParticipants: (roomId: string) => Promise<void>;
  router: any;
  serviceId: string;
  serviceName: string;
  chatCounterpartAvatar: string | null;
  chatCounterpartName: string;
  closeChat: () => void;
  deleteChat: () => Promise<void>;
  deletingChat: boolean;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  chatLoading: boolean;
  messages: ChatMessage[];
  isCurrentUserFreelancerInRoom: boolean;
  extractImageUrl: (msg: string | null | undefined) => string | null;
  chatError: string | null;
  imageInputRef: RefObject<HTMLInputElement | null>;
  onImageSelected: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onPickImage: () => void;
  sending: boolean;
  sendingImage: boolean;
  chatInput: string;
  setChatInput: (val: string) => void;
  sendMessage: (override?: string) => Promise<void>;
  workflowEnabled?: boolean;
  workflowStatusText?: string;
  workflowAgreedPrice?: number | null;
  canPayAndStartWork?: boolean;
  canSubmitWork?: boolean;
  canApproveWork?: boolean;
  canDeclineWork?: boolean;
  canPayForCompletedWork?: boolean;
  onPayAndStartWork?: () => Promise<void>;
  onSubmitWork?: () => Promise<void>;
  onApproveWork?: () => Promise<void>;
  onDeclineWork?: () => Promise<void>;
  onPayForCompletedWork?: () => Promise<void>;
  workflowBusyAction?: "pay" | "submit" | "approve" | "decline" | "complete_pay" | null;
}

export function ServiceChat({
  chatRoomSearch,
  setChatRoomSearch,
  loadingChatRoomList,
  filteredChatRoomList,
  roomId,
  hashRoomId,
  setRoomId,
  loadRoomParticipants,
  serviceName,
  chatCounterpartAvatar,
  chatCounterpartName,
  closeChat,
  messagesContainerRef,
  chatLoading,
  messages,
  isCurrentUserFreelancerInRoom,
  extractImageUrl,
  chatError,
  imageInputRef,
  onImageSelected,
  onPickImage,
  sending,
  sendingImage,
  chatInput,
  setChatInput,
  sendMessage,
  workflowEnabled = false,
  workflowStatusText,
  workflowAgreedPrice = null,
  canPayAndStartWork = false,
  canSubmitWork = false,
  canApproveWork = false,
  canDeclineWork = false,
  canPayForCompletedWork = false,
  onPayAndStartWork,
  onSubmitWork,
  onApproveWork,
  onDeclineWork,
  onPayForCompletedWork,
  workflowBusyAction = null
}: ServiceChatProps) {
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;
  const formatMessageText = (rawMessage: string | null | undefined) => {
    const message = String(rawMessage || "");
    if (!message.startsWith("[SYSTEM_")) return message;

    return message
      .replace(/^\[[^\]]+\]\s*/i, "")
      .replace(/\b(SERVICE|PRICE|CUSTOMER|FREELANCER):[^\s]+/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim() || "System update";
  };

  return (
    <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-6 md:pb-8">
      <main className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-2xl border border-orange-100 shadow-lg p-3 md:p-4 h-[calc(100vh-7.5rem)] md:h-[calc(100vh-8rem)]">
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-3 h-full min-h-0">
            {/* Sidebar */}
            <aside className="hidden md:flex bg-[#F7D9C4] rounded-xl p-3 border border-orange-100 flex-col min-h-0">
              <div className="bg-white rounded-lg px-3 py-2 border border-orange-100 mb-3">
                <input
                  type="text"
                  placeholder="Search Name"
                  value={chatRoomSearch}
                  onChange={(event) => setChatRoomSearch(event.target.value)}
                  className="w-full text-sm outline-none bg-transparent"
                />
              </div>

              <div className="space-y-2 overflow-y-auto min-h-0">
                {loadingChatRoomList && (
                  <Loading fullScreen={false} size={60} />
                )}

                {!loadingChatRoomList && filteredChatRoomList.length === 0 && (
                  <p className="text-xs text-gray-500 px-1">
                    No chat room found.
                  </p>
                )}

                {filteredChatRoomList.map((room) => {
                  const isActiveRoom =
                    String(room.roomId) === String(roomId || hashRoomId || "");

                  const date = new Date(room.lastAt);
                  const timeStr = !isNaN(date.getTime())
                    ? date.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false
                      })
                    : "";

                  return (
                    <button
                      key={room.roomId}
                      type="button"
                      onClick={async () => {
                        setRoomId(room.roomId);
                        if (loadRoomParticipants)
                          await loadRoomParticipants(room.roomId);
                      }}
                      className={`w-full text-left rounded-xl p-3 border transition-all ${isActiveRoom ? "bg-orange-50 border-orange-300 ring-1 ring-orange-200" : "bg-white border-gray-100 hover:border-orange-200 hover:bg-orange-50/30"}`}
                    >
                      <div className="flex items-start gap-3 relative">
                        {/* Circle Avatar on Left */}
                        <div className="w-12 h-12 rounded-full bg-orange-100 border-2 border-white shadow-sm overflow-hidden shrink-0 flex items-center justify-center text-orange-600 font-black">
                          {room.partnerAvatarUrl ? (
                            <img
                              src={room.partnerAvatarUrl}
                              alt={room.partnerName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            (room.partnerName || "U").charAt(0).toUpperCase()
                          )}
                        </div>

                        {/* Name and Last Message in Center */}
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex justify-between items-start gap-2">
                            <p
                              className={`font-bold text-sm truncate ${isActiveRoom ? "text-[#A03F00]" : "text-[#4A2600]"}`}
                            >
                              {room.partnerName}
                            </p>
                            {/* Time on Top-Right */}
                            <span className="text-[10px] text-gray-400 font-medium shrink-0 pt-0.5">
                              {timeStr}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 truncate mt-1 leading-tight">
                            {room.lastMessage || "No messages yet"}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Chat Area */}
            <section className="bg-[#F7D9C4] rounded-xl p-2 md:p-3 border border-orange-100 flex flex-col min-h-0">
              <header className="bg-[#F2A779] rounded-xl p-3 md:p-4 border border-orange-200 mb-2 md:mb-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-orange-100 border border-orange-200 overflow-hidden flex items-center justify-center text-sm font-black text-[#4A2600]">
                    {chatCounterpartAvatar ? (
                      <img
                        src={chatCounterpartAvatar || ""}
                        alt={chatCounterpartName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (chatCounterpartName || "U").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-[#4A2600] truncate">
                      {chatCounterpartName}
                    </p>
                    <p className="text-sm text-[#4A2600]/80 mt-1 truncate">
                      Order: {serviceName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeChat}
                    className="ml-auto inline-flex px-4 py-2 rounded-xl bg-white/90 text-[#D35400] text-xs font-black shadow-sm hover:bg-white transition-all active:scale-95"
                  >
                    Back
                  </button>
                </div>
              </header>

              {workflowEnabled && (
                <div className="mb-2 md:mb-3 rounded-xl border border-orange-200 bg-white px-3 py-2.5 shrink-0">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-wide text-orange-700/80">
                        Work Approval Flow
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5 break-words">
                        {workflowStatusText || "Track work progress, review, and release payment."}
                      </p>
                      {workflowAgreedPrice !== null && (
                        <p className="text-xs text-[#4A2600] font-bold mt-1">
                          Agreed price: ฿ {Number(workflowAgreedPrice || 0).toFixed(2)}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {canPayAndStartWork && onPayAndStartWork && (
                        <button
                          type="button"
                          onClick={() => {
                            onPayAndStartWork();
                          }}
                          disabled={workflowBusyAction !== null}
                          className="px-3 py-1.5 rounded-md bg-[#A03F00] text-white text-xs font-black disabled:bg-gray-300"
                        >
                          {workflowBusyAction === "pay" ? "Processing..." : "Pay & Start Work"}
                        </button>
                      )}

                      {canSubmitWork && onSubmitWork && (
                        <button
                          type="button"
                          onClick={() => {
                            onSubmitWork();
                          }}
                          disabled={workflowBusyAction !== null}
                          className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-black disabled:bg-gray-300"
                        >
                          {workflowBusyAction === "submit" ? "Submitting..." : "Submit Work"}
                        </button>
                      )}

                      {canApproveWork && onApproveWork && (
                        <button
                          type="button"
                          onClick={() => {
                            onApproveWork();
                          }}
                          disabled={workflowBusyAction !== null}
                          className="px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-black disabled:bg-gray-300"
                        >
                          {workflowBusyAction === "approve" ? "Approving..." : "Approve Work"}
                        </button>
                      )}

                      {canDeclineWork && onDeclineWork && (
                        <button
                          type="button"
                          onClick={() => {
                            onDeclineWork();
                          }}
                          disabled={workflowBusyAction !== null}
                          className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-black disabled:bg-gray-300"
                        >
                          {workflowBusyAction === "decline" ? "Sending..." : "Request Revision"}
                        </button>
                      )}

                      {canPayForCompletedWork && onPayForCompletedWork && (
                        <button
                          type="button"
                          onClick={() => {
                            onPayForCompletedWork();
                          }}
                          disabled={workflowBusyAction !== null}
                          className="px-3 py-1.5 rounded-md bg-[#FF914D] text-white text-xs font-black shadow-md hover:bg-[#e67e3d] transition-all disabled:bg-gray-300"
                        >
                          {workflowBusyAction === "complete_pay" ? "Processing..." : "Pay Now"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div
                ref={messagesContainerRef}
                className="bg-[#F3F4F6] rounded-xl border border-orange-100 flex-1 min-h-0 p-3 md:p-4 overflow-y-auto space-y-3"
              >
                {chatLoading && (
                  <Loading fullScreen={false} size={80} />
                )}
                {!chatLoading && messages.length === 0 && (
                  <p className="text-sm text-gray-500">
                    No message yet. Start chatting with the{" "}
                    {isCurrentUserFreelancerInRoom ? "customer" : "freelancer"}.
                  </p>
                )}

                {messages.map((message) => {
                  const isMine =
                    String(message.sender_id) === String(currentUserId);
                  const imageUrl = extractImageUrl(message.message);
                  return (
                    <div
                      key={String(message.id)}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[50%] rounded-2xl px-4 py-2 text-sm border shadow-sm wrap-break-word overflow-hidden ${isMine ? "bg-[#F2A779] border-orange-300 text-[#4A2600]" : "bg-white border-orange-200 text-[#4A2600]"}`}
                      >
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt="Chat image"
                            className="max-h-64 w-auto rounded-lg border border-orange-200 object-contain"
                          />
                        ) : (
                          <p className="whitespace-pre-wrap break-all">
                            {formatMessageText(message.message)}
                          </p>
                        )}
                        <p className="text-[10px] mt-1 opacity-70">
                          {new Date(message.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {chatError && (
                <p className="text-red-600 text-sm font-semibold mt-2">
                  {chatError}
                </p>
              )}

              <div className="mt-2 md:mt-3 flex items-center gap-2 bg-white rounded-xl border border-orange-100 px-3 py-2 shrink-0">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onImageSelected}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={onPickImage}
                  disabled={sending || sendingImage}
                  className={`px-3 py-2 rounded-lg text-sm font-black ${sending || sendingImage ? "bg-gray-100 text-gray-400" : "bg-orange-100 text-[#A03F00] hover:bg-orange-200"}`}
                >
                  {sendingImage ? "Uploading..." : "Image"}
                </button>
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Type your message"
                  className="flex-1 text-sm outline-none bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => {
                    sendMessage();
                  }}
                  disabled={sending || sendingImage || !chatInput.trim()}
                  className={`p-2 rounded-lg text-sm font-black transition-transform active:scale-95 ${sending || sendingImage || !chatInput.trim() ? "bg-gray-100 text-gray-400" : "bg-[#D35400] text-white hover:bg-[#b34700]"}`}
                  aria-label="Send message"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

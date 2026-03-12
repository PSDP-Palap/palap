/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ArrowLeft,
  Clock,
  Image as ImageIcon,
  MessageCircle,
  MoreVertical,
  Send,
  ShieldCheck
} from "lucide-react";
import type { RefObject } from "react";

import Loading from "@/components/shared/Loading";
import { useUserStore } from "@/stores/useUserStore";
import type { ChatMessage, ChatRoomListItem } from "@/types/chat";

interface ChatWindowProps {
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
  workflowBusyAction?:
    | "pay"
    | "submit"
    | "approve"
    | "decline"
    | "complete_pay"
    | null;
}

export function ChatWindow({
  chatRoomSearch,
  setChatRoomSearch,
  loadingChatRoomList,
  filteredChatRoomList,
  roomId,
  hashRoomId,
  setRoomId,
  serviceName,
  chatCounterpartAvatar,
  chatCounterpartName,
  closeChat,
  messagesContainerRef,
  chatLoading,
  messages,
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
  onPayAndStartWork,
  onSubmitWork,
  onApproveWork,
  workflowBusyAction = null
}: ChatWindowProps) {
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;

  const formatMessageText = (
    rawMessage: string | null | undefined,
    type?: string
  ) => {
    const message = String(rawMessage || "");
    const upperType = String(type || "").toUpperCase();
    if (upperType.startsWith("SYSTEM_") || upperType === "SYSTEM") {
      return (
        message
          .replace(/\[SYSTEM_[A-Z_]+\]/g, "")
          .replace(/\b(SERVICE|PRICE|CUSTOMER|FREELANCER|ORDER):[^\s]+/gi, "")
          .replace(/\s{2,}/g, " ")
          .trim() || "System update"
      );
    }
    return message;
  };

  const isSystemMessage = (type?: string) => {
    const upperType = String(type || "").toUpperCase();
    return upperType.startsWith("SYSTEM");
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] pt-20 pb-0 md:pb-4">
      <main className="max-w-7xl mx-auto px-0 md:px-4 h-[calc(100vh-5rem)]">
        <div className="bg-white md:rounded-3xl shadow-2xl shadow-orange-900/5 border border-orange-100 flex overflow-hidden h-full">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:flex w-80 flex-col border-r border-orange-50 bg-[#FDFCFB]">
            <div className="p-6">
              <h2 className="text-xl font-black text-[#4A2600] mb-4">
                Messages
              </h2>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={chatRoomSearch}
                  onChange={(e) => setChatRoomSearch(e.target.value)}
                  className="w-full bg-orange-50/50 border border-orange-100 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 transition-all outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 space-y-1">
              {loadingChatRoomList ? (
                <div className="py-10 flex justify-center">
                  <Loading fullScreen={false} size={40} />
                </div>
              ) : filteredChatRoomList.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-10">
                  No conversations found
                </p>
              ) : (
                filteredChatRoomList.map((room) => {
                  const isActive =
                    String(room.roomId) === String(roomId || hashRoomId || "");
                  return (
                    <button
                      key={room.roomId}
                      onClick={() => setRoomId(room.roomId)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${isActive ? "bg-orange-600 text-[#4A2600] shadow-lg shadow-orange-900/20" : "hover:bg-orange-50 text-[#4A2600]"}`}
                    >
                      <div className="w-12 h-12 rounded-full border-2 border-white shadow-sm overflow-hidden shrink-0 bg-orange-100">
                        {room.partnerAvatarUrl ? (
                          <img
                            src={room.partnerAvatarUrl}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-black">
                            {room.partnerName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex justify-between items-baseline">
                          <p className="font-black text-sm truncate">
                            {room.partnerName}
                          </p>
                          <span
                            className={`text-[9px] font-bold ${isActive ? "text-white/70" : "text-gray-400"}`}
                          >
                            {new Date(room.lastAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>
                        <p
                          className={`text-xs truncate ${isActive ? "text-white/80" : "text-gray-500"}`}
                        >
                          {room.lastMessage}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Chat Main Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            {/* Header */}
            <header className="px-6 py-4 border-b border-orange-50 flex items-center justify-between bg-white z-10 shrink-0">
              <div className="flex items-center gap-4 min-w-0">
                <button
                  onClick={closeChat}
                  className="lg:hidden p-2 -ml-2 text-[#4A2600]"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="relative">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-orange-100 bg-orange-50">
                    {chatCounterpartAvatar ? (
                      <img
                        src={chatCounterpartAvatar}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-[#A03F00]">
                        {chatCounterpartName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-[#4A2600] truncate">
                    {chatCounterpartName}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">
                      {serviceName}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-orange-600 transition-colors">
                  <ShieldCheck className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-orange-600 transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Workflow Bar */}
            {workflowEnabled && (
              <div className="px-6 py-3 bg-orange-50/50 border-b border-orange-100 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in slide-in-from-top duration-300">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-white shadow-sm text-orange-600">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-orange-800 uppercase tracking-[0.15em]">
                      {workflowStatusText || "Order Status"}
                    </p>
                    {workflowAgreedPrice !== null && (
                      <p className="text-xs font-bold text-[#4A2600]">
                        Total: ฿{Number(workflowAgreedPrice).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canPayAndStartWork && onPayAndStartWork && (
                    <button
                      onClick={onPayAndStartWork}
                      disabled={workflowBusyAction !== null}
                      className="px-4 py-2 rounded-xl bg-[#A03F00] text-white text-xs font-black shadow-lg shadow-orange-900/20 hover:bg-[#8a3600] transition-all disabled:opacity-50"
                    >
                      {workflowBusyAction === "pay"
                        ? "Processing..."
                        : "Pay & Start"}
                    </button>
                  )}
                  {canSubmitWork && onSubmitWork && (
                    <button
                      onClick={onSubmitWork}
                      disabled={workflowBusyAction !== null}
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-black shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                      {workflowBusyAction === "submit"
                        ? "Submitting..."
                        : "Submit Work"}
                    </button>
                  )}
                  {canApproveWork && onApproveWork && (
                    <button
                      onClick={onApproveWork}
                      disabled={workflowBusyAction !== null}
                      className="px-4 py-2 rounded-xl bg-green-600 text-white text-xs font-black shadow-lg shadow-green-900/20 hover:bg-green-700 transition-all disabled:opacity-50"
                    >
                      {workflowBusyAction === "approve"
                        ? "Approving..."
                        : "Approve Work"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Messages Area */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FDFCFB]/50"
            >
              {chatLoading && (
                <div className="py-10 flex justify-center">
                  <Loading fullScreen={false} size={60} />
                </div>
              )}
              {!chatLoading && messages.length === 0 && (
                <div className="py-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto">
                    <MessageCircle className="w-10 h-10 text-orange-200" />
                  </div>
                  <p className="text-gray-400 text-sm font-bold">
                    No messages yet. Say hello!
                  </p>
                </div>
              )}

              {messages.map((msg) => {
                const isMine = String(msg.sender_id) === String(currentUserId);
                const isSystem = isSystemMessage(msg.message_type);
                const isImage = msg.message_type === "IMAGE";

                if (isSystem) {
                  return (
                    <div
                      key={String(msg.id)}
                      className="flex justify-center py-2"
                    >
                      <div className="bg-orange-100/50 border border-orange-200/50 px-4 py-1.5 rounded-full">
                        <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest text-center">
                          {formatMessageText(msg.content, msg.message_type)}
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={String(msg.id)}
                    className={`flex ${isMine ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                  >
                    <div
                      className={`flex flex-col max-w-[75%] md:max-w-[60%] ${isMine ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`px-4 py-3 rounded-3xl shadow-sm ${
                          isMine
                            ? "bg-orange-600 text-white rounded-tr-none"
                            : "bg-white border border-orange-50 text-[#4A2600] rounded-tl-none"
                        }`}
                      >
                        {isImage ? (
                          <img
                            src={msg.content}
                            className="max-h-80 w-full object-contain rounded-2xl border border-black/5"
                          />
                        ) : (
                          <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        )}
                      </div>
                      <span className="text-[9px] font-bold text-gray-400 mt-1 px-2">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Area */}
            <div className="px-6 py-4 bg-white border-t border-orange-50 shrink-0">
              {chatError && (
                <p className="text-xs font-black text-red-500 mb-2">
                  {chatError}
                </p>
              )}
              <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onImageSelected}
                  className="hidden"
                />
                <button
                  onClick={onPickImage}
                  disabled={sending || sendingImage}
                  className="p-3 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-orange-600 hover:border-orange-200 transition-all shadow-sm"
                >
                  <ImageIcon className="w-5 h-5" />
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
                  placeholder="Type your message..."
                  className="flex-1 bg-transparent text-sm font-bold outline-none px-2"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={sending || sendingImage || !chatInput.trim()}
                  className="p-3 rounded-xl bg-[#A03F00] text-white shadow-lg shadow-orange-900/20 hover:bg-[#8a3600] transition-all transform active:scale-90 disabled:opacity-50 disabled:grayscale"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

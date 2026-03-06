import { Link } from "@tanstack/react-router";

import Loading from "@/components/shared/Loading";
import type { ConversationItem } from "@/types/chat";

interface MessagesTabProps {
  loadingFreelanceChats: boolean;
  freelanceChats: ConversationItem[];
}

const MessagesTab = ({
  loadingFreelanceChats,
  freelanceChats
}: MessagesTabProps) => {
  return (
    <div className="bg-white rounded-xl border border-orange-100 p-4 shadow-sm min-h-full pb-10 flex flex-col">
      <h2 className="text-xl font-black text-[#4A2600] mb-3 shrink-0">Messages</h2>

      <div className={`flex-1 min-h-0 flex flex-col ${loadingFreelanceChats || freelanceChats.length === 0 ? 'items-center justify-center' : ''}`}>
        {loadingFreelanceChats ? (
          <Loading fullScreen={false} size={60} />
        ) : freelanceChats.length === 0 ? (
          <p className="text-sm text-gray-500">No chat found yet.</p>
        ) : (
          <div className="space-y-2">
            {freelanceChats.map((chat) => (
              <Link
                key={chat.roomId}
                to="/chat/$id"
                params={{ id: chat.roomId }}
                className="block border border-orange-100 rounded-lg p-3 hover:bg-orange-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0 overflow-hidden border border-orange-200">
                      {chat.partnerAvatarUrl ? (
                        <img
                          src={chat.partnerAvatarUrl}
                          alt={chat.partnerName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-orange-600 font-bold">
                          {chat.partnerName.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#4A2600] truncate">
                        {chat.partnerName}
                      </p>
                      <p className="text-xs text-orange-700 truncate">
                        {chat.serviceName}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {chat.lastMessage}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 shrink-0">
                    {chat.lastAt ? new Date(chat.lastAt).toLocaleString() : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesTab;

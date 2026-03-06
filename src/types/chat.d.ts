export type MessageType = "TEXT" | "IMAGE" | "SYSTEM";

export interface ChatMessage {
  id: string;
  room_id: string;
  order_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  created_at: string;
}

export interface ChatRoom {
  id: string;
  order_id: string;
  customer_id: string;
  freelancer_id: string;
  created_by: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationItem {
  key: string;
  roomId: string;
  orderId: string;
  partnerId: string;
  partnerName: string;
  partnerAvatarUrl: string | null;
  customerName: string;
  customerAvatarUrl: string | null;
  freelancerName: string;
  freelancerAvatarUrl: string | null;
  lastMessage: string;
  lastAt: string;
  serviceName: string;
}

export interface FreelanceConversation extends ConversationItem {
  customerId: string;
}

export type MessageType =
  | "TEXT"
  | "IMAGE"
  | "SYSTEM"
  | "SYSTEM_HIRE_REQUEST"
  | "SYSTEM_HIRE_ACCEPTED"
  | "SYSTEM_HIRE_DECLINED"
  | "SYSTEM_HIRE_CANCELED"
  | "SYSTEM_DELIVERY_ROOM_CREATED"
  | "SYSTEM_DELIVERY_ORDER_ACCEPTED"
  | "SYSTEM_DELIVERY_DONE"
  | "SYSTEM_WORK_PRICE"
  | "SYSTEM_WORK_PAYMENT_HELD"
  | "SYSTEM_WORK_SUBMITTED"
  | "SYSTEM_WORK_REVISION"
  | "SYSTEM_WORK_APPROVED"
  | "SYSTEM_WORK_RELEASED";

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

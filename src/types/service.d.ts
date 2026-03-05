export type ServiceCategory = "DELIVERY" | "SHOPPING" | "CARE";

export interface Service {
  id?: string;
  service_id?: string;
  name: string;
  price: number;
  category: ServiceCategory;
  pickup_address?: string | null;
  dest_address?: string | null;
  detail_1?: string | null;
  detail_2?: string | null;
  description?: string | null;
  image_url?: string | null;
  creator_id?: string | null;
  creator_name?: string | null;
  creator_avatar_url?: string | null;
  created_at?: string;
}

export interface ChatRoomListItem {
  roomId: string;
  serviceId: string;
  partnerName: string;
  partnerAvatarUrl: string | null;
  partnerRoleLabel: "Customer" | "Freelancer";
  serviceName: string;
  lastMessage: string;
  lastAt: string;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

export interface PendingHireRoomView {
  room_id: string;
  customer_id: string;
  customer_name: string;
  customer_avatar_url: string | null;
  request_message: string;
}

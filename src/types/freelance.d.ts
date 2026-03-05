export type DashboardTab = "Dashboard" | "My Jobs" | "Messages" | "Earning" | "Account Setting";

export type LocationField = "pickup" | "destination";

export interface FreelanceConversation {
  roomId: string;
  serviceId: string;
  customerId: string;
  customerName: string;
  customerAvatarUrl: string | null;
  serviceName: string;
  lastMessage: string;
  lastAt: string;
}

export interface DeliveryOrderItem {
  orderId: string;
  serviceId: string;
  customerId: string;
  customerName: string;
  productName: string;
  pickupLabel: string;
  destinationLabel: string;
  price: number;
  status: string;
  createdAt: string;
}

export interface PendingHireRequestItem {
  roomId: string;
  serviceId: string;
  customerId: string;
  customerName: string;
  serviceName: string;
  requestMessage: string;
  requestedAt: string;
}

export interface OngoingServiceJobItem {
  roomId: string;
  serviceId: string;
  customerId: string;
  customerName: string;
  serviceName: string;
  acceptedAt: string;
  lastAt: string;
  price: number;
}

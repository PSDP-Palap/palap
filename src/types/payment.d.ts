export type PaymentMethod = "card" | "qr" | "cash";

export interface Address {
  id: string;
  name?: string | null;
  address_detail?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface DeliveryTracking {
  orderId: string;
  serviceId: string | null;
  roomId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  price: number;
  productName: string;
  pickupAddress: Address | null;
  destinationAddress: Address | null;
  freelanceName: string;
  freelanceId: string | null;
  freelanceAvatarUrl: string | null;
}

export interface SavedAddressSnapshot {
  id: string;
  name: string;
  detail: string;
  lat: string;
  lng: string;
}

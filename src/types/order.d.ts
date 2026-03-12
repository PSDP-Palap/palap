import type { Address } from "./address";

export type OrderStatus =
	| "WAITING"
	| "ON_MY_WAY"
	| "IN_SERVICE"
	| "COMPLETE"
	| "REJECT"
	| "CANCEL";

export interface DeliveryTracking {
	orderId: string;
	serviceId: string | null;
	customerId: string | null;
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
	paymentId?: string | null;
}

export interface Order {
	order_id: string;
	customer_id: string;
	freelance_id: string | null;
	pickup_address_id: string | null;
	destination_address_id: string | null;
	price: number;
	status: OrderStatus;
	product_id: string | null;
	service_id: string | null;
	payment_id: string | null;
	created_at: string;
	updated_at: string;
}

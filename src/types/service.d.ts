import type { Address } from "./address";

export type ServiceCategory = "DELIVERY" | "SHOPPING" | "CARE";

export interface Service {
	id?: string;
	service_id?: string;
	name: string;
	price: number;
	category: ServiceCategory;
	pickup_address_id?: string | null;
	destination_address_id?: string | null;
	pickup_address?: Address | null;
	dest_address?: Address | null;
	detail_1?: string | null;
	detail_2?: string | null;
	description?: string | null;
	image_url?: string | null;
	created_by?: string | null;
	creator_id?: string | null;
	creator_name?: string | null;
	creator_avatar_url?: string | null;
	created_at?: string;
}

export interface PendingHireRoomView {
	room_id: string;
	customer_id: string;
	customer_name: string;
	customer_avatar_url: string | null;
	request_message: string;
}
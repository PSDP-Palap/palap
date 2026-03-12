import type { Address } from "./address";

export interface Product {
	id: string; // Map from product_id in db
	product_id: string;
	name: string;
	description?: string;
	price: number;
	qty: number;
	image_url: string | null;
	category?: string | null;
	created_at: string;
	pickup_address_id: string | null;
	pickup_address?: Address | null;
}

export interface CartRow {
	id: string;
	name: string;
	imageUrl: string | null;
	qty: number;
	unitPrice: number;
	subtotal: number;
}

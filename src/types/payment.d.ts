export type PaymentMethod = "CARD" | "QR" | "CASH";

export interface SavedAddressSnapshot {
	id: string;
	name: string;
	detail: string;
	lat: string;
	lng: string;
}

export interface Transaction {
	id: string;
	order_id: string | null;
	customer_id: string | null;
	amount: number;
	payment_method: string;
	status: string;
	created_at: string;
}

export interface FreelanceEarning {
	id: string;
	order_id: string | null;
	freelance_id: string | null;
	amount: number;
	delivery_fee: number;
	status: string;
	paid_at: string | null;
	created_at: string;
}

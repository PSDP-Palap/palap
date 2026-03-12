export interface Address {
	id: string;
	name: string | null;
	address_detail: string | null;
	lat: number | null;
	lng: number | null;
	is_public?: boolean;
	profile_id?: string | null;
	created_at?: string;
}

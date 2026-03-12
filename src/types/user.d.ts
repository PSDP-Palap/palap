export type UserRole = "admin" | "customer" | "freelance";
export type FreelanceStatus = "unverified" | "verified" | "banned";

export type AdminUser = {
	id: string;
	email: string;
	full_name: string;
	user_metadata?: {
		full_name?: string;
		display_name?: string;
	};
};

export type Profile = {
	id: string;
	email: string;
	full_name: string;
	phone_number: string | null;
	role: UserRole;
	created_at: string;
	avatar_url?: string | null;
	address?: string | null;
	addressName?: string | null;
	addressId?: string | null;
	lat?: number | null;
	lng?: number | null;
	earning?: number | null;
};

export interface FreelanceProfile extends Profile {
	job_category: string | null;
	status: FreelanceStatus;
	bio: string | null;
	rating: number;
	updated_at: string;
}

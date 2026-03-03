export type UserRole = "admin" | "customer" | "freelance";

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
    address?: string | null;
};
export type DashboardTab =
	| "Dashboard"
	| "My Jobs"
	| "Messages"
	| "Earning"
	| "Account Setting";

export type LocationField = "pickup" | "destination";

export interface FreelanceConversation {
	roomId: string;
	orderId?: string;
	serviceId?: string;
	customerId: string;
	customerName: string;
	customerAvatarUrl?: string | null;
	serviceName: string;
	lastMessage: string;
	lastAt: string;
}

export interface DeliveryOrderItem {
	orderId: string;
	serviceId?: string;
	customerId: string;
	customerName: string;
	productName: string;
	pickupLabel: string;
	pickupLat?: number | null;
	pickupLng?: number | null;
	destinationLabel: string;
	destinationLat?: number | null;
	destinationLng?: number | null;
	price: number;
	status: string;
	createdAt?: string;
	appointmentAt?: string;
	freelancer_id?: string | null;
	freelance_id?: string | null;
}

export interface PendingHireRequestItem {
	roomId: string;
	orderId: string;
	serviceId: string;
	customerId: string;
	customerName: string;
	serviceName: string;
	requestMessage: string;
	requestedAt?: string;
	appointmentAt?: string;
	locationLabel?: string;
	locationLat?: number | null;
	locationLng?: number | null;
	price?: number;
}

export interface OngoingServiceJobItem {
	roomId: string;
	orderId: string;
	serviceId: string;
	customerId: string;
	customerName: string;
	serviceName: string;
	acceptedAt: string;
	lastAt: string;
	price: number;
	status: string;
	appointmentAt?: string;
}

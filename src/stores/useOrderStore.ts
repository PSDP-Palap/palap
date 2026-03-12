import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { DeliveryTracking } from "@/types/order";
import type { PaymentMethod } from "@/types/payment";

interface OrderStore {
	activeOrderId: string | null;
	activeOrderTracking: DeliveryTracking | null;
	selectedPaymentMethod: PaymentMethod | null;
	ongoingOrderIds: string[];
	setActiveOrderId: (orderId: string | null) => void;
	setActiveOrderTracking: (tracking: DeliveryTracking | null) => void;
	setSelectedPaymentMethod: (method: PaymentMethod | null) => void;
	setOngoingOrderIds: (ids: string[]) => void;
}

export const useOrderStore = create<OrderStore>()(
	persist(
		(set) => ({
			activeOrderId: null,
			activeOrderTracking: null,
			selectedPaymentMethod: null,
			ongoingOrderIds: [],
			setActiveOrderId: (activeOrderId) => set({ activeOrderId }),
			setActiveOrderTracking: (activeOrderTracking) =>
				set({ activeOrderTracking }),
			setSelectedPaymentMethod: (selectedPaymentMethod) =>
				set({ selectedPaymentMethod }),
			setOngoingOrderIds: (ongoingOrderIds) => set({ ongoingOrderIds }),
		}),
		{
			name: "palap-order-store",
		},
	),
);

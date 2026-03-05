import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { PaymentMethod } from "@/types/payment";

interface OrderStore {
  activeOrderId: string | null;
  selectedPaymentMethod: PaymentMethod | null;
  setActiveOrderId: (orderId: string | null) => void;
  setSelectedPaymentMethod: (method: PaymentMethod | null) => void;
}

export const useOrderStore = create<OrderStore>()(
  persist(
    (set) => ({
      activeOrderId: null,
      selectedPaymentMethod: null,
      setActiveOrderId: (activeOrderId) => set({ activeOrderId }),
      setSelectedPaymentMethod: (selectedPaymentMethod) => set({ selectedPaymentMethod }),
    }),
    {
      name: "palap-order-store",
    }
  )
);

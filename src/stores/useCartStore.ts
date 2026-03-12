import { create } from "zustand";
import { persist } from "zustand/middleware";

// store selections for products/services by id and quantity

type CartState = {
	items: Record<string, number>;
	hasHydrated: boolean;
	setHasHydrated: (value: boolean) => void;
	setQuantity: (id: string, qty: number) => void;
	remove: (id: string) => void;
	clear: () => void;
};

export const useCartStore = create<CartState>()(
	persist(
		(set) => ({
			items: {},
			hasHydrated: false,
			setHasHydrated: (value) => set({ hasHydrated: value }),
			setQuantity: (id, qty) =>
				set((state) => {
					const copy = { ...state.items };
					if (qty > 0) {
						copy[id] = qty;
					} else {
						delete copy[id];
					}
					return { items: copy };
				}),
			remove: (id) =>
				set((state) => {
					const copy = { ...state.items };
					delete copy[id];
					return { items: copy };
				}),
			clear: () => set({ items: {} }),
		}),
		{
			name: "palap-cart-store",
			onRehydrateStorage: () => (state) => {
				state?.setHasHydrated(true);
			},
		},
	),
);

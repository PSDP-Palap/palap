import { create } from "zustand";

import type { Address } from "@/types/address";
import type { Product } from "@/types/product";
import supabase from "@/utils/supabase";

type ProductState = {
	products: Product[];
	addresses: Address[];
	isLoading: boolean;
	loadProducts: (limit?: number) => Promise<void>;
	loadAddresses: () => Promise<void>;
	createProduct: (
		product: Omit<
			Product,
			"product_id" | "created_at" | "pickup_address" | "id"
		>,
	) => Promise<void>;
	updateProduct: (
		productId: string,
		partial: Partial<
			Omit<Product, "product_id" | "created_at" | "pickup_address" | "id">
		>,
	) => Promise<void>;
	deleteProduct: (productId: string) => Promise<void>;
	uploadImage: (file: File) => Promise<string>;
	createAddress: (
		address: Omit<Address, "id" | "created_at">,
	) => Promise<Address>;
};

export const useProductStore = create<ProductState>((set, get) => ({
	products: [],
	addresses: [],
	isLoading: false,
	loadProducts: async (limit) => {
		set({ isLoading: true });
		let query = supabase
			.from("products")
			.select(`
        *,
        pickup_address:addresses(*)
      `)
			.order("created_at", { ascending: false });

		if (limit) {
			query = query.limit(limit);
		}

		const { data, error } = await query;

		if (error) {
			console.error("Failed to load products from Supabase", error);
		} else {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			set({ products: (data as any[]) ?? [] });
		}
		set({ isLoading: false });
	},
	loadAddresses: async () => {
		const { data, error } = await supabase
			.from("addresses")
			.select("*")
			.order("name", { ascending: true });

		if (error) {
			console.error("Failed to load addresses", error);
		} else {
			set({ addresses: (data as Address[]) ?? [] });
		}
	},
	createAddress: async (address) => {
		const { data, error } = await supabase
			.from("addresses")
			.insert([address])
			.select()
			.single();

		if (error) {
			console.error("Failed to create address", error);
			throw error;
		}

		set((state) => ({ addresses: [data as Address, ...state.addresses] }));
		return data as Address;
	},
	createProduct: async (product) => {
		const { data, error } = await supabase
			.from("products")
			.insert([product])
			.select(`
        *,
        pickup_address:addresses(*)
      `);

		if (error) {
			console.error("Failed to create product in Supabase", error);
			throw error;
		}

		if (data) {
			set((state) => ({ products: [data[0] as Product, ...state.products] }));
		}
	},
	updateProduct: async (productId, partial) => {
		const { error } = await supabase
			.from("products")
			.update(partial)
			.eq("product_id", productId);

		if (error) {
			console.error("Failed to update product in Supabase", error);
			throw error;
		}

		// Refresh products to get joined address if pickup_address_id changed
		const { loadProducts } = get();
		await loadProducts();
	},
	deleteProduct: async (productId) => {
		const { error } = await supabase
			.from("products")
			.delete()
			.eq("product_id", productId);

		if (error) {
			console.error("Failed to delete product from Supabase", error);
			throw error;
		}

		set((state) => ({
			products: state.products.filter((p) => p.product_id !== productId),
		}));
	},
	uploadImage: async (file: File) => {
		const fileExt = file.name.split(".").pop();
		const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
		const filePath = `${fileName}`;

		const { error: uploadError } = await supabase.storage
			.from("product-images")
			.upload(filePath, file);

		if (uploadError) {
			throw uploadError;
		}

		const { data } = supabase.storage
			.from("product-images")
			.getPublicUrl(filePath);

		return data.publicUrl;
	},
}));

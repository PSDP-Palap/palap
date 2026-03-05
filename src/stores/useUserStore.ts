import type { Session } from "@supabase/supabase-js";
import toast from "react-hot-toast";
import { create } from "zustand";

import type { Profile, UserRole } from "@/types/user";
import supabase from "@/utils/supabase";

const isColumnMissingError = (error: any) => {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  return (
    code === "pgrst204" ||
    code === "42703" ||
    message.includes("column") ||
    message.includes("does not exist") ||
    message.includes("could not find")
  );
};

interface UserState {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;

  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  initialize: () => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  session: null,
  profile: null,
  isLoading: true,
  isInitialized: false,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),

  initialize: async () => {
    if (get().isInitialized) return;

    try {
      // 1. Get initial session
      const { data: { session } } = await supabase.auth.getSession();
      set({ session });

      // 2. If session exists, fetch profile
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        let address = null;
        if (profile?.role === "customer") {
          const { data: customer } = await supabase
            .from("customers")
            .select("address_id")
            .eq("id", profile.id)
            .maybeSingle();

          const addressId = customer?.address_id ? String(customer.address_id) : null;
          if (addressId) {
            const { data: addressRow } = await supabase
              .from("addresses")
              .select("id, name, address_detail")
              .eq("id", addressId)
              .maybeSingle();

            address =
              addressRow?.address_detail ||
              addressRow?.name ||
              null;
          }
        }

        // Merge profile data with role from app_metadata if available
        const roleFromMeta = session.user.app_metadata?.role as UserRole;
        if (profile) {
          set({ profile: { ...profile, role: roleFromMeta || profile.role, address } });
        } else {
          // Fallback if profile doesn't exist yet
          set({
            profile: {
              id: session.user.id,
              email: session.user.email || "",
              full_name: session.user.user_metadata?.full_name || "",
              role: roleFromMeta || "customer",
              phone_number: null,
              created_at: new Date().toISOString(),
              address: null
            } as Profile
          });
        }
      }
    } catch (error) {
      console.error("User initialization failed:", error);
    } finally {
      set({ isLoading: false, isInitialized: true });
    }

    // 3. Setup Auth Listener
    supabase.auth.onAuthStateChange(async (event, session) => {
      set({ session });

      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
        if (!session?.user?.id) {
          set({ profile: null });
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        let address = null;
        if (profile?.role === "customer") {
          const { data: customer } = await supabase
            .from("customers")
            .select("address_id")
            .eq("id", profile.id)
            .maybeSingle();

          const addressId = customer?.address_id ? String(customer.address_id) : null;
          if (addressId) {
            const { data: addressRow } = await supabase
              .from("addresses")
              .select("id, name, address_detail")
              .eq("id", addressId)
              .maybeSingle();

            address =
              addressRow?.address_detail ||
              addressRow?.name ||
              null;
          }
        }

        const roleFromMeta = session?.user?.app_metadata?.role as UserRole;
        if (profile) {
          set({ profile: { ...profile, role: roleFromMeta || profile.role, address } });
        }
      } else if (event === "SIGNED_OUT") {
        set({ profile: null });
      }
    });
  },

  updateProfile: async (updates: Partial<Profile>) => {
    const { profile } = get();
    if (!profile) return { error: "No profile found" };

    const { full_name, phone_number, address } = updates;
    console.log("Updating profile for ID:", profile.id, "with updates:", updates);

    // Update profiles table
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name, phone_number })
      .eq("id", profile.id);

    if (profileError) {
      console.error("Error updating profiles table:", profileError);
      return { error: profileError };
    }

    // Update customers table if role is customer
    if (profile.role === "customer" && address !== undefined) {
      console.log("Updating customers table for ID:", profile.id);

      // Read current linked address id (if any)
      const { data: customerRow } = await supabase
        .from("customers")
        .select("address_id")
        .eq("id", profile.id)
        .maybeSingle();

      const existingAddressId = customerRow?.address_id
        ? String(customerRow.address_id)
        : null;

      let nextAddressId = existingAddressId;

      if (existingAddressId) {
        // Update existing address detail
        const { error: updateAddressError } = await supabase
          .from("addresses")
          .update({ address_detail: address })
          .eq("id", existingAddressId);

        if (updateAddressError && !isColumnMissingError(updateAddressError)) {
          console.error("Error updating addresses table:", updateAddressError);
          return {
            error:
              updateAddressError?.message ||
              "Failed to update customer address information."
          };
        }
      } else {
        // Create a new address row and link it to customer
        const insertCandidates = [
          {
            name: "Home",
            address_detail: address,
            profile_id: profile.id
          },
          {
            name: "Home",
            address_detail: address
          }
        ];

        let createdAddressId: string | null = null;
        let createAddressError: any = null;

        for (const payload of insertCandidates) {
          const result = await supabase
            .from("addresses")
            .insert([payload])
            .select("id")
            .maybeSingle();

          if (!result.error && result.data?.id) {
            createdAddressId = String(result.data.id);
            createAddressError = null;
            break;
          }

          createAddressError = result.error;
          if (result.error && !isColumnMissingError(result.error)) {
            break;
          }
        }

        if (!createdAddressId) {
          console.error("Error creating addresses row:", createAddressError);
          return {
            error:
              createAddressError?.message ||
              "Failed to create customer address information."
          };
        }

        nextAddressId = createdAddressId;
      }

      if (nextAddressId) {
        const customerPayloads = [
          {
            id: profile.id,
            address_id: nextAddressId,
            updated_at: new Date().toISOString()
          },
          {
            id: profile.id,
            address_id: nextAddressId
          }
        ];

        let customerError: any = null;
        let customerUpdated = false;

        for (const payload of customerPayloads) {
          const result = await supabase
            .from("customers")
            .upsert(payload, { onConflict: "id" });

          if (!result.error) {
            customerUpdated = true;
            customerError = null;
            break;
          }

          customerError = result.error;
          if (!isColumnMissingError(result.error)) {
            break;
          }
        }

        if (!customerUpdated && customerError) {
          console.error("Error updating customers table:", customerError);
          return {
            error:
              customerError?.message ||
              "Failed to update customer address information."
          };
        }
      }
    }

    // Update local state
    set({ profile: { ...profile, ...updates } });
    console.log("Profile updated successfully in store and Supabase");
    return { error: null };
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
    toast.success("Signed out successfully");
  }
}));

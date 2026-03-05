import type { Session } from "@supabase/supabase-js";
import toast from "react-hot-toast";
import { create } from "zustand";

import type { Profile, UserRole } from "@/types/user";
import supabase from "@/utils/supabase";

interface UserState {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  lastSessionUserId: string | null; // Track the last user ID we processed

  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  fetchProfile: () => Promise<Profile | null>;
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
  lastSessionUserId: null,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),

  fetchProfile: async () => {
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {
        set({ session: null, profile: null, lastSessionUserId: null });
        return null;
      }

      const userId = session.user.id;
      set({ session, lastSessionUserId: userId });

      const roleFromMeta = session.user.app_metadata?.role as UserRole;

      if (roleFromMeta === "admin") {
        const adminProfile: Profile = {
          id: userId,
          email: session.user.email || "",
          full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.display_name || "Admin",
          role: "admin",
          phone_number: null,
          created_at: session.user.created_at,
          address: null
        };
        set({ profile: adminProfile });
        return adminProfile;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      let address = null;
      if (profile?.role === "customer") {
        const { data: customer } = await supabase
          .from("customers")
          .select("address")
          .eq("id", userId)
          .maybeSingle();
        address = customer?.address;
      }

      const finalProfile = profile
        ? ({
          ...profile,
          role: roleFromMeta || profile.role,
          address
        } as Profile)
        : ({
          id: userId,
          email: session.user.email || "",
          full_name: session.user.user_metadata?.full_name || "",
          role: roleFromMeta || "customer",
          phone_number: null,
          created_at: session.user.created_at || new Date().toISOString(),
          address: null
        } as Profile);

      set({ profile: finalProfile });
      return finalProfile;
    } catch (error) {
      console.error("fetchProfile failed:", error);
      return null;
    }
  },

  initialize: async () => {
    if (get().isInitialized) return;

    try {
      // 1. Initial fetch
      await get().fetchProfile();
    } catch (error) {
      console.error("[UserStore] User initialization failed catastrophically:", error);
    } finally {
      set({ isLoading: false, isInitialized: true });
    }

    // 2. Setup Auth Listener with deduplication logic
    supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUserId = session?.user?.id || null;
      const lastUserId = get().lastSessionUserId;

      // Deduplication Logic:
      // Skip if it's a SIGNED_IN/INITIAL_SESSION event for the same user we already loaded
      // Unless it's a USER_UPDATED event which might mean metadata changed
      if (
        (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
        currentUserId === lastUserId &&
        get().profile
      ) {
        console.log("[UserStore] Skipping redundant auth event");
        set({ session });
        return;
      }

      if (
        event === "SIGNED_IN" ||
        event === "USER_UPDATED" ||
        event === "TOKEN_REFRESHED" ||
        event === "INITIAL_SESSION"
      ) {
        if (session) {
          // If token refreshed but user is the same, just update session object
          if (event === "TOKEN_REFRESHED" && currentUserId === lastUserId) {
            set({ session });
            return;
          }

          await get().fetchProfile();
        }
      } else if (event === "SIGNED_OUT") {
        set({ session: null, profile: null, lastSessionUserId: null });
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

      const { error: customerError } = await supabase
        .from("customers")
        .upsert({
          id: profile.id,
          address,
          updated_at: new Date().toISOString()
        });

      if (customerError) {
        console.error("Error updating customers table:", customerError);
        return { error: customerError };
      }
    }

    // Update local state
    set({ profile: { ...profile, ...updates } });
    console.log("Profile updated successfully in store and Supabase");
    return { error: null };
  },
  signOut: async () => {
    await supabase.auth.signOut();
    
    // Clear cart on logout
    try {
      const { useCartStore } = await import("./useCartStore");
      useCartStore.getState().clear();
    } catch (e) {
      console.error("Failed to clear cart during logout:", e);
    }

    set({ session: null, profile: null, lastSessionUserId: null });
    toast.success("Signed out successfully");
  }
}));
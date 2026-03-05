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

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),

  fetchProfile: async () => {
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      set({ session });

      if (session) {
        const roleFromMeta = session.user.app_metadata?.role as UserRole;

        if (roleFromMeta === "admin") {
          const adminProfile: Profile = {
            id: session.user.id,
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
          .eq("id", session.user.id)
          .single();

        let address = null;
        if (profile?.role === "customer") {
          const { data: customer } = await supabase
            .from("customers")
            .select("address")
            .eq("id", session.user.id)
            .single();
          address = customer?.address;
        }

        const finalProfile = profile
          ? ({
            ...profile,
            role: roleFromMeta || profile.role,
            address
          } as Profile)
          : ({
            id: session.user.id,
            email: session.user.email || "",
            full_name: session.user.user_metadata?.full_name || "",
            role: roleFromMeta || "customer",
            phone_number: null,
            created_at: session.user.created_at || new Date().toISOString(),
            address: null
          } as Profile);

        set({ profile: finalProfile });
        return finalProfile;
      }
      return null;
    } catch (error) {
      console.error("fetchProfile failed:", error);
      return null;
    }
  },

  initialize: async () => {
    if (get().isInitialized) return;

    try {
      console.log("[UserStore] Initializing auth state...");
      // 1. Get initial session with a short timeout to prevent boot hang
      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("[UserStore] getSession error during init:", sessionError);
      }
      
      console.log("[UserStore] Initial session check complete. Has session:", !!session);
      set({ session });

      // 2. If session exists, fetch profile
      if (session) {
        const roleFromMeta = session.user.app_metadata?.role as UserRole;

        // If admin, skip profile fetch and use session data
        if (roleFromMeta === "admin") {
          console.log("[UserStore] Admin detected, skipping profile fetch");
          set({
            profile: {
              id: session.user.id,
              email: session.user.email || "",
              full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.display_name || "Admin",
              role: "admin",
              phone_number: null,
              created_at: session.user.created_at,
              address: null
            } as Profile
          });
        } else {
          console.log("[UserStore] Fetching profile for user:", session.user.id);
          const { data: profile, error: pError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (pError) {
            console.error("[UserStore] Profile fetch error:", pError);
          }

          let address = null;
          if (profile?.role === "customer") {
            const { data: customer } = await supabase
              .from("customers")
              .select("address")
              .eq("id", session.user.id)
              .single();
            address = customer?.address;
          }

          if (profile) {
            set({
              profile: {
                ...profile,
                role: roleFromMeta || profile.role,
                address
              }
            });
          } else {
            console.warn("[UserStore] Profile not found, using fallback");
            // Fallback if profile doesn't exist yet
            set({
              profile: {
                id: session.user.id,
                email: session.user.email || "",
                full_name: session.user.user_metadata?.full_name || "",
                role: roleFromMeta || "customer",
                phone_number: null,
                created_at: session.user.created_at || new Date().toISOString(),
                address: null
              } as Profile
            });
          }
        }
      }
    } catch (error) {
      console.error("[UserStore] User initialization failed catastrophically:", error);
    } finally {
      console.log("[UserStore] Initialization finished.");
      set({ isLoading: false, isInitialized: true });
    }

    // 3. Setup Auth Listener
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[UserStore] Auth state change event:", event);
      set({ session });

      if (
        event === "SIGNED_IN" ||
        event === "USER_UPDATED" ||
        event === "TOKEN_REFRESHED"
      ) {
        if (session) {
          const roleFromMeta = session.user.app_metadata?.role as UserRole;

          if (roleFromMeta === "admin") {
            set({
              profile: {
                id: session.user.id,
                email: session.user.email || "",
                full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.display_name || "Admin",
                role: "admin",
                phone_number: null,
                created_at: session.user.created_at,
                address: null
              } as Profile
            });
          } else {
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .single();

            let address = null;
            if (profile?.role === "customer") {
              const { data: customer } = await supabase
                .from("customers")
                .select("address")
                .eq("id", session.user.id)
                .single();
              address = customer?.address;
            }

            if (profile) {
              set({
                profile: {
                  ...profile,
                  role: roleFromMeta || profile.role,
                  address
                }
              });
            }
          }
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
    set({ session: null, profile: null });
    toast.success("Signed out successfully");
  }
}));
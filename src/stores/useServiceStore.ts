import { create } from "zustand";

import type { Service } from "@/types/service";
import supabase from "@/utils/supabase";

type ServiceState = {
  services: Service[];
  loadServices: (limit?: number) => Promise<void>;
  createService: (service: Omit<Service, "service_id">) => Promise<void>;
  updateService: (
    serviceId: string,
    partial: Partial<Omit<Service, "service_id">>
  ) => Promise<void>;
  deleteService: (serviceId: string) => Promise<void>;
  uploadServiceImage: (file: File) => Promise<string>;
  };

  export const useServiceStore = create<ServiceState>((set) => ({
  services: [],
  loadServices: async (limit?: number) => {
    let query = supabase
      .from("services")
      .select("*")
      .order("created_at", { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to load services from Supabase", error);
      return;
    }

    set({ services: (data as Service[]) ?? [] });
  },
  createService: async (service) => {
    const { data, error } = await supabase
      .from("services")
      .insert([service])
      .select();

    if (error) {
      console.error("Failed to create service in Supabase", error);
      return;
    }

    if (data) {
      set((state) => ({
        services: [data[0] as Service, ...state.services]
      }));
    }
  },
  updateService: async (serviceId, partial) => {
    const { error } = await supabase
      .from("services")
      .update(partial)
      .eq("service_id", serviceId);

    if (error) {
      console.error("Failed to update service in Supabase", error);
      return;
    }

    set((state) => ({
      services: state.services.map((service) =>
        service.service_id === serviceId ? { ...service, ...partial } : service
      )
    }));
  },
  deleteService: async (serviceId) => {
    const { error } = await supabase
      .from("services")
      .delete()
      .eq("service_id", serviceId);

    if (error) {
      console.error("Failed to delete service from Supabase", error);
      return;
    }

    set((state) => ({
      services: state.services.filter(
        (service) => service.service_id !== serviceId
      )
    }));
  },
  uploadServiceImage: async (file: File) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("service_images")
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("service_images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
  }));



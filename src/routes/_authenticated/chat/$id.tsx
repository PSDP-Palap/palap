/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChatWindow } from "@/components/chat/ChatWindow";
import Loading from "@/components/shared/Loading";
import { useUserStore } from "@/stores/useUserStore";
import type { ChatRoomListItem } from "@/types/service";
import { cleanPreviewMessage, withTimeout } from "@/utils/helpers";
import supabase, { isUuidLike } from "@/utils/supabase";

export const Route = createFileRoute("/_authenticated/chat/$id")({
  component: ChatRouteComponent,
  pendingComponent: () => <Loading />
});

const resolveCustomerId = (room: any) =>
  String(room?.customer_id ?? room?.user_id ?? "");

const resolveFreelancerId = (room: any) =>
  String(room?.freelancer_id ?? room?.freelance_id ?? "");

const resolveOrderCustomerId = (order: any) =>
  String(order?.customer_id ?? order?.user_id ?? "");

const resolveOrderFreelancerId = (order: any) =>
  String(order?.freelancer_id ?? order?.freelance_id ?? "");

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

const getTagValue = (message: string, tag: string) => {
  const match = message.match(new RegExp(`${tag}:([^\\s]+)`, "i"));
  return match?.[1] ? String(match[1]) : "";
};

const getPriceFromMessage = (message: string) => {
  const raw = getTagValue(message, "PRICE");
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
};

function ChatRouteComponent() {
  const { id: roomId } = Route.useParams();
  const router = useRouter();
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;

  const [orderId, setOrderId] = useState<string | null>(null);
  const [activeRoomParticipants, setActiveRoomParticipants] = useState<{
    customer?: string;
    freelancer?: string;
  } | null>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const [chatInput, setChatInput] = useState("");

  const [chatRoomList, setChatRoomList] = useState<ChatRoomListItem[]>([]);
  const [loadingChatRoomList, setLoadingChatRoomList] = useState(false);
  const [chatRoomSearch, setChatRoomSearch] = useState("");

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const [otherParticipant, setOtherParticipant] = useState<any>(null);
  const [serviceMeta, setServiceMeta] = useState<{
    serviceId: string;
    name: string;
    category: string;
    price: number;
  } | null>(null);
  const [workflowBusyAction, setWorkflowBusyAction] = useState<
    "pay" | "submit" | "approve" | "decline" | null
  >(null);

  const loadRoomInfo = useCallback(async () => {
    if (!roomId || !currentUserId) return;

    try {
      setChatLoading(true);
      // Increase timeout to 30s
      const { data: room, error: roomErr } = await withTimeout(
        supabase.from("chat_rooms").select("*").eq("id", roomId).maybeSingle(),
        30000
      );

      if (roomErr) throw roomErr;
      if (!room) throw new Error("Chat room not found");

      setOrderId(room.order_id);
      const roomOrderId = String(room.order_id || "");
      let customerId = resolveCustomerId(room);
      let freelancerId = resolveFreelancerId(room);

      if (room.order_id && (!customerId || !freelancerId)) {
        const { data: orderRow } = await supabase
          .from("orders")
          .select("order_id, customer_id, freelance_id")
          .eq("order_id", String(room.order_id))
          .maybeSingle();

        if (orderRow) {
          customerId = customerId || resolveOrderCustomerId(orderRow);
          freelancerId = freelancerId || resolveOrderFreelancerId(orderRow);
        }
      }

      setActiveRoomParticipants({
        customer: customerId,
        freelancer: freelancerId
      });

      if (roomOrderId) {
        const { data: serviceRow } = await supabase
          .from("services")
          .select("service_id, name, category, price")
          .eq("service_id", roomOrderId)
          .maybeSingle();

        if (serviceRow) {
          setServiceMeta({
            serviceId: String((serviceRow as any).service_id || roomOrderId),
            name: String((serviceRow as any).name || "Service"),
            category: String((serviceRow as any).category || ""),
            price: Number((serviceRow as any).price || 0)
          });
        } else {
          setServiceMeta(null);
        }
      } else {
        setServiceMeta(null);
      }

      const otherId =
        String(customerId) === String(currentUserId)
          ? freelancerId
          : customerId;

      if (otherId) {
        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", otherId)
          .maybeSingle();
        setOtherParticipant(p);
      }
    } catch (err: any) {
      setChatError(err.message);
    } finally {
      setChatLoading(false);
    }
  }, [roomId, currentUserId]);

  useEffect(() => {
    loadRoomInfo();
  }, [loadRoomInfo]);

  useEffect(() => {
    if (!roomId || !currentUserId) return;

    const fetchMessages = async () => {
      try {
        const { data, error: msgError } = await withTimeout(
          supabase
            .from("chat_messages")
            .select("id, room_id, sender_id, content, created_at, message_type")
            .eq("room_id", roomId)
            .order("created_at", { ascending: true }),
          30000
        );

        if (msgError) throw msgError;
        setMessages(data || []);
      } catch (e: any) {
        setChatError(e.message);
      }
    };

    fetchMessages();

    const subscription = supabase
      .channel(`room_${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === payload.new.id);
            if (exists) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [roomId, currentUserId]);

  const lastFetchRoomsTimeRef = useRef(0);

  useEffect(() => {
    if (!currentUserId) return;

    const fetchRooms = async () => {
      const now = Date.now();
      if (now - lastFetchRoomsTimeRef.current < 2000) return; // Throttle to every 2s

      try {
        setLoadingChatRoomList(true);
        lastFetchRoomsTimeRef.current = now;

        let resolvedRooms: any[] | null = null;
        let resolvedRoomError: any = null;

        const roomQueryVariants = [
          {
            select: "id, order_id, customer_id, freelancer_id, last_message_at",
            filter: `customer_id.eq.${currentUserId},freelancer_id.eq.${currentUserId}`
          },
          {
            select: "id, order_id, customer_id, freelance_id, last_message_at",
            filter: `customer_id.eq.${currentUserId},freelance_id.eq.${currentUserId}`
          },
          {
            select: "id, order_id, user_id, freelancer_id, last_message_at",
            filter: `user_id.eq.${currentUserId},freelancer_id.eq.${currentUserId}`
          },
          {
            select: "id, order_id, user_id, freelance_id, last_message_at",
            filter: `user_id.eq.${currentUserId},freelance_id.eq.${currentUserId}`
          }
        ];

        for (const variant of roomQueryVariants) {
          const result = await withTimeout(
            supabase
              .from("chat_rooms")
              .select(variant.select)
              .or(variant.filter)
              .order("last_message_at", { ascending: false })
              .limit(50),
            30000
          );

          if (result.error) {
            resolvedRoomError = result.error;
            if (!isColumnMissingError(result.error)) {
              break;
            }
            continue;
          }

          const candidateRows = (result.data as any[]) ?? [];
          if (candidateRows.length === 0) {
            resolvedRooms = [];
            resolvedRoomError = null;
            break;
          }

          const hasUsableParticipants = candidateRows.some((room) => {
            const customerId = resolveCustomerId(room);
            const freelancerId = resolveFreelancerId(room);
            if (!customerId || !freelancerId) return false;
            return (
              String(customerId) === String(currentUserId) ||
              String(freelancerId) === String(currentUserId)
            );
          });

          if (hasUsableParticipants) {
            resolvedRooms = candidateRows;
            resolvedRoomError = null;
            break;
          }
        }

        if (resolvedRoomError) throw resolvedRoomError;

        if (resolvedRooms && resolvedRooms.length > 0) {
          const roomIds = resolvedRooms.map((r) => r.id);
          const orderIds = Array.from(
            new Set(
              resolvedRooms.map((r) => String(r.order_id || "")).filter(Boolean)
            )
          );

          const { data: orderRows } = orderIds.length
            ? await supabase
                .from("orders")
                .select("order_id, customer_id, freelance_id")
                .in("order_id", orderIds)
            : { data: [] as any[] };

          const orderMap = new Map(
            ((orderRows as any[]) ?? []).map((row: any) => [
              String(row.order_id || ""),
              row
            ])
          );

          const partnerIds = resolvedRooms
            .map((r) => {
              const orderRow = orderMap.get(String(r.order_id || ""));
              const customerId =
                resolveCustomerId(r) || resolveOrderCustomerId(orderRow);
              const freelancerId =
                resolveFreelancerId(r) || resolveOrderFreelancerId(orderRow);

              return String(customerId) === String(currentUserId)
                ? freelancerId
                : customerId;
            })
            .filter((id) => id && isUuidLike(String(id)));

          const [{ data: profiles }, { data: latestMessages }] =
            await Promise.all([
              partnerIds.length > 0
                ? supabase.from("profiles").select("*").in("id", partnerIds)
                : Promise.resolve({ data: [] as any[] }),
              supabase
                .from("chat_messages")
                .select("room_id, content, created_at, sender_id, message_type")
                .in("room_id", roomIds)
                .order("created_at", { ascending: false })
            ]);

          const pMap = new Map((profiles || []).map((p) => [String(p.id), p]));
          const msgMap = new Map();
          const latestNonSelfSenderByRoom = new Map<string, string>();
          (latestMessages || []).forEach((m) => {
            if (!msgMap.has(m.room_id)) msgMap.set(m.room_id, m);
            const senderId = String((m as any).sender_id || "");
            if (
              senderId &&
              senderId !== String(currentUserId) &&
              !latestNonSelfSenderByRoom.has(String(m.room_id))
            ) {
              latestNonSelfSenderByRoom.set(String(m.room_id), senderId);
            }
          });

          const extraPartnerIds = Array.from(
            latestNonSelfSenderByRoom.values()
          );
          if (extraPartnerIds.length > 0) {
            const missingPartnerIds = extraPartnerIds.filter(
              (id) => id && isUuidLike(String(id)) && !pMap.has(String(id))
            );

            if (missingPartnerIds.length > 0) {
              const { data: extraProfiles } = await supabase
                .from("profiles")
                .select("*")
                .in("id", missingPartnerIds);

              (extraProfiles || []).forEach((profile: any) => {
                pMap.set(String(profile.id), profile);
              });
            }
          }

          const list: ChatRoomListItem[] = resolvedRooms.map((r: any) => {
            const orderRow = orderMap.get(String(r.order_id || ""));
            const customerId =
              resolveCustomerId(r) || resolveOrderCustomerId(orderRow);
            const freelancerId =
              resolveFreelancerId(r) || resolveOrderFreelancerId(orderRow);
            const isCustomer = customerId === String(currentUserId);
            let partnerId = isCustomer ? freelancerId : customerId;
            if (!partnerId || String(partnerId) === String(currentUserId)) {
              partnerId =
                latestNonSelfSenderByRoom.get(String(r.id)) || partnerId;
            }
            const p = pMap.get(String(partnerId));
            const last = msgMap.get(r.id);

            const lastTxt =
              last?.message_type === "IMAGE"
                ? "Image"
                : cleanPreviewMessage(last?.content, last?.message_type);

            return {
              roomId: r.id,
              serviceId: r.order_id, // Map order_id to serviceId for component compatibility
              partnerName: p?.full_name || p?.email || "User",
              partnerAvatarUrl:
                p?.avatar_url || p?.image_url || p?.photo_url || null,
              partnerRoleLabel: isCustomer ? "Freelancer" : "Customer",
              serviceName: "Order Chat",
              lastMessage: lastTxt,
              lastAt:
                last?.created_at ||
                r.last_message_at ||
                new Date().toISOString()
            };
          });

          setChatRoomList(list);
        } else {
          setChatRoomList([]);
        }
      } catch (e) {
        console.error("[Chat] Load rooms list error", e);
      } finally {
        setLoadingChatRoomList(false);
      }
    };

    fetchRooms();
  }, [currentUserId]);

  const sendMessage = useCallback(
    async (overrideMessage?: string, forceType?: string) => {
      const text = (overrideMessage || chatInput).trim();
      if (!roomId || !currentUserId || !text || !orderId) return;

      try {
        setSending(true);

        const mType = forceType || "TEXT";
        const finalContent = text;

        const { data: newMessage, error: sendError } = await withTimeout(
          supabase
            .from("chat_messages")
            .insert({
              room_id: roomId,
              order_id: orderId,
              sender_id: currentUserId,
              content: finalContent,
              message_type: mType
            })
            .select()
            .single(),
          30000
        );

        if (sendError) throw sendError;

        if (newMessage) {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage];
          });
        }

        if (!overrideMessage) setChatInput("");
      } catch (e: any) {
        setChatError(e.message);
      } finally {
        setSending(false);
      }
    },
    [chatInput, roomId, currentUserId, orderId]
  );

  const onImageSelected = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !roomId || !currentUserId || !orderId) return;

    try {
      setSendingImage(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `chat_${roomId}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("chat-images")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      const { data: newMessage, error: msgError } = await supabase
        .from("chat_messages")
        .insert({
          room_id: roomId,
          order_id: orderId,
          sender_id: currentUserId,
          content: publicUrl,
          message_type: "IMAGE"
        })
        .select()
        .single();

      if (msgError) throw msgError;

      if (newMessage) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === newMessage.id);
          if (exists) return prev;
          return [...prev, newMessage];
        });
      }
    } catch (e: any) {
      setChatError(e.message);
    } finally {
      setSendingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const filteredChatRoomList = chatRoomList.filter((item) => {
    const s = chatRoomSearch.trim().toLowerCase();
    return (
      !s ||
      item.partnerName.toLowerCase().includes(s) ||
      item.serviceName.toLowerCase().includes(s)
    );
  });

  const syncedChatRoomList = filteredChatRoomList.map((item) => {
    const isActive = String(item.roomId) === String(roomId || "");
    if (!isActive || !otherParticipant) return item;

    return {
      ...item,
      partnerName:
        otherParticipant.full_name ||
        otherParticipant.email ||
        item.partnerName,
      partnerAvatarUrl:
        otherParticipant.avatar_url ||
        otherParticipant.image_url ||
        otherParticipant.photo_url ||
        item.partnerAvatarUrl ||
        null
    };
  });

  const isCurrentUserFreelancerInRoom = activeRoomParticipants
    ? String(currentUserId) === String(activeRoomParticipants.freelancer)
    : false;

  const serviceWorkflow = useMemo(() => {
    const hasHireAccepted = messages.some((row: any) => {
      const mType = String(row?.message_type || "");
      const content = String(row?.content || "");
      return (
        mType === "SYSTEM_HIRE_ACCEPTED" ||
        (mType === "SYSTEM" && content.startsWith("[SYSTEM_HIRE_ACCEPTED]"))
      );
    });
    const isDeliveryFlow = messages.some((row: any) => {
      const mType = String(row?.message_type || "");
      const content = String(row?.content || "");
      return (
        mType === "SYSTEM_DELIVERY_ORDER_ACCEPTED" ||
        mType === "SYSTEM_DELIVERY_ROOM_CREATED" ||
        mType === "SYSTEM_DELIVERY_DONE" ||
        (mType === "SYSTEM" &&
          (content.startsWith("[SYSTEM_DELIVERY_ORDER_ACCEPTED]") ||
            content.startsWith("[SYSTEM_DELIVERY_ROOM_CREATED]") ||
            content.startsWith("[SYSTEM_DELIVERY_DONE]")))
      );
    });
    const isDeliverySession =
      String(serviceMeta?.category || "").toUpperCase() === "DELIVERY";

    const enabled =
      !!serviceMeta && !isDeliveryFlow && !isDeliverySession && hasHireAccepted;

    if (!enabled) {
      return {
        enabled: false,
        agreedPrice: null as number | null,
        statusText: "",
        canPayAndStartWork: false,
        canSubmitWork: false,
        canApproveWork: false,
        canDeclineWork: false
      };
    }

    let agreedPrice = Number(serviceMeta?.price || 0);
    let paymentHeldAt = 0;
    let latestSubmittedAt = 0;
    let latestRevisionAt = 0;
    let latestApprovedAt = 0;
    let latestReleasedAt = 0;

    (messages as any[]).forEach((row: any) => {
      const content = String(row?.content || "");
      const mType = String(row?.message_type || "");
      const createdAt = Date.parse(String(row?.created_at || ""));
      const ts = Number.isFinite(createdAt) ? createdAt : 0;

      const isType = (type: string) =>
        mType === type || (mType === "SYSTEM" && content.startsWith(`[${type}]`));

      if (isType("SYSTEM_WORK_PRICE")) {
        const parsedPrice = getPriceFromMessage(content);
        if (parsedPrice > 0) {
          agreedPrice = parsedPrice;
        }
      }
      if (isType("SYSTEM_WORK_PAYMENT_HELD")) {
        paymentHeldAt = Math.max(paymentHeldAt, ts);
      }
      if (isType("SYSTEM_WORK_SUBMITTED")) {
        latestSubmittedAt = Math.max(latestSubmittedAt, ts);
      }
      if (isType("SYSTEM_WORK_REVISION")) {
        latestRevisionAt = Math.max(latestRevisionAt, ts);
      }
      if (isType("SYSTEM_WORK_APPROVED")) {
        latestApprovedAt = Math.max(latestApprovedAt, ts);
      }
      if (isType("SYSTEM_WORK_RELEASED")) {
        latestReleasedAt = Math.max(latestReleasedAt, ts);
      }
    });

    const paymentHeld = paymentHeldAt > 0;
    const isReleased = latestReleasedAt > 0;
    const latestReviewAt = Math.max(
      latestRevisionAt,
      latestApprovedAt,
      latestReleasedAt
    );
    const awaitingCustomerReview =
      latestSubmittedAt > 0 && latestSubmittedAt > latestReviewAt;

    let statusText = "Customer should pay and start this work.";
    if (paymentHeld && !awaitingCustomerReview && !isReleased) {
      statusText = "Payment is held. Freelancer can submit work for review.";
    }
    if (awaitingCustomerReview && !isReleased) {
      statusText =
        "Work submitted. Waiting for customer approval or revision request.";
    }
    if (latestRevisionAt > latestSubmittedAt && !isReleased) {
      statusText =
        "Customer requested revision. Freelancer should submit an updated result.";
    }
    if (isReleased) {
      statusText = "Work approved. Payment released to freelancer earning.";
    }

    return {
      enabled,
      agreedPrice,
      statusText,
      canPayAndStartWork:
        !isCurrentUserFreelancerInRoom && !paymentHeld && !isReleased,
      canSubmitWork:
        isCurrentUserFreelancerInRoom &&
        paymentHeld &&
        !isReleased &&
        !awaitingCustomerReview,
      canApproveWork:
        !isCurrentUserFreelancerInRoom &&
        paymentHeld &&
        !isReleased &&
        awaitingCustomerReview,
      canDeclineWork:
        !isCurrentUserFreelancerInRoom &&
        paymentHeld &&
        !isReleased &&
        awaitingCustomerReview
    };
  }, [messages, serviceMeta, isCurrentUserFreelancerInRoom]);

  const sendSystemWorkflowMessage = useCallback(
    async (message: string, type: string) => {
      await sendMessage(message, type);
      window.dispatchEvent(new Event("service-chat-updated"));
    },
    [sendMessage]
  );

  const payAndStartWork = useCallback(async () => {
    if (!serviceWorkflow.enabled || !serviceMeta || !activeRoomParticipants)
      return;
    const agreedPrice = Number(serviceWorkflow.agreedPrice || 0);
    if (agreedPrice <= 0) {
      setChatError("Agreed price must be greater than 0.");
      return;
    }

    try {
      setWorkflowBusyAction("pay");
      const serviceId = serviceMeta.serviceId;
      const customerId = String(activeRoomParticipants.customer || "");
      const freelancerId = String(activeRoomParticipants.freelancer || "");
      const agreedText = agreedPrice.toFixed(2);

      await sendSystemWorkflowMessage(
        `SERVICE:${serviceId} PRICE:${agreedText}`,
        "SYSTEM_WORK_PRICE"
      );
      await sendSystemWorkflowMessage(
        `SERVICE:${serviceId} PRICE:${agreedText} CUSTOMER:${customerId} FREELANCER:${freelancerId} Payment held and work started.`,
        "SYSTEM_WORK_PAYMENT_HELD"
      );
    } finally {
      setWorkflowBusyAction(null);
    }
  }, [
    serviceWorkflow,
    serviceMeta,
    activeRoomParticipants,
    sendSystemWorkflowMessage
  ]);

  const submitWork = useCallback(async () => {
    if (!serviceWorkflow.enabled || !serviceMeta || !currentUserId) return;

    try {
      setWorkflowBusyAction("submit");
      await sendSystemWorkflowMessage(
        `SERVICE:${serviceMeta.serviceId} FREELANCER:${currentUserId} Submitted work for customer review.`,
        "SYSTEM_WORK_SUBMITTED"
      );
    } finally {
      setWorkflowBusyAction(null);
    }
  }, [serviceWorkflow, serviceMeta, currentUserId, sendSystemWorkflowMessage]);

  const requestRevision = useCallback(async () => {
    if (!serviceWorkflow.enabled || !serviceMeta || !currentUserId) return;

    try {
      setWorkflowBusyAction("decline");
      await sendSystemWorkflowMessage(
        `SERVICE:${serviceMeta.serviceId} CUSTOMER:${currentUserId} Customer requested revision. Please continue and submit again.`,
        "SYSTEM_WORK_REVISION"
      );
    } finally {
      setWorkflowBusyAction(null);
    }
  }, [serviceWorkflow, serviceMeta, currentUserId, sendSystemWorkflowMessage]);

  const approveWork = useCallback(async () => {
    if (
      !serviceWorkflow.enabled ||
      !serviceMeta ||
      !currentUserId ||
      !activeRoomParticipants
    )
      return;

    const agreedPrice = Number(serviceWorkflow.agreedPrice || 0);
    if (agreedPrice <= 0) {
      setChatError("Agreed price must be greater than 0.");
      return;
    }

    try {
      setWorkflowBusyAction("approve");
      const serviceId = serviceMeta.serviceId;
      const customerId = String(activeRoomParticipants.customer || "");
      const freelancerId = String(activeRoomParticipants.freelancer || "");
      const agreedText = agreedPrice.toFixed(2);

      await sendSystemWorkflowMessage(
        `SERVICE:${serviceId} CUSTOMER:${currentUserId} Work approved by customer.`,
        "SYSTEM_WORK_APPROVED"
      );
      await sendSystemWorkflowMessage(
        `SERVICE:${serviceId} PRICE:${agreedText} CUSTOMER:${customerId} FREELANCER:${freelancerId} Payment released to freelancer earning.`,
        "SYSTEM_WORK_RELEASED"
      );
    } finally {
      setWorkflowBusyAction(null);
    }
  }, [
    serviceWorkflow,
    serviceMeta,
    currentUserId,
    activeRoomParticipants,
    sendSystemWorkflowMessage
  ]);

  return (
    <ChatWindow
      chatRoomSearch={chatRoomSearch}
      setChatRoomSearch={setChatRoomSearch}
      loadingChatRoomList={loadingChatRoomList}
      filteredChatRoomList={syncedChatRoomList}
      roomId={roomId}
      hashRoomId={null}
      setRoomId={(rid) =>
        router.navigate({ to: "/chat/$id", params: { id: rid } })
      }
      loadRoomParticipants={async () => {}}
      router={router}
      serviceId={orderId || ""}
      serviceName={orderId || "Order"}
      chatCounterpartAvatar={
        otherParticipant?.avatar_url ||
        otherParticipant?.image_url ||
        otherParticipant?.photo_url ||
        null
      }
      chatCounterpartName={
        otherParticipant?.full_name || otherParticipant?.email || "User"
      }
      closeChat={() => router.navigate({ to: "/" })}
      messagesContainerRef={messagesContainerRef}
      chatLoading={chatLoading}
      messages={messages}
      isCurrentUserFreelancerInRoom={isCurrentUserFreelancerInRoom}
      chatError={chatError}
      imageInputRef={imageInputRef}
      onImageSelected={onImageSelected}
      onPickImage={() => imageInputRef.current?.click()}
      sending={sending}
      sendingImage={sendingImage}
      chatInput={chatInput}
      setChatInput={setChatInput}
      sendMessage={sendMessage}
      workflowEnabled={serviceWorkflow.enabled}
      workflowStatusText={serviceWorkflow.statusText}
      workflowAgreedPrice={serviceWorkflow.agreedPrice}
      canPayAndStartWork={serviceWorkflow.canPayAndStartWork}
      canSubmitWork={serviceWorkflow.canSubmitWork}
      canApproveWork={serviceWorkflow.canApproveWork}
      canDeclineWork={serviceWorkflow.canDeclineWork}
      onPayAndStartWork={payAndStartWork}
      onSubmitWork={submitWork}
      onApproveWork={approveWork}
      onDeclineWork={requestRevision}
      workflowBusyAction={workflowBusyAction}
      deleteChat={function (): Promise<void> {
        throw new Error("Function not implemented.");
      }}
      deletingChat={false}
    />
  );
}

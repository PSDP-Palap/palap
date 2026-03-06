import { createFileRoute } from "@tanstack/react-router";

import AccountSettingTab from "@/components/freelance/AccountSettingTab";
import { useUserStore } from "@/stores/useUserStore";

export const Route = createFileRoute("/_freelance/freelance/account")({
  component: AccountRoute
});

function AccountRoute() {
  const { profile, session } = useUserStore();

  return <AccountSettingTab profile={profile} session={session} />;
}

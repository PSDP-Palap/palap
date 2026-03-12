import { createFileRoute } from "@tanstack/react-router";

import EditProfilePage from "@/components/profile/EditProfilePage";

export const Route = createFileRoute("/_authenticated/edit-profile")({
	component: EditProfilePage,
});

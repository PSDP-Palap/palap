import { createFileRoute } from "@tanstack/react-router";

import LoginForm from "@/components/auth/LoginForm";
import LoginHeader from "@/components/auth/LoginHeader";

export const Route = createFileRoute("/sign-in")({
  component: () => (
    <div className="relative min-h-screen">
      <div className="absolute w-full h-full bg-[#FF6D2D] opacity-20" />
      <div className="absolute inset-0 bg-[url('/background.avif')] bg-cover bg-center opacity-30" />
      <div className="relative flex min-h-screen items-center justify-center px-4 pt-20">
        <div className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-xl rounded-3xl p-8 space-y-6 border border-orange-100">
          <LoginHeader />
          <LoginForm />
        </div>
      </div>
    </div>
  )
});

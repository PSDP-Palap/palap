import { createFileRoute } from "@tanstack/react-router";

import LoginForm from "@/components/auth/LoginForm";
import LoginHeader from "@/components/auth/LoginHeader";

export const Route = createFileRoute("/sign-in")({
  component: () => (
    <div className="relative min-h-screen selection:bg-orange-100 selection:text-orange-900 overflow-hidden bg-[#FDFCFB]">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-200/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-200/30 rounded-full blur-[120px]" />
      </div>

      <div className="absolute inset-0 bg-[url('/background.avif')] bg-cover bg-center opacity-[0.03]" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-110 animate-in fade-in zoom-in-95 duration-700">
          <div className="bg-white/80 backdrop-blur-2xl shadow-[0_32px_64px_-12px_rgba(160,63,0,0.12)] rounded-[2.5rem] p-8 md:p-12 space-y-10 border border-white">
            <LoginHeader />
            <LoginForm />
          </div>

          <div className="mt-8 text-center">
            <p className="text-[10px] font-black text-orange-900/30 uppercase tracking-[0.3em]">
              © 2026 Palap Pet Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  )
});

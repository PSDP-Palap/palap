import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import toast from "react-hot-toast";

import supabase from "@/utils/supabase";

const LoginForm = () => {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    const loadingToast = toast.loading("Signing in...");

    try {
      const { error: signInError } = await signIn(email, password);

      if (signInError) {
        toast.error(signInError, { id: loadingToast });
        return;
      }

      toast.success("Welcome back!", { id: loadingToast });

      // Check role and navigate
      const {
        data: { session }
      } = await supabase.auth.getSession();
      const role = session?.user.app_metadata?.role;

      if (role === "admin") {
        router.navigate({ to: "/management/admin" });
      } else {
        router.navigate({ to: "/" });
      }
    } catch {
      toast.error("ไม่สามารถล็อกอินได้ กรุณาลองใหม่อีกครั้ง", {
        id: loadingToast
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          type="email"
          placeholder="example@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="h-3 w-3 rounded border-slate-300 text-orange-500 focus:ring-orange-300"
          />
          <span>Remember</span>
        </label>
        <Link
          to="/sign-up"
          className="underline hover:text-slate-700 transition-colors"
        >
          Create account
        </Link>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full mt-2 inline-flex justify-center rounded-xl bg-linear-to-r from-orange-400 to-amber-400 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:from-orange-500 hover:to-amber-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
};

export default LoginForm;

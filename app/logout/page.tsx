"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // clear session
    localStorage.clear();

    // small delay for UX
    setTimeout(() => {
      router.push("/");
    }, 1500);
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-100 via-pink-100 to-purple-100">
      <div className="bg-white/80 backdrop-blur-md border border-white rounded-3xl shadow-xl px-10 py-8 text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Logging out...
        </h1>
        <p className="text-slate-600">
          Please wait while we sign you out
        </p>
      </div>
    </main>
  );
}
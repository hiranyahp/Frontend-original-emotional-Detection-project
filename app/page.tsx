"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    queueMicrotask(() => setUserRole(role));
  }, []);

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden">

      {/* 🎥 BACKGROUND VIDEO */}
      <video
        autoPlay
        loop
        muted
        playsInline
        onLoadedMetadata={(e) => {
          e.currentTarget.playbackRate = 0.6;
        }}
        className="fixed top-0 left-0 w-full h-full object-cover -z-20"
      >
        <source src="/videos/background.mp4" type="video/mp4" />
      </video>

      {/* 🌑 SMART OVERLAY (gradient for readability) */}
      <div className="fixed inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/80 -z-10" />

      {/* 🔷 NAVBAR */}
      <nav className="w-full bg-black/40 backdrop-blur-md border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">
            Emotion AI System
          </h1>

          <div className="flex gap-6 text-sm font-medium text-white/90">
            <Link href="/" className="hover:text-indigo-300 transition">
              Home
            </Link>

            {!userRole && (
              <Link href="/login" className="hover:text-indigo-300 transition">
                Login
              </Link>
            )}

            {userRole === "student" && (
              <Link href="/student" className="hover:text-indigo-300 transition">
                Dashboard
              </Link>
            )}

            {userRole === "tutor" && (
              <Link href="/tutor" className="hover:text-indigo-300 transition">
                Dashboard
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* 🔥 MAIN */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-4xl w-full text-center">

          {/* Badge */}
          <div className="inline-block px-5 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm font-semibold text-indigo-200 mb-6">
            AI-Powered Learning Support Platform
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)] whitespace-nowrap">
            Emotion Monitoring System
          </h1>

          {/* Description */}
          <p className="mt-6 text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
            A privacy-preserving and trust-aware emotion detection platform
            designed to assist tutors in understanding student engagement.
          </p>

          {/* BUTTON */}
          <div className="mt-10 flex justify-center">
            {!userRole ? (
              <Link
                href="/login"
                className="px-10 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-lg font-semibold shadow-xl hover:scale-105 transition"
              >
                Login to Start →
              </Link>
            ) : (
              <Link
                href={userRole === "tutor" ? "/tutor" : "/student"}
                className="px-10 py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white text-lg font-semibold shadow-xl hover:scale-105 transition"
              >
                Go to Dashboard →
              </Link>
            )}
          </div>

        </div>
      </div>

      {/* 🧊 FOOTER */}
      <footer className="w-full text-center py-6 text-sm text-white/70 bg-black/30 backdrop-blur-md border-t border-white/10">
        Developed by{" "}
        <span className="font-semibold text-indigo-300">Hiranya</span> • Final Year Research Project
      </footer>
    </main>
  );
}

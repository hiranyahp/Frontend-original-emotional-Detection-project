"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type UserRole } from "@/lib/api";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              width?: number;
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
            }
          ) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

function safeGetItem(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // The app can still show login, but returning to invite after login needs storage.
  }
}

function safeRemoveItem(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable on some mobile/private browsers.
  }
}

function decodeGoogleCredential(credential: string): { name: string; email: string } {
  const payload = credential.split(".")[1];
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = JSON.parse(window.atob(normalized));

  return {
    name: decoded.name || decoded.email || "Google User",
    email: decoded.email || "",
  };
}

function getPostLoginPath(role: UserRole) {
  const queryMeetingId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("meetingId")
      : "";
  const pendingMeetingId = queryMeetingId || safeGetItem("pendingMeetingId");

  if (role === "student" && pendingMeetingId) {
    return `/meeting/${pendingMeetingId}`;
  }

  return role === "tutor" ? "/tutor-dashboard" : "/student-dashboard";
}

export default function LoginPage() {
  const router = useRouter();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const roleRef = useRef<UserRole>("student");

  const [role, setRole] = useState<UserRole>("student");
  const [studentName, setStudentName] = useState("Student Participant");
  const [tutorUsername, setTutorUsername] = useState("");
  const [tutorPassword, setTutorPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    roleRef.current = role;
    setError("");
  }, [role]);

  useEffect(() => {
    try {
      const meetingId = new URLSearchParams(window.location.search).get("meetingId");
      if (meetingId) {
        safeSetItem("pendingMeetingId", meetingId);
      }

      const savedName = safeGetItem("userName");
      const savedRole = safeGetItem("userRole");

      if (savedName && savedRole === "student") {
        router.push(getPostLoginPath("student"));
        return;
      }

      if (savedName && savedRole === "tutor") {
        router.push("/tutor-dashboard");
        return;
      }
    } catch {
      setError("");
    }
  }, [router]);

  useEffect(() => {
    if (role !== "student") {
      return;
    }

    if (!GOOGLE_CLIENT_ID) {
      setError("Google Client ID is missing. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID.");
      return;
    }

    const handleGoogleCredential = async (response: { credential?: string }) => {
      if (!response.credential) {
        setError("Google did not return a credential.");
        return;
      }

      setIsSubmitting(true);
      setError("");

      try {
        let user: {
          id: string;
          name: string;
          email?: string;
          role: UserRole;
        };

        try {
          user = await api.googleLogin(response.credential, roleRef.current);
        } catch {
          const googleUser = decodeGoogleCredential(response.credential);
          user = await api.login(googleUser.name, roleRef.current);
          user.email = googleUser.email;
        }

        localStorage.setItem("userId", user.id);
        localStorage.setItem("userName", user.name);
        if (user.email) {
          localStorage.setItem("userEmail", user.email);
        }
        localStorage.setItem("userRole", user.role);

        router.push(getPostLoginPath(user.role));
      } catch {
        setError("Google login failed. Check backend and Google Client ID settings.");
      } finally {
        setIsSubmitting(false);
      }
    };

    const renderGoogleButton = () => {
      if (!window.google || !googleButtonRef.current) return;

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        auto_select: false,
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "filled_blue",
        size: "large",
        width: 420,
        text: "signin_with",
        shape: "rectangular",
      });
    };

    if (window.google) {
      renderGoogleButton();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;
    script.onerror = () => setError("Could not load Google Sign-In script.");
    document.head.appendChild(script);
  }, [role, router]);

  const handleStudentDemoLogin = async () => {
    const name = studentName.trim();

    if (!name) {
      setError("Enter student name.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      let user = {
        id: `student-${Date.now()}`,
        name,
        role: "student" as UserRole,
      };

      try {
        user = await api.login(name, "student");
      } catch {
        // The meeting can still continue because session access is checked later.
      }

      safeSetItem("userId", user.id);
      safeSetItem("userName", user.name);
      safeSetItem("userRole", user.role);
      safeRemoveItem("userEmail");
      window.location.assign(getPostLoginPath(user.role));
    } catch {
      setError("Student login failed. Check backend connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTutorLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const user = await api.tutorLogin(tutorUsername, tutorPassword);
      localStorage.setItem("userId", user.id);
      localStorage.setItem("userName", user.name);
      localStorage.setItem("userRole", user.role);
      localStorage.removeItem("userEmail");
      router.push(getPostLoginPath(user.role));
    } catch {
      setError("Invalid tutor username or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden p-6">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed top-0 left-0 w-full h-full object-cover -z-20"
      >
        <source src="/videos/background.mp4" type="video/mp4" />
      </video>

      <div className="fixed inset-0 bg-black/75 -z-10" />

      <div className="bg-white/25 backdrop-blur-2xl rounded-3xl shadow-2xl p-12 w-full max-w-xl border border-white/30 scale-105">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-4xl shadow-lg mb-5">
            G
          </div>

          <h1 className="text-4xl font-bold text-white">
            {role === "student" ? "Login with Google" : "Tutor Login"}
          </h1>

          <p className="text-white/80 mt-3 text-base">
            {role === "student"
              ? "Select student, then continue with your Google account"
              : "Use your tutor username and password"}
          </p>
        </div>

        <div className="space-y-5">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full px-5 py-4 border border-white/30 rounded-xl bg-white/10 text-white outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="student" className="text-black">
              Student
            </option>
            <option value="tutor" className="text-black">
              Tutor
            </option>
          </select>

          {role === "student" ? (
            <div className="space-y-4">
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Student name"
                className="w-full px-5 py-4 border border-white/30 rounded-xl bg-white/10 text-white placeholder:text-white/60 outline-none focus:ring-2 focus:ring-indigo-400"
              />

              <button
                type="button"
                onClick={handleStudentDemoLogin}
                disabled={isSubmitting}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-4 font-bold text-white shadow-lg transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continue as Student
              </button>

              <div className="flex min-h-12 justify-center">
                <div ref={googleButtonRef} />
              </div>
            </div>
          ) : (
            <form onSubmit={handleTutorLogin} className="space-y-4">
              <input
                type="text"
                value={tutorUsername}
                onChange={(e) => setTutorUsername(e.target.value)}
                placeholder="Tutor username"
                className="w-full px-5 py-4 border border-white/30 rounded-xl bg-white/10 text-white placeholder:text-white/60 outline-none focus:ring-2 focus:ring-indigo-400"
              />

              <input
                type="password"
                value={tutorPassword}
                onChange={(e) => setTutorPassword(e.target.value)}
                placeholder="Tutor password"
                className="w-full px-5 py-4 border border-white/30 rounded-xl bg-white/10 text-white placeholder:text-white/60 outline-none focus:ring-2 focus:ring-indigo-400"
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-4 font-bold text-white shadow-lg transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Login as Tutor
              </button>
            </form>
          )}

          {isSubmitting && (
            <p className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white">
              {role === "student" ? "Connecting Google account..." : "Checking tutor login..."}
            </p>
          )}

          {error && (
            <p className="rounded-xl border border-red-300 bg-red-500/20 px-4 py-3 text-sm font-semibold text-red-100">
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

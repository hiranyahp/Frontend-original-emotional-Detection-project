"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

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
    // Storage can be unavailable on some mobile/private browsers.
  }
}

function safeRemoveItem(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable on some mobile/private browsers.
  }
}

export default function MeetingRoomPage() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const meetingIdFromRoute = Number(params.roomId) || 1;
  const fallbackPath = `/meeting/${meetingIdFromRoute}`;

  useEffect(() => {
    const role = safeGetItem("userRole");
    const name = safeGetItem("userName");
    const tutorName = safeGetItem("activeTutorName") || "Tutor";
    const meetingId = Number(params.roomId) || Number(safeGetItem("activeMeetingId") || "1");

    if (!role || !name || role === "student") {
      const studentName = name || "Student Participant";
      safeSetItem("userId", `student-${meetingId}`);
      safeSetItem("userName", studentName);
      safeSetItem("userRole", "student");
      safeSetItem("activeMeetingId", String(meetingId));
      safeRemoveItem("pendingMeetingId");
      window.location.replace(`/student?meetingId=${meetingId}`);
      return;
    }

    const enterMeeting = async () => {
      if (role === "student") {
        const session = await api.activeSession(meetingId);
        safeSetItem("userId", `student-${meetingId}`);
        safeSetItem("userName", name);
        safeSetItem("userRole", "student");
        safeSetItem("activeSessionId", session.id);
        safeSetItem("activeMeetingId", String(meetingId));
        safeSetItem("activeTutorName", session.tutorName || tutorName);
        safeRemoveItem("pendingMeetingId");
        window.location.replace(`/student?meetingId=${meetingId}`);
        return;
      }

      let session;
      try {
        session = await api.activeSession(meetingId);
      } catch {
        session = await api.startSession(meetingId, "Student Participant", name);
      }
      safeSetItem("activeSessionId", session.id);
      safeSetItem("activeMeetingId", String(meetingId));
      safeSetItem("activeTutorName", name);
      safeRemoveItem("pendingMeetingId");
      window.location.replace("/tutor");
    };

    enterMeeting().catch(() => {
      const fallback = role === "tutor" ? "/tutor-dashboard" : "/student-dashboard";
      router.push(fallback);
    });
  }, [params.roomId, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 shadow-lg">
        <p className="text-lg font-semibold text-slate-700">Opening meeting...</p>
        <a
          href={fallbackPath}
          className="mt-4 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Continue to meeting
        </a>
      </div>
    </main>
  );
}

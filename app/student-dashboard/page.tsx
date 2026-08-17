"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Meeting } from "@/lib/api";

export default function StudentDashboardPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [isChecking, setIsChecking] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [backendError, setBackendError] = useState("");

  useEffect(() => {
    const savedName = localStorage.getItem("userName");
    const savedRole = localStorage.getItem("userRole");

    if (!savedName || savedRole !== "student") {
      router.push("/login");
      return;
    }

    const loadMeetings = async () => {
      try {
        setStudentName(savedName);
        setMeetings(await api.listMeetings());
      } catch {
        setBackendError("Could not load meetings. Check project backend.");
      } finally {
        setIsChecking(false);
      }
    };

    loadMeetings();
  }, [router]);

  const joinMeeting = async (meeting: Meeting) => {
    try {
      const session = await api.activeSession(meeting.id);
      localStorage.setItem("activeSessionId", session.id);
      localStorage.setItem("activeMeetingId", String(meeting.id));
      localStorage.setItem("activeTutorName", meeting.tutorName);
      router.push("/student");
    } catch {
      setBackendError("Tutor has not started this live session yet.");
    }
  };

  const getStatusStyles = (status: Meeting["status"]) => {
    switch (status) {
      case "Available":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Starting Soon":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "Live":
        return "bg-rose-100 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  if (isChecking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
        <div className="bg-white/80 backdrop-blur-md border border-white rounded-3xl shadow-lg px-8 py-6">
          <p className="text-slate-700 text-lg font-semibold">Checking login...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-100 via-purple-100 to-pink-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-3xl bg-white/85 backdrop-blur-md border border-white shadow-lg p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-500">
                Student Portal
              </p>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mt-2">
                Welcome, {studentName} 👋
              </h1>
              <p className="text-slate-600 mt-3 max-w-2xl">
                View available tutor sessions, check notifications, and join your live
                meeting when you are ready.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() =>
                  meetings[0] ? joinMeeting(meetings[0]) : router.push("/student")
                }
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow-md hover:opacity-95 transition"
              >
                Join Live Session
              </button>

              <button
                onClick={() => router.push("/logout")}
                className="px-5 py-3 rounded-2xl bg-red-500 text-white font-semibold shadow-md hover:bg-red-600 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid md:grid-cols-3 gap-5">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg p-6">
            <p className="text-sm opacity-90">Active Role</p>
            <h2 className="text-2xl font-bold mt-2">Student</h2>
            <p className="mt-3 text-sm opacity-90">
              Logged in and ready to join tutor sessions
            </p>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg p-6">
            <p className="text-sm opacity-90">Available Meetings</p>
            <h2 className="text-2xl font-bold mt-2">{meetings.length}</h2>
            <p className="mt-3 text-sm opacity-90">
              Sessions currently listed for joining
            </p>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-lg p-6">
            <p className="text-sm opacity-90">System Status</p>
            <h2 className="text-2xl font-bold mt-2">Ready</h2>
            <p className="mt-3 text-sm opacity-90">
              Waiting for you to select a session
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Available Meetings */}
          <div className="lg:col-span-2 rounded-3xl bg-white/85 backdrop-blur-md border border-white shadow-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  Available Tutor Meetings
                </h2>
                <p className="text-slate-500 mt-1 text-sm">
                  Choose a tutor session and join when it is active
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {backendError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  {backendError}
                </div>
              )}

              {meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="rounded-3xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-5 shadow-sm"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Tutor</p>
                      <h3 className="text-xl font-bold text-slate-800 mt-1">
                        {meeting.tutorName}
                      </h3>
                      <p className="text-slate-600 mt-2">{meeting.subject}</p>
                      <p className="text-sm text-slate-500 mt-2">
                        Scheduled Time: {meeting.time}
                      </p>
                    </div>

                    <div className="flex flex-col items-start md:items-end gap-3">
                      <span
                        className={`inline-block px-4 py-2 rounded-xl border text-sm font-semibold ${getStatusStyles(
                          meeting.status
                        )}`}
                      >
                        {meeting.status}
                      </span>

                      <button
                        onClick={() => joinMeeting(meeting)}
                        className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow hover:opacity-95 transition"
                      >
                        Join Session
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side */}
          <div className="space-y-6">
            <div className="rounded-3xl bg-white/85 backdrop-blur-md border border-white shadow-lg p-5">
              <h3 className="text-xl font-bold text-slate-800 mb-4">
                Notifications
              </h3>

              <div className="space-y-3">
                <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
                  <p className="text-sm font-semibold text-blue-700">
                    Meeting Reminder
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    A tutor session is available for you to join.
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                  <p className="text-sm font-semibold text-emerald-700">
                    System Ready
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    Your account is active and session access is enabled.
                  </p>
                </div>

                <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
                  <p className="text-sm font-semibold text-amber-700">
                    Next Step
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    Select a tutor meeting before opening the live video page.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white shadow-lg p-5">
              <h3 className="text-lg font-bold">Quick Guidance</h3>
              <p className="mt-2 text-sm leading-6 text-white/90">
                Use this dashboard to enter the system properly. This avoids opening
                the camera immediately after login and creates a cleaner user flow.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

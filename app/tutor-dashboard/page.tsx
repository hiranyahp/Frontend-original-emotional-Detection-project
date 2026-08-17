"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, buildMeetingInviteUrl, type Meeting, type MeetingStatus } from "@/lib/api";

const emptyMeeting = {
  tutorName: "",
  subject: "",
  time: "",
  status: "Available" as MeetingStatus,
};

export default function TutorDashboardPage() {
  const router = useRouter();

  const [tutorName, setTutorName] = useState("");
  const [isChecking, setIsChecking] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [form, setForm] = useState(emptyMeeting);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [backendError, setBackendError] = useState("");
  const [copiedMeetingId, setCopiedMeetingId] = useState<number | null>(null);

  const loadMeetings = async () => {
    setMeetings(await api.listMeetings());
  };

  useEffect(() => {
    const savedName = localStorage.getItem("userName");
    const savedRole = localStorage.getItem("userRole");

    if (!savedName || savedRole !== "tutor") {
      router.push("/login");
      return;
    }

    const load = async () => {
      try {
        setTutorName(savedName);
        await loadMeetings();
      } catch {
        setBackendError("Could not connect to project backend on port 8000.");
      } finally {
        setIsChecking(false);
      }
    };

    load();
  }, [router]);

  const totalMeetings = meetings.length;
  const liveCount = useMemo(
    () => meetings.filter((meeting) => meeting.status === "Live").length,
    [meetings]
  );
  const availableCount = useMemo(
    () => meetings.filter((meeting) => meeting.status === "Available").length,
    [meetings]
  );

  const resetForm = () => {
    setForm(emptyMeeting);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.tutorName.trim() || !form.subject.trim() || !form.time.trim()) {
      alert("Please fill all fields.");
      return;
    }

    try {
      if (editingId !== null) {
        await api.updateMeeting(editingId, form);
      } else {
        await api.createMeeting(form);
      }
      await loadMeetings();
      resetForm();
      setBackendError("");
    } catch {
      setBackendError("Could not save meeting. Check project backend.");
    }
  };

  const handleEdit = (meeting: Meeting) => {
    setForm({
      tutorName: meeting.tutorName,
      subject: meeting.subject,
      time: meeting.time,
      status: meeting.status,
    });
    setEditingId(meeting.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this meeting?");
    if (!confirmed) return;

    try {
      await api.deleteMeeting(id);
      await loadMeetings();
      if (editingId === id) resetForm();
    } catch {
      setBackendError("Could not delete meeting. Check project backend.");
    }
  };

  const handleStatusChange = async (id: number, status: MeetingStatus) => {
    try {
      await api.updateMeeting(id, { status });
      await loadMeetings();
    } catch {
      setBackendError("Could not update meeting status. Check project backend.");
    }
  };

  const startTutorSession = async (meeting: Meeting) => {
    try {
      let session;

      try {
        session = await api.activeSession(meeting.id);
      } catch {
        session = await api.startSession(
          meeting.id,
          "Student Participant",
          meeting.tutorName
        );
      }

      if (meeting.status !== "Live") {
        await api.updateMeeting(meeting.id, { status: "Live" });
      }

      localStorage.setItem("activeSessionId", session.id);
      localStorage.setItem("activeMeetingId", String(meeting.id));
      localStorage.setItem("activeTutorName", meeting.tutorName);
      router.push("/tutor");
    } catch {
      setBackendError("Could not start tutor session. Check project backend.");
    }
  };

  const copyInviteLink = async (meeting: Meeting) => {
    const inviteUrl = buildMeetingInviteUrl(meeting.id);

    try {
      let session;
      try {
        session = await api.activeSession(meeting.id);
      } catch {
        session = await api.startSession(
          meeting.id,
          "Student Participant",
          meeting.tutorName
        );
      }

      if (meeting.status !== "Live") {
        await api.updateMeeting(meeting.id, { status: "Live" });
        await loadMeetings();
      }

      localStorage.setItem("activeSessionId", session.id);
      localStorage.setItem("activeMeetingId", String(meeting.id));
      localStorage.setItem("activeTutorName", meeting.tutorName);
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedMeetingId(meeting.id);
      setBackendError("");
    } catch {
      setBackendError(`Invite link: ${inviteUrl}`);
    }
  };

  const openLiveSession = () => {
    const meeting = meetings.find((item) => item.status === "Live") || meetings[0];
    if (!meeting) {
      setBackendError("Create a meeting before opening the live session.");
      return;
    }
    startTutorSession(meeting);
  };

  const getStatusBadgeStyles = (status: MeetingStatus) => {
    switch (status) {
      case "Available":
        return "bg-emerald-100 text-emerald-700 border border-emerald-200";
      case "Starting Soon":
        return "bg-amber-100 text-amber-700 border border-amber-200";
      case "Live":
        return "bg-rose-100 text-rose-700 border border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border border-slate-200";
    }
  };

  const inputClass =
    "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";

  if (isChecking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 via-purple-100 to-pink-100">
        <div className="bg-white/80 backdrop-blur-md border border-white rounded-3xl shadow-lg px-8 py-6">
          <p className="text-slate-700 text-lg font-semibold">Checking login...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-100 via-purple-100 to-pink-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="rounded-3xl bg-white/85 backdrop-blur-md border border-white shadow-lg p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-500">
                Tutor Portal
              </p>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mt-2">
                Welcome back, {tutorName}
              </h1>
              <p className="text-slate-600 mt-3 max-w-2xl">
                Meetings are now stored in the project backend and shared with students.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={openLiveSession}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow-md hover:opacity-95 transition"
              >
                Open Live Session
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

        <div className="grid md:grid-cols-3 gap-5">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg p-6">
            <p className="text-sm opacity-90">Total Meetings</p>
            <h2 className="text-2xl font-bold mt-2">{totalMeetings}</h2>
            <p className="mt-3 text-sm opacity-90">Stored in backend database</p>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg p-6">
            <p className="text-sm opacity-90">Available</p>
            <h2 className="text-2xl font-bold mt-2">{availableCount}</h2>
            <p className="mt-3 text-sm opacity-90">Visible for student joining</p>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-lg p-6">
            <p className="text-sm opacity-90">Live</p>
            <h2 className="text-2xl font-bold mt-2">{liveCount}</h2>
            <p className="mt-3 text-sm opacity-90">Marked as active sessions</p>
          </div>
        </div>

        {backendError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {backendError}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl bg-white/90 backdrop-blur-md border border-white shadow-lg p-6">
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-slate-800">
                  {editingId !== null ? "Edit Meeting" : "Create Meeting"}
                </h2>
                <p className="text-slate-500 mt-1 text-sm">
                  This form writes directly to the FastAPI backend.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Tutor name"
                  value={form.tutorName}
                  onChange={(e) => setForm({ ...form, tutorName: e.target.value })}
                  className={inputClass}
                />

                <input
                  type="text"
                  placeholder="Subject"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className={inputClass}
                />

                <input
                  type="text"
                  placeholder="Time (e.g. 2:30 PM)"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className={inputClass}
                />

                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as MeetingStatus })
                  }
                  className={inputClass}
                >
                  <option value="Available">Available</option>
                  <option value="Starting Soon">Starting Soon</option>
                  <option value="Live">Live</option>
                </select>

                <div className="md:col-span-2 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow hover:opacity-95 transition"
                  >
                    {editingId !== null ? "Update Meeting" : "Add Meeting"}
                  </button>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-5 py-3 rounded-2xl bg-slate-200 text-slate-700 font-semibold shadow hover:bg-slate-300 transition"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>

            <div className="rounded-3xl bg-white/85 backdrop-blur-md border border-white shadow-lg p-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-5">
                Backend Meetings
              </h2>

              <div className="space-y-4">
                {meetings.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
                    <p className="text-slate-600 font-medium">No meetings available.</p>
                  </div>
                ) : (
                  meetings.map((meeting) => (
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
                            className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${getStatusBadgeStyles(
                              meeting.status
                            )}`}
                          >
                            {meeting.status}
                          </span>

                          <div className="flex flex-wrap gap-2">
                            {(["Available", "Starting Soon", "Live"] as MeetingStatus[]).map(
                              (status) => (
                                <button
                                  key={status}
                                  onClick={() => handleStatusChange(meeting.id, status)}
                                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                                >
                                  {status}
                                </button>
                              )
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleEdit(meeting)}
                              className="px-4 py-2 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleDelete(meeting.id)}
                              className="px-4 py-2 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition"
                            >
                              Delete
                            </button>

                            <button
                              onClick={() => startTutorSession(meeting)}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold hover:opacity-95 transition"
                            >
                              Monitor
                            </button>

                            <button
                              onClick={() => copyInviteLink(meeting)}
                              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                            >
                              {copiedMeetingId === meeting.id ? "Copied" : "Copy Student Link"}
                            </button>
                          </div>

                          <p className="max-w-full break-all rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500">
                            {buildMeetingInviteUrl(meeting.id)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl bg-white/85 backdrop-blur-md border border-white shadow-lg p-5">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Connection</h3>

              <div className="space-y-3">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                  <p className="text-sm font-semibold text-emerald-700">
                    Backend Connected
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    Refresh student dashboard to see these same meetings.
                  </p>
                </div>

                <button
                  onClick={loadMeetings}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-700 text-white font-semibold shadow hover:bg-slate-800 transition"
                >
                  Refresh Backend Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

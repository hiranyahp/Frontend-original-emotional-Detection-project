"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import JitsiMeetingRoom from "@/components/JitsiMeetingRoom";
import { api, getJitsiRoomName } from "@/lib/api";

export default function StudentPage() {
  const router = useRouter();
  const modelVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [studentName, setStudentName] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [isChecking, setIsChecking] = useState(true);
  const [backendError, setBackendError] = useState("");
  const [modelStatus, setModelStatus] = useState("Preparing student emotion detection...");

  useEffect(() => {
    const invitedMeetingId = new URLSearchParams(window.location.search).get("meetingId");
    const meetingId = Number(
      invitedMeetingId || localStorage.getItem("activeMeetingId") || "1"
    );
    let savedName = localStorage.getItem("userName");
    let savedRole = localStorage.getItem("userRole");

    if (invitedMeetingId && (!savedName || savedRole !== "student")) {
      savedName = "Student Participant";
      savedRole = "student";
      localStorage.setItem("userId", `student-${meetingId}`);
      localStorage.setItem("userName", savedName);
      localStorage.setItem("userRole", savedRole);
      localStorage.setItem("activeMeetingId", String(meetingId));
    }

    if (!savedName || savedRole !== "student") {
      router.push("/login");
      return;
    }

    const prepareSession = async () => {
      try {
        setStudentName(savedName);

        const session = await api.activeSession(meetingId);
        localStorage.setItem("activeSessionId", session.id);
        localStorage.setItem("activeTutorName", session.tutorName);
        setSessionId(session.id);
      } catch {
        setBackendError("No live tutor session found. Ask the tutor to start the meeting.");
      } finally {
        setIsChecking(false);
      }
    };

    prepareSession();
  }, [router]);

  useEffect(() => {
    if (!sessionId) return;

    let stream: MediaStream | null = null;

    const startStudentCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 },
          audio: false,
        });

        if (modelVideoRef.current) {
          modelVideoRef.current.srcObject = stream;
          await modelVideoRef.current.play();
        }

        setModelStatus("Student emotion detection active");
      } catch {
        setModelStatus("Allow camera access to send student emotion samples");
      }
    };

    startStudentCamera();

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !studentName) return;

    const sendFrameToModel = async () => {
      const video = modelVideoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState < 2) {
        return;
      }

      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const context = canvas.getContext("2d");
      if (!context) return;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL("image/jpeg", 0.75);

      try {
        const result = await api.predictEmotion(sessionId, studentName, imageData);
        setModelStatus(
          result.prediction.faceDetected
            ? "Student emotion sample sent"
            : "Student camera active, no face detected"
        );
        setBackendError("");
      } catch {
        setBackendError(
          "Could not send student emotion sample. Check backend, ngrok API URL, and model dependencies."
        );
      }
    };

    const timer = window.setInterval(sendFrameToModel, 5000);
    sendFrameToModel();
    return () => window.clearInterval(timer);
  }, [sessionId, studentName]);

  const leaveSession = async () => {
    if (sessionId) {
      localStorage.removeItem("activeSessionId");
    }

    router.push("/student-dashboard");
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
    <main className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white/85 backdrop-blur-md border border-white rounded-3xl shadow-lg p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-indigo-500 font-semibold">
                Live Student Session
              </p>
              <h1 className="text-3xl font-extrabold text-slate-800 mt-2">
                Video Call
              </h1>
              <p className="text-slate-600 mt-3">
                Session <span className="font-semibold text-indigo-600">{sessionId}</span>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.push("/student-dashboard")}
                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 transition"
              >
                Back to Dashboard
              </button>

              <button
                onClick={leaveSession}
                className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition"
              >
                Leave Session
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">
            {modelStatus}
          </div>
        </div>

        {backendError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {backendError}
          </div>
        )}

        <div className="relative bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
          <JitsiMeetingRoom
            roomName={getJitsiRoomName(sessionId)}
            displayName={studentName}
            height="620px"
          />

          <div className="absolute top-4 right-4 bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-full shadow">
            Session Active
          </div>

          <video ref={modelVideoRef} muted playsInline className="hidden" />
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    </main>
  );
}

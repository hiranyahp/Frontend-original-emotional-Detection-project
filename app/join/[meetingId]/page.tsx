"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import JitsiMeetingRoom from "@/components/JitsiMeetingRoom";
import { api, getJitsiRoomName, type LiveSession } from "@/lib/api";

export default function StudentJoinPage() {
  const params = useParams<{ meetingId: string }>();
  const meetingId = Number(params.meetingId) || 1;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [studentName, setStudentName] = useState("Student Participant");
  const [session, setSession] = useState<LiveSession | null>(null);
  const [pageStatus, setPageStatus] = useState("Connecting to tutor session...");
  const [cameraStatus, setCameraStatus] = useState("Camera not started");
  const [latestEmotion, setLatestEmotion] = useState("Waiting");
  const [latestConfidence, setLatestConfidence] = useState(0);
  const [error, setError] = useState("");

  const roomName = useMemo(
    () => getJitsiRoomName(session?.id || `meeting-${meetingId}`),
    [meetingId, session?.id]
  );

  useEffect(() => {
    const prepareSession = async () => {
      try {
        let active: LiveSession;

        try {
          active = await api.activeSession(meetingId);
        } catch {
          active = await api.startSession(
            meetingId,
            "Student Participant",
            "Tutor"
          );
        }

        setSession(active);
        setStudentName(active.studentName || "Student Participant");
        setPageStatus("Connected. Join the video room and allow camera detection.");
        setError("");
      } catch {
        setPageStatus("Could not connect to this meeting.");
        setError("Check that this meeting exists and the local backend is running.");
      }
    };

    prepareSession();
  }, [meetingId]);

  useEffect(() => {
    if (!session) return;

    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setCameraStatus("Emotion detection camera active");
        setError("");
      } catch {
        setCameraStatus("Camera permission is required for emotion detection");
        setError("Allow camera access in this browser page so the tutor can receive emotion results.");
      }
    };

    startCamera();

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [session]);

  useEffect(() => {
    if (!session || !studentName) return;

    const sendFrame = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState < 2) return;

      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const context = canvas.getContext("2d");
      if (!context) return;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL("image/jpeg", 0.75);

      try {
        const result = await api.predictEmotion(session.id, studentName, imageData);
        setLatestEmotion(result.prediction.emotion);
        setLatestConfidence(Math.round(result.prediction.confidence * 100));
        setCameraStatus(
          result.prediction.faceDetected
            ? "Emotion sample sent to tutor"
            : "Camera active, no face detected"
        );
        setError("");
      } catch {
        setError("Could not send emotion sample. Check that the local backend is running.");
      }
    };

    sendFrame();
    const timer = window.setInterval(sendFrame, 5000);
    return () => window.clearInterval(timer);
  }, [session, studentName]);

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
                Student Meeting Link
              </p>
              <h1 className="mt-2 text-2xl font-extrabold text-slate-900 md:text-3xl">
                Join Tutor Session
              </h1>
              <p className="mt-2 text-sm font-medium text-slate-600">{pageStatus}</p>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-500">
                Session
              </p>
              <p className="mt-1 text-lg font-bold text-indigo-900">
                {session?.id || "Waiting"}
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            {error}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-lg">
            {session ? (
              <JitsiMeetingRoom
                roomName={roomName}
                displayName={studentName}
                height="620px"
              />
            ) : (
              <div className="flex h-[620px] items-center justify-center p-8 text-center text-white">
                <div>
                  <p className="text-2xl font-bold">Waiting for tutor</p>
                  <p className="mt-3 text-white/70">
                    This page will work after the tutor starts the live session.
                  </p>
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Emotion Detection</h2>
              <p className="mt-2 text-sm font-medium text-slate-600">{cameraStatus}</p>

              <video
                ref={videoRef}
                muted
                playsInline
                className="mt-4 aspect-video w-full rounded-2xl bg-slate-900 object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-blue-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-500">
                    Emotion
                  </p>
                  <p className="mt-1 text-lg font-bold text-blue-900">{latestEmotion}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-500">
                    Confidence
                  </p>
                  <p className="mt-1 text-lg font-bold text-emerald-900">
                    {latestConfidence}%
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-medium text-slate-600 shadow-sm">
              Keep this page open during the lesson. The tutor receives only emotion
              results, not stored face images.
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

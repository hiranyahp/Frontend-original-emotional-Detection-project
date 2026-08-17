"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import EmotionChart from "@/components/EmotionChart";
import AlertPanel from "@/components/AlertPanel";
import JitsiMeetingRoom from "@/components/JitsiMeetingRoom";
import { api, getJitsiRoomName, type EmotionLog, type SessionReport } from "@/lib/api";

type EmotionPoint = {
  time: string;
  calm: number;
  engaged: number;
  frustrated: number;
};

type AlertLevel = "Low" | "Medium" | "High";

const emptyChart: EmotionPoint[] = [
  { time: "Start", calm: 0, engaged: 0, frustrated: 0 },
];

function pointFromLog(log: EmotionLog): EmotionPoint {
  const emotion = log.emotion.toLowerCase();
  const confidence = Math.round(log.confidence * 100);
  const time = new Date(log.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  if (emotion.includes("happy") || emotion.includes("surprise")) {
    return { time, calm: 20, engaged: confidence, frustrated: 0 };
  }

  if (emotion.includes("neutral")) {
    return { time, calm: confidence, engaged: 30, frustrated: 0 };
  }

  return { time, calm: 10, engaged: 20, frustrated: confidence };
}

function cleanPdfText(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, "-");
}

function escapePdfText(value: string): string {
  return cleanPdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapPdfLine(value: string, maxLength = 82): string[] {
  const words = cleanPdfText(value).split(" ");
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines;
}

function createReportPdf(lines: string[]): Blob {
  const contentParts: string[] = [];
  let y = 780;

  const addText = (text: string, x = 54, size = 11, gap = 17) => {
    contentParts.push(`BT /F1 ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`);
    y -= gap;
  };

  addText("Student Emotional Report", 54, 22, 28);
  addText(`Generated: ${new Date().toLocaleString()}`, 54, 10, 24);

  lines.forEach((line) => {
    if (!line) {
      y -= 10;
      return;
    }

    wrapPdfLine(line).forEach((wrappedLine) => addText(wrappedLine));
  });

  const content = contentParts.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

export default function TutorPage() {
  const router = useRouter();
  const [tutorName, setTutorName] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [latestEmotion, setLatestEmotion] = useState<EmotionLog | null>(null);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [chartData, setChartData] = useState<EmotionPoint[]>(emptyChart);
  const [isChecking, setIsChecking] = useState(true);
  const [backendError, setBackendError] = useState("");

  useEffect(() => {
    const savedName = localStorage.getItem("userName");
    const savedRole = localStorage.getItem("userRole");
    const meetingId = Number(localStorage.getItem("activeMeetingId") || "1");
    const activeTutorName = localStorage.getItem("activeTutorName") || savedName || "Tutor";

    if (!savedName || savedRole !== "tutor") {
      router.push("/login");
      return;
    }

    const prepareTutorSession = async () => {
      try {
        setTutorName(savedName);

        let session;
        try {
          session = await api.activeSession(meetingId);
        } catch {
          session = await api.startSession(
            meetingId,
            "Student Participant",
            activeTutorName
          );
        }

        localStorage.setItem("activeSessionId", session.id);
        localStorage.setItem("activeMeetingId", String(session.meetingId));
        localStorage.setItem("activeTutorName", session.tutorName);
        setSessionId(session.id);
      } catch {
        setBackendError("Could not prepare tutor live session. Start a meeting from the tutor dashboard.");
      } finally {
        setIsChecking(false);
      }
    };

    prepareTutorSession();
  }, [router]);

  useEffect(() => {
    if (!sessionId) return;

    const poll = async () => {
      try {
        const latest = await api.latestEmotion(sessionId);
        setLatestEmotion(latest);
        setChartData((prev) => [...prev.slice(-7), pointFromLog(latest)]);
        localStorage.setItem("activeSessionId", latest.sessionId);

        const nextReport = await api.report(latest.sessionId);
        setReport(nextReport);
        setBackendError("");
      } catch {
        setBackendError(
          "Waiting for student emotion samples from the student device."
        );
      }
    };

    poll();
    const timer = window.setInterval(poll, 3000);
    return () => window.clearInterval(timer);
  }, [sessionId]);

  const confidence = Math.round((latestEmotion?.confidence || 0) * 100);

  const trustScore = useMemo(() => {
    if (!latestEmotion) return 0;
    const emotion = latestEmotion.emotion.toLowerCase();
    return emotion.includes("happy") || emotion.includes("neutral") ? 86 : 64;
  }, [latestEmotion]);

  const getEmotionStyles = (emotion: string) => {
    const e = emotion.toLowerCase();

    if (e.includes("happy") || e.includes("calm")) {
      return "bg-green-100 text-green-700 border-green-200";
    }
    if (e.includes("neutral")) {
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }
    if (e.includes("sad") || e.includes("angry") || e.includes("fear")) {
      return "bg-red-100 text-red-700 border-red-200";
    }
    return "bg-blue-100 text-blue-700 border-blue-200";
  };

  const alerts = useMemo(() => {
    const items: Array<{ level: AlertLevel; message: string }> = [];

    if (!latestEmotion) {
      items.push({
        level: "Low",
        message: "No live emotion sample has arrived from the backend yet.",
      });
      return items;
    }

    const emotion = latestEmotion.emotion.toLowerCase();
    if (emotion.includes("sad") || emotion.includes("angry") || emotion.includes("fear")) {
      items.push({
        level: "High",
        message: "Student may need tutor support based on recent emotion samples.",
      });
    } else if (emotion.includes("neutral")) {
      items.push({
        level: "Medium",
        message: "Student is neutral. Consider checking understanding.",
      });
    } else {
      items.push({
        level: "Low",
        message: "Student emotion currently looks positive or engaged.",
      });
    }

    return items;
  }, [latestEmotion]);

  const tutorActions = useMemo(() => {
    const emotion = latestEmotion?.emotion.toLowerCase() || "";

    if (emotion.includes("sad") || emotion.includes("angry") || emotion.includes("fear")) {
      return [
        "Slow down the explanation",
        "Ask if the student needs clarification",
        "Switch to an easier example",
      ];
    }

    if (emotion.includes("neutral")) {
      return [
        "Ask a quick question",
        "Use a practical example",
        "Invite the student to summarize the topic",
      ];
    }

    return [
      "Continue current explanation",
      "Give a slightly more challenging example",
      "Encourage the student to participate",
    ];
  }, [latestEmotion]);

  const downloadPdfReport = () => {
    if (!report || !latestEmotion) {
      setBackendError("Wait for at least one emotion sample before downloading the PDF report.");
      return;
    }

    const emotionLines = Object.entries(report.emotionCounts).map(
      ([emotion, count]) => `- ${emotion}: ${count} sample(s)`
    );
    const timelineLines = report.timeline.slice(-12).map((item, index) => {
      const time = new Date(item.time).toLocaleTimeString();
      return `${index + 1}. ${time} - ${item.emotion} (${Math.round(item.confidence * 100)}%)`;
    });

    const lines = [
      `Session ID: ${report.sessionId}`,
      `Tutor: ${tutorName}`,
      `Latest Emotion: ${latestEmotion.emotion}`,
      `Latest Confidence: ${Math.round(latestEmotion.confidence * 100)}%`,
      `Dominant Emotion: ${report.dominantEmotion}`,
      `Total Samples: ${report.totalSamples}`,
      `Average Confidence: ${Math.round(report.averageConfidence * 100)}%`,
      "",
      "Emotion Count Summary",
      ...emotionLines,
      "",
      "Recommended Tutor Actions",
      ...tutorActions.map((action) => `- ${action}`),
      "",
      "Recent Emotion Timeline",
      ...timelineLines,
      "",
      `Blockchain Record: ${latestEmotion.blockHash}`,
    ];

    const blob = createReportPdf(lines);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `emotion-report-${report.sessionId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (isChecking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 shadow-lg">
          <p className="text-lg font-semibold text-slate-700">Checking login...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-lg p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
                Live Monitoring Panel
              </p>

              <h1 className="mt-2 text-4xl font-extrabold text-slate-900">
                Tutor Dashboard
              </h1>

              <p className="mt-3 text-base text-slate-600">
                Backend session:{" "}
                <span className="font-semibold text-indigo-700">
                  {sessionId || "waiting"}
                </span>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={downloadPdfReport}
                disabled={!report || !latestEmotion}
                className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Download PDF
              </button>

              <button
                onClick={() => router.push("/tutor-dashboard")}
                className="rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-300"
              >
                Meetings
              </button>

              <button
                onClick={() => router.push("/logout")}
                className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {backendError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
            {backendError}
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="relative bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
              <JitsiMeetingRoom
                roomName={getJitsiRoomName(sessionId)}
                displayName={tutorName}
                email={`${tutorName.replace(/\s+/g, "").toLowerCase()}@demo.com`}
                height="560px"
              />

              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white px-4 py-3">
                <p className="text-xs text-slate-500 uppercase tracking-wide">
                  Live Emotion
                </p>
                <div
                  className={`inline-block mt-2 px-3 py-1 rounded-xl border font-bold text-sm ${getEmotionStyles(
                    latestEmotion?.emotion || "Waiting"
                  )}`}
                >
                  {latestEmotion?.emotion || "Waiting"}
                </div>
              </div>

              <div className="absolute top-4 right-4 bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-full shadow">
                Monitoring Student
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-md border border-white rounded-3xl shadow-lg p-5">
            <h2 className="text-xl font-bold text-slate-800 mb-5">
              Live Analytics
            </h2>

            <div className="space-y-5">
              <div>
                <p className="text-sm text-slate-500">Tutor</p>
                <p className="text-lg font-semibold text-slate-800">{tutorName}</p>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-1">Detected Emotion</p>
                <div
                  className={`inline-block px-4 py-2 rounded-xl border font-bold text-lg ${getEmotionStyles(
                    latestEmotion?.emotion || "Waiting"
                  )}`}
                >
                  {latestEmotion?.emotion || "Waiting"}
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-500">Confidence</p>
                <div className="mt-2 w-full bg-blue-100 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${confidence}%` }}
                  />
                </div>
                <p className="text-sm text-blue-600 mt-2 font-medium">
                  {confidence}%
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Trust Score</p>
                <div className="mt-2 w-full bg-emerald-100 rounded-full h-3">
                  <div
                    className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${trustScore}%` }}
                  />
                </div>
                <p className="text-sm text-emerald-600 mt-2 font-medium">
                  {trustScore}%
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Last Updated</p>
                <p className="font-medium text-slate-700">
                  {latestEmotion
                    ? new Date(latestEmotion.timestamp).toLocaleTimeString()
                    : "Waiting"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Model Status</p>
                <p className="font-medium text-slate-700">
                  {latestEmotion ? "Receiving student samples" : "Waiting for student device"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white shadow-lg p-6">
            <h2 className="mb-4 text-2xl font-bold text-slate-900">
              Emotion Trend Analysis
            </h2>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <EmotionChart data={chartData} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white shadow-lg p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-xl font-bold text-slate-900">
                  Session Report
                </h3>

                <button
                  onClick={downloadPdfReport}
                  disabled={!report || !latestEmotion}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  PDF
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Dominant Emotion</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {report?.dominantEmotion || "Waiting"}
                </p>
                <p className="mt-4 text-sm text-slate-500">Samples</p>
                <p className="mt-1 text-lg font-semibold text-slate-800">
                  {report?.totalSamples || 0}
                </p>
                <p className="mt-4 text-sm text-slate-500">Average Confidence</p>
                <p className="mt-1 text-lg font-semibold text-slate-800">
                  {report ? Math.round(report.averageConfidence * 100) : 0}%
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-lg p-5">
              <h3 className="mb-4 text-xl font-bold text-slate-900">
                Alerts & Notifications
              </h3>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <AlertPanel alerts={alerts} />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-lg p-5">
              <h3 className="mb-4 text-xl font-bold text-slate-900">
                Recommended Actions
              </h3>

              <div className="space-y-3">
                {tutorActions.map((action, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-slate-800 shadow-sm"
                  >
                    {action}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

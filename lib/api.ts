const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "";

export type UserRole = "student" | "tutor";
export type MeetingStatus = "Available" | "Starting Soon" | "Live";

export type Meeting = {
  id: number;
  tutorName: string;
  subject: string;
  time: string;
  status: MeetingStatus;
};

export type EmotionLog = {
  id: number;
  sessionId: string;
  studentName: string;
  emotion: string;
  confidence: number;
  source: string;
  timestamp: string;
  blockHash: string;
};

export type SessionReport = {
  sessionId: string;
  totalSamples: number;
  dominantEmotion: string;
  averageConfidence: number;
  emotionCounts: Record<string, number>;
  timeline: Array<{
    time: string;
    emotion: string;
    confidence: number;
  }>;
};

export type LiveSession = {
  id: string;
  meetingId: number;
  studentName: string;
  tutorName: string;
  status: "active" | "ended";
  startedAt: string;
  endedAt: string | null;
};

export function getPublicAppUrl() {
  const configuredUrl = APP_BASE_URL.trim().replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const browserOrigin = window.location.origin.replace(/\/$/, "");
    const isLocalOrigin =
      browserOrigin.includes("localhost") ||
      browserOrigin.includes("127.0.0.1");

    if (!isLocalOrigin) {
      return browserOrigin;
    }
  }

  if (configuredUrl) return configuredUrl;

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost:3000";
}

export function buildMeetingInviteUrl(meetingId: number) {
  return `${getPublicAppUrl()}/join/${meetingId}`;
}

export function getJitsiRoomName(sessionId: string) {
  return `emotion-tutor-${sessionId || "waiting"}`.replace(/[^a-zA-Z0-9-]/g, "-");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  login(name: string, role: UserRole) {
    return request<{ id: string; name: string; role: UserRole }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ name, role }),
    });
  },

  googleLogin(credential: string, role: UserRole) {
    return request<{
      id: string;
      name: string;
      email: string;
      role: UserRole;
      provider: "google";
    }>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential, role }),
    });
  },

  tutorLogin(username: string, password: string) {
    return request<{
      id: string;
      name: string;
      role: "tutor";
      provider: "password";
    }>("/auth/tutor-login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  listMeetings() {
    return request<Meeting[]>("/meetings");
  },

  createMeeting(meeting: Omit<Meeting, "id">) {
    return request<Meeting>("/meetings", {
      method: "POST",
      body: JSON.stringify(meeting),
    });
  },

  updateMeeting(id: number, meeting: Partial<Omit<Meeting, "id">>) {
    return request<Meeting>(`/meetings/${id}`, {
      method: "PUT",
      body: JSON.stringify(meeting),
    });
  },

  deleteMeeting(id: number) {
    return request<{ deleted: boolean; meetingId: number }>(`/meetings/${id}`, {
      method: "DELETE",
    });
  },

  startSession(meetingId: number, studentName: string, tutorName: string) {
    return request<LiveSession>("/sessions", {
      method: "POST",
      body: JSON.stringify({ meetingId, studentName, tutorName }),
    });
  },

  activeSession(meetingId: number) {
    return request<LiveSession>(`/sessions/active?meetingId=${meetingId}`);
  },

  endSession(sessionId: string) {
    return request(`/sessions/${sessionId}/end`, { method: "POST" });
  },

  logEmotion(
    sessionId: string,
    studentName: string,
    emotion: string,
    confidence: number,
    source = "frontend-demo"
  ) {
    return request<{ log: EmotionLog }>("/emotion/log", {
      method: "POST",
      body: JSON.stringify({
        sessionId,
        studentName,
        emotion,
        confidence,
        source,
      }),
    });
  },

  predictEmotion(sessionId: string, studentName: string, imageData: string) {
    return request<{
      log: EmotionLog;
      prediction: {
        emotion: string;
        confidence: number;
        faceDetected: boolean;
        topPredictions?: Array<{ emotion: string; confidence: number }>;
      };
    }>(
      "/emotion/predict",
      {
        method: "POST",
        body: JSON.stringify({
          sessionId,
          studentName,
          imageData,
        }),
      }
    );
  },

  latestEmotion(sessionId?: string) {
    const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
    return request<EmotionLog>(`/emotion/latest${query}`);
  },

  report(sessionId: string) {
    return request<SessionReport>(`/reports/${sessionId}`);
  },
};

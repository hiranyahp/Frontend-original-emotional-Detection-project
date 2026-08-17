export const currentEmotion = {
  studentName: "Student A",
  sessionId: "SES-001",
  emotion: "Frustrated",
  confidence: 0.86,
  trustScore: 0.81,
  updatedAt: "10:15 AM",
};

export const emotionTimeline = [
  { time: "10:00", calm: 60, engaged: 25, frustrated: 15 },
  { time: "10:05", calm: 55, engaged: 20, frustrated: 25 },
  { time: "10:10", calm: 45, engaged: 20, frustrated: 35 },
  { time: "10:15", calm: 35, engaged: 15, frustrated: 50 },
];

export const alerts = [
  {
    id: 1,
    level: "medium",
    message: "Student frustration has increased for the last 10 minutes.",
  },
  {
    id: 2,
    level: "high",
    message: "Trust score is high enough to recommend tutor intervention.",
  },
];

export const tutorActions = [
  "Slow down the explanation",
  "Ask if the student needs clarification",
  "Switch to an easier example",
  "Provide encouragement and reassurance",
];
"use client";

import { JitsiMeeting } from "@jitsi/react-sdk";

type Props = {
  roomName: string;
  displayName: string;
  email?: string;
  height?: string;
};

export default function JitsiMeetingRoom({
  roomName,
  displayName,
  email,
  height = "600px",
}: Props) {
  const userEmail =
    email || `${displayName.replace(/\s+/g, "").toLowerCase()}@demo.com`;
  const jitsiUrl = `https://meet.jit.si/${encodeURIComponent(roomName)}`;

  return (
    <div className="w-full overflow-hidden rounded-3xl">
      <JitsiMeeting
        domain="meet.jit.si"
        roomName={roomName}
        userInfo={{
          displayName,
          email: userEmail,
        }}
        configOverwrite={{
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
        }}
        interfaceConfigOverwrite={{
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        }}
        onApiReady={(api) => {
          console.log("Jitsi API Ready");

          api.addListener("videoConferenceJoined", () => {
            console.log(`${displayName} joined meeting`);
          });

          api.addListener("participantJoined", (participant) => {
            console.log("Participant joined:", participant);
          });
        }}
        getIFrameRef={(iframeRef) => {
          iframeRef.style.width = "100%";
          iframeRef.style.height = height;
          iframeRef.style.border = "0";
          iframeRef.style.borderRadius = "24px";
        }}
      />
      <div className="flex items-center justify-between gap-3 bg-slate-950 px-4 py-3 text-sm text-white">
        <span className="text-white/80">
          If Jitsi asks for a moderator, open the room and sign in to start it.
        </span>
        <a
          href={jitsiUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-lg bg-white px-3 py-2 font-semibold text-slate-900"
        >
          Open Jitsi
        </a>
      </div>
    </div>
  );
}

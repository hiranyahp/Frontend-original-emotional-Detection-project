"use client";

import { JitsiMeeting } from "@jitsi/react-sdk";

type Props = {
  roomName: string;
  displayName: string;
  email?: string; // optional, we’ll auto-generate if not provided
};

export default function JitsiStudentMeeting({
  roomName,
  displayName,
  email,
}: Props) {

  // fallback email (auto-generate if not given)
  const userEmail =
    email || `${displayName.replace(/\s+/g, "").toLowerCase()}@demo.com`;

  return (
    <div className="w-full">
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
            console.log("Joined meeting");
          });

          api.addListener("participantJoined", (participant) => {
            console.log("Participant joined:", participant);
          });
        }}
        getIFrameRef={(iframeRef) => {
          iframeRef.style.width = "100%";
          iframeRef.style.height = "600px";
          iframeRef.style.border = "0";
          iframeRef.style.borderRadius = "20px";
        }}
      />
    </div>
  );
}
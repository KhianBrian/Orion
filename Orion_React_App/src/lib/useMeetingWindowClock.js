import { useEffect, useState } from "react";
import { nextMeetingWindowBoundary } from "./meetingWindowClock";

export function useMeetingWindowClock(appointments) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const boundary = nextMeetingWindowBoundary(appointments, now.getTime());
    if (!boundary) return undefined;

    const timeout = window.setTimeout(() => setNow(new Date()), boundary - Date.now() + 1);
    return () => window.clearTimeout(timeout);
  }, [appointments, now]);

  return now;
}

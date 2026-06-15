"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type { JobUpdateEvent } from "@/types/job";
import { getSocketUrl } from "@/lib/api";
import { getToken } from "@/lib/auth";

export function useJobSocket(onUpdate: (update: JobUpdateEvent) => void): void {
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket: Socket = io(getSocketUrl(), {
      path: "/socket.io/",
      query: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("job_update", (payload: JobUpdateEvent) => {
      callbackRef.current(payload);
    });

    return () => {
      socket.disconnect();
    };
  }, []);
}

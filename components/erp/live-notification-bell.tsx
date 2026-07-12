"use client";

import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import type { Role } from "@/lib/types";
import { getFirebaseDb } from "@/lib/firebase/client";
import { NotificationBell } from "@/components/erp/notification-bell";

let audioContext: AudioContext | null = null;

function getAudioContext() {
  const AudioContextClass =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext ??= new AudioContextClass();
  return audioContext;
}

function playAttentionSound() {
  try {
    const context = getAudioContext();
    if (!context) return;
    if (context.state === "suspended") void context.resume().catch(() => undefined);

    const startAt = context.currentTime + 0.02;
    const tones = [
      { frequency: 660, start: 0, duration: 0.12 },
      { frequency: 880, start: 0.16, duration: 0.14 },
      { frequency: 1175, start: 0.34, duration: 0.16 },
    ];

    for (const tone of tones) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(tone.frequency, startAt + tone.start);
      gain.gain.setValueAtTime(0.0001, startAt + tone.start);
      gain.gain.exponentialRampToValueAtTime(0.18, startAt + tone.start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + tone.start + tone.duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt + tone.start);
      oscillator.stop(startAt + tone.start + tone.duration + 0.02);
    }

    navigator.vibrate?.([80, 35, 80]);
  } catch {
    navigator.vibrate?.(120);
  }
}

export function LiveNotificationBell({
  userId,
  role,
  initialUnreadCount,
}: {
  userId: string;
  role: Role;
  initialUnreadCount: number;
}) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const idsRef = useRef({ user: new Set<string>(), role: new Set<string>() });
  const seenSourcesRef = useRef({ user: false, role: false });
  const lastCountRef = useRef(initialUnreadCount);
  const initializedRef = useRef(false);

  useEffect(() => {
    const unlock = () => {
      const context = getAudioContext();
      if (context?.state === "suspended") void context.resume().catch(() => undefined);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) return;

    function updateCount(source: "user" | "role", ids: Set<string>) {
      idsRef.current = { ...idsRef.current, [source]: ids };
      seenSourcesRef.current = { ...seenSourcesRef.current, [source]: true };
      const nextCount = new Set([...idsRef.current.user, ...idsRef.current.role]).size;
      setUnreadCount(nextCount);

      if (!initializedRef.current && seenSourcesRef.current.user && seenSourcesRef.current.role) {
        lastCountRef.current = nextCount;
        initializedRef.current = true;
        return;
      }

      if (initializedRef.current && nextCount > lastCountRef.current) {
        playAttentionSound();
      }
      lastCountRef.current = nextCount;
    }

    const notificationsRef = collection(db, "notifications");
    const userQuery = query(
      notificationsRef,
      where("recipientUserId", "==", userId),
      where("isRead", "==", false),
    );
    const roleQuery = query(
      notificationsRef,
      where("recipientRole", "==", role),
      where("isRead", "==", false),
    );

    const unsubscribeUser = onSnapshot(userQuery, (snapshot) =>
      updateCount("user", new Set(snapshot.docs.map((doc) => doc.id))),
    );
    const unsubscribeRole = onSnapshot(roleQuery, (snapshot) =>
      updateCount("role", new Set(snapshot.docs.map((doc) => doc.id))),
    );

    return () => {
      unsubscribeUser();
      unsubscribeRole();
    };
  }, [role, userId]);

  return <NotificationBell unreadCount={unreadCount} />;
}

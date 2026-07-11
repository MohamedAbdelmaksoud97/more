"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "@/lib/firebase/client";

let notificationAudioContext: AudioContext | null = null;

function getAudioContext() {
  const AudioContextClass =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  notificationAudioContext ??= new AudioContextClass();
  return notificationAudioContext;
}

async function unlockNotificationSound() {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") await context.resume().catch(() => undefined);

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.01);
}

function playNotificationSound() {
  try {
    const context = getAudioContext();
    if (!context) return;
    if (context.state === "suspended") void context.resume().catch(() => undefined);

    const startAt = context.currentTime + 0.02;
    const tones = [
      { frequency: 740, start: 0, duration: 0.13 },
      { frequency: 988, start: 0.17, duration: 0.16 },
      { frequency: 1318, start: 0.37, duration: 0.12 },
    ];

    for (const tone of tones) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(tone.frequency, startAt + tone.start);
      gain.gain.setValueAtTime(0.0001, startAt + tone.start);
      gain.gain.exponentialRampToValueAtTime(0.22, startAt + tone.start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + tone.start + tone.duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt + tone.start);
      oscillator.stop(startAt + tone.start + tone.duration + 0.02);
    }

    navigator.vibrate?.([90, 40, 90]);
  } catch {
    navigator.vibrate?.(140);
  }
}

export function FcmRegistration() {
  const [toast, setToast] = useState<{ title: string; body?: string } | null>(null);

  useEffect(() => {
    const unlock = () => void unlockNotificationSound();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let toastTimer: number | undefined;

    async function register() {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;
      }
      if (Notification.permission !== "granted") return;
      const messaging = await getFirebaseMessaging();
      if (!messaging || cancelled) return;
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      }).catch(() => null);
      if (token) {
        await fetch("/api/fcm/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }).catch(() => undefined);
      }
      onMessage(messaging, (payload) => {
        const title = payload.notification?.title ?? "إشعار جديد";
        const body = payload.notification?.body;
        playNotificationSound();
        setToast({ title, body });
        if (toastTimer) window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => setToast(null), 6500);
        if (payload.notification?.title) {
          new Notification(payload.notification.title, { body });
        }
      });
    }

    void register();
    return () => {
      cancelled = true;
      if (toastTimer) window.clearTimeout(toastTimer);
    };
  }, []);

  return toast ? (
    <div className="fixed left-4 top-24 z-[80] w-[min(360px,calc(100vw-2rem))] animate-in slide-in-from-left-5">
      <div className="relative overflow-hidden rounded-lg border border-amber-200 bg-white p-4 shadow-2xl ring-4 ring-amber-100">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-blue-600 to-emerald-500" />
        <div className="flex gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700 ring-4 ring-amber-50">
            <BellRing className="size-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <p className="font-black text-slate-950">{toast.title}</p>
            {toast.body ? <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{toast.body}</p> : null}
          </div>
        </div>
      </div>
    </div>
  ) : null;
}

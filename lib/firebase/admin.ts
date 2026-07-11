import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getMessaging, type Messaging } from "firebase-admin/messaging";
import { isConfigured, safePrivateKey } from "@/lib/utils";

export function hasFirebaseAdminConfig() {
  return (
    isConfigured(process.env.FIREBASE_ADMIN_PROJECT_ID) &&
    isConfigured(process.env.FIREBASE_ADMIN_CLIENT_EMAIL) &&
    isConfigured(process.env.FIREBASE_ADMIN_PRIVATE_KEY)
  );
}

export function getAdminApp(): App | null {
  if (!hasFirebaseAdminConfig()) return null;
  if (getApps().length) return getApps()[0] ?? null;

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: safePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
    }),
  });
}

export function getAdminAuth(): Auth | null {
  const app = getAdminApp();
  return app ? getAuth(app) : null;
}

export function getAdminDb(): Firestore | null {
  const app = getAdminApp();
  return app ? getFirestore(app) : null;
}

export function getAdminMessaging(): Messaging | null {
  const app = getAdminApp();
  return app ? getMessaging(app) : null;
}

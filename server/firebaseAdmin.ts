import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;

interface AppletConfig {
  projectId?: string;
  firestoreDatabaseId?: string;
}

function loadAppletConfig(): AppletConfig | null {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (err) {
    // ignore
  }
  return null;
}

export function isFirebaseConfigured(): boolean {
  const appletConfig = loadAppletConfig();
  const projectId = appletConfig?.projectId;
  return Boolean(projectId && projectId !== 'your-project-id' && !projectId.includes('your-'));
}

export function initFirebaseAdmin(): { app: App | null; auth: Auth | null; db: Firestore | null } {
  if (!adminApp && getApps().length === 0) {
    const appletConfig = loadAppletConfig();
    const projectId = appletConfig?.projectId;
    const databaseId = appletConfig?.firestoreDatabaseId;

    try {
      if (projectId && projectId !== 'your-project-id' && !projectId.includes('your-')) {
        adminApp = initializeApp({ projectId });
      } else {
        adminApp = initializeApp();
      }
      adminAuth = getAuth(adminApp);
      // In container environments, server-side Admin Firestore requires dedicated IAM
      // credentials on the target project. The client-side Firebase SDK directly connects
      // using user Auth credentials and Firestore security rules.
      adminDb = null;
      console.log(`[Firebase Admin] Initialized auth for project: ${projectId || 'default'}`);
    } catch (err) {
      console.warn(
        '[Firebase Admin] Could not initialize auth:',
        err instanceof Error ? err.message : String(err)
      );
    }
  } else if (!adminApp && getApps().length > 0) {
    adminApp = getApps()[0];
    adminAuth = getAuth(adminApp);
    adminDb = null;
  }

  return { app: adminApp, auth: adminAuth, db: null };
}

export function getAdminAuth(): Auth | null {
  return initFirebaseAdmin().auth;
}

export function getAdminDb(): Firestore | null {
  return null;
}

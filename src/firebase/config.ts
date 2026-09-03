import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseAppletConfig from '../../firebase-applet-config.json';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
}

const envConfig: FirebaseClientConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseAppletConfig?.apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig?.authDomain || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig?.projectId || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig?.storageBucket || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig?.messagingSenderId || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseAppletConfig?.appId || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseAppletConfig?.measurementId || '',
  firestoreDatabaseId: firebaseAppletConfig?.firestoreDatabaseId || '',
};

/**
 * Checks if a real, non-placeholder Firebase configuration has been provided.
 */
export function isFirebaseConfiguredClient(): boolean {
  return Boolean(
    envConfig.apiKey &&
      envConfig.apiKey !== 'your-api-key' &&
      !envConfig.apiKey.includes('your-') &&
      envConfig.projectId &&
      envConfig.projectId !== 'your-project-id'
  );
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfiguredClient()) {
  try {
    app = getApps().length === 0 ? initializeApp(envConfig) : getApps()[0];
    auth = getAuth(app);
    const databaseId = envConfig.firestoreDatabaseId && envConfig.firestoreDatabaseId !== '(default)'
      ? envConfig.firestoreDatabaseId
      : undefined;
    db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
    console.log('[Firebase Client] Initialized successfully for project:', envConfig.projectId, databaseId ? `(db: ${databaseId})` : '');
  } catch (err) {
    console.error('[Firebase Client] Initialization error:', err);
  }
}

export { app, auth, db, envConfig };

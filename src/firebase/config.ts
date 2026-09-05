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

const clientConfig: FirebaseClientConfig = {
  apiKey: firebaseAppletConfig?.apiKey || '',
  authDomain: firebaseAppletConfig?.authDomain || '',
  projectId: firebaseAppletConfig?.projectId || '',
  storageBucket: firebaseAppletConfig?.storageBucket || '',
  messagingSenderId: firebaseAppletConfig?.messagingSenderId || '',
  appId: firebaseAppletConfig?.appId || '',
  measurementId: firebaseAppletConfig?.measurementId || '',
  firestoreDatabaseId: firebaseAppletConfig?.firestoreDatabaseId || '',
};

/**
 * Checks if a real, non-placeholder Firebase configuration has been provided.
 */
export function isFirebaseConfiguredClient(): boolean {
  return Boolean(
    clientConfig.apiKey &&
      clientConfig.apiKey !== 'your-api-key' &&
      !clientConfig.apiKey.includes('your-') &&
      clientConfig.projectId &&
      clientConfig.projectId !== 'your-project-id'
  );
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfiguredClient()) {
  try {
    app = getApps().length === 0 ? initializeApp(clientConfig) : getApps()[0];
    auth = getAuth(app);
    const databaseId = clientConfig.firestoreDatabaseId && clientConfig.firestoreDatabaseId !== '(default)'
      ? clientConfig.firestoreDatabaseId
      : undefined;
    db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
    console.log('[Firebase Client] Initialized successfully from firebase-applet-config.json for project:', clientConfig.projectId, databaseId ? `(db: ${databaseId})` : '');
  } catch (err) {
    console.error('[Firebase Client] Initialization error:', err);
  }
}

export { app, auth, db, clientConfig as envConfig };

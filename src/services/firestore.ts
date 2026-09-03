import {
  doc,
  getDocFromServer,
  collection,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config.js';
import { JournalEntry, MoodRewind } from '../types.js';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Standard Firestore error handler conforming strictly to Firebase Skill requirements.
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validate connection on boot as mandated by the Firebase skill.
 */
export async function testConnection(): Promise<void> {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

/**
 * Real-time listener for user's journal entries.
 */
export function subscribeToUserJournals(
  userId: string,
  onData: (journals: JournalEntry[]) => void,
  onError?: (error: Error) => void
): Unsubscribe | null {
  if (!db || !userId) return null;

  const path = `users/${userId}/journals`;
  try {
    const q = query(collection(db, 'users', userId, 'journals'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: JournalEntry[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            userId,
            title: data.title || 'Untitled Reflection',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            moodScore: typeof data.moodScore === 'number' ? data.moodScore : 4,
            themes: Array.isArray(data.themes) ? data.themes : [],
            messages: Array.isArray(data.messages) ? data.messages : [],
            atmospheric: data.atmospheric || undefined,
            companionTone: data.companionTone || 'mindful',
          };
        });
        onData(list);
      },
      (error) => {
        if (onError) {
          onError(error);
        }
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
    return unsubscribe;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

/**
 * Real-time listener for user's Mood Rewind snapshots.
 */
export function subscribeToUserRewinds(
  userId: string,
  onData: (rewinds: MoodRewind[]) => void,
  onError?: (error: Error) => void
): Unsubscribe | null {
  if (!db || !userId) return null;

  const path = `users/${userId}/rewinds`;
  try {
    const q = query(collection(db, 'users', userId, 'rewinds'), orderBy('generatedAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: MoodRewind[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            userId,
            generatedAt: data.generatedAt || new Date().toISOString(),
            summaryText: data.summaryText || '',
            emotionalHighs: Array.isArray(data.emotionalHighs) ? data.emotionalHighs : [],
            recurringThemes: Array.isArray(data.recurringThemes) ? data.recurringThemes : [],
            emotionalTrend: data.emotionalTrend || '',
            averageMood: typeof data.averageMood === 'number' ? data.averageMood : 4,
            geminiReflection: data.geminiReflection || '',
            entriesAnalyzedCount:
              typeof data.entriesAnalyzedCount === 'number' ? data.entriesAnalyzedCount : 0,
          };
        });
        onData(list);
      },
      (error) => {
        if (onError) {
          onError(error);
        }
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
    return unsubscribe;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

/**
 * Persist or update a journal document in Firestore under users/{userId}/journals/{journalId}
 */
export async function persistJournal(userId: string, journal: JournalEntry): Promise<void> {
  if (!db || !userId) return;

  const path = `users/${userId}/journals/${journal.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'journals', journal.id);
    const payload = {
      title: journal.title,
      createdAt: journal.createdAt,
      updatedAt: journal.updatedAt,
      moodScore: journal.moodScore,
      themes: journal.themes || [],
      messages: journal.messages || [],
      companionTone: journal.companionTone || 'mindful',
      ...(journal.atmospheric ? { atmospheric: journal.atmospheric } : {}),
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a journal entry in Firestore
 */
export async function deleteJournalDoc(userId: string, journalId: string): Promise<void> {
  if (!db || !userId) return;

  const path = `users/${userId}/journals/${journalId}`;
  try {
    const docRef = doc(db, 'users', userId, 'journals', journalId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Persist a Mood Rewind in Firestore under users/{userId}/rewinds/{rewindId}
 */
export async function persistRewind(userId: string, rewind: MoodRewind): Promise<void> {
  if (!db || !userId) return;

  const path = `users/${userId}/rewinds/${rewind.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'rewinds', rewind.id);
    await setDoc(docRef, rewind, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

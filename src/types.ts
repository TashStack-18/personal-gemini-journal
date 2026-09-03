export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  emailVerified: boolean;
  isSimulated?: boolean;
}

export interface JournalMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface AtmosphericContext {
  locationName: string;
  temperature: number;
  feelsLike?: number;
  condition: string;
  humidity?: number;
  windSpeed?: number;
  weatherCode?: number;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  moodScore: number;
  themes?: string[];
  atmospheric?: AtmosphericContext;
  companionTone?: 'mindful' | 'curious' | 'grounded';
  messages: JournalMessage[];
}

export interface MoodRewind {
  id: string;
  userId: string;
  generatedAt: string;
  summaryText: string;
  emotionalHighs: string[];
  emotionalLows?: string[];
  recurringThemes: string[];
  patternsNotice?: string[];
  emotionalTrend: string;
  averageMood: number;
  geminiReflection: string;
  gentleQuestion?: string;
  entriesAnalyzedCount: number;
}

export interface AuthContextType {
  user: AppUser | null;
  idToken: string | null;
  loading: boolean;
  isFirebaseLive: boolean;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}


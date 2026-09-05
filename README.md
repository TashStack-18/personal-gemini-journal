# Personal Gemini Journal

> Built for the **Accelerate AI with Cloud Run** Challenge (Cohort 3).  
> A private, AI-powered emotional reflection sanctuary designed to bridge the gap between daily journaling and long-term psychological insight.

[![Cloud Run](https://img.shields.io/badge/Google%20Cloud-Cloud%20Run-4285F4?logo=googlecloud&logoColor=white)](https://cloud.google.com/run)
[![Gemini](https://img.shields.io/badge/AI-Gemini%203.8%20Flash-8E75B2?logo=google&logoColor=white)](https://ai.google.dev/)
[![Firebase](https://img.shields.io/badge/Backend-Firebase%20%26%20Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Project Overview

**Personal Gemini Journal** is a secure, contemplative web application where users write candidly, converse with an empathetic AI companion (powered by **Gemini 3.8 Flash**), and revisit their past thoughts through an AI-synthesized **Mood Rewind** that maps emotional trajectories and surfaces subtle patterns across entries.

Rather than acting as a generic chatbot with a notebook interface, Personal Gemini Journal treats personal reflections as private artifacts. It grounds reflections in physical time, weather, and emotional resonance while enforcing strict tenant isolation across both server endpoints and Firestore database rules.

---

## Problem Statement

Most people who attempt to keep a personal journal abandon it or fail to gain lasting value:
1. **The Blank Page Paralysis:** Facing an empty screen without structured prompts causes cognitive friction.
2. **One-Way Monologues:** Traditional journals cannot validate, reframe, or question your thoughts constructively.
3. **The Re-Reading Deficit:** Users rarely re-read past entries; as a result, recurring stressors, emotional triggers, and uncelebrated victories remain hidden in static text archives.
4. **The Privacy Dilemma:** Users hesitate to share vulnerable feelings with AI systems unless they have verifiable assurance that their data is cryptographically isolated and never co-mingled.

**Personal Gemini Journal** solves this by establishing a conversational reflection loop: **Capture → Reflect → Discover → Remember**.

---

## Features (Fully Implemented)

- **Google Firebase Authentication**: One-click Google Sign-In with automatic user profile creation and ID token generation.
- **Private Journaling**: Focused, distraction-free writing environment with real-time word counting, reading time estimates, auto-save state indicators, and tag management.
- **Mood Tracking**: 5-tier emotional spectrum scale (*Overwhelmed*, *Uncertain*, *Still*, *Grounded*, *Radiant*) featuring custom color resonance and subtle ambient glows.
- **Atmospheric Context (Location & Weather)**: Live geolocation reverse-geocoded to locality, coupled with Open-Meteo real-time temperature, humidity, wind, and sky condition metrics (cached for 20 minutes with zero API keys required).
- **Gemini Multi-Turn Reflection**: Context-aware conversational partner powered by the server-side `@google/genai` SDK (`gemini-3.8-flash`). Engages in dialogue, reframes vulnerabilities, and ends each response with a single open-ended question.
- **Reflection Mode / Companion Lenses**: Switchable companion mindsets (*Mindful*, *Inquisitive*, *Grounded*) to adapt the tone of Gemini's responses to your immediate need.
- **Cloud Firestore Persistence**: Real-time reactive data synchronization (`onSnapshot`) with server-side Admin SDK fallback.
- **User Isolation**: Cryptographic verification of Firebase ID tokens on every request; all data strictly isolated under `users/{userId}/...`.
- **Mood Rewind (Original Feature)**: Deep retrospective synthesizer analyzing historical entries and mood vectors to produce narrative overviews, emotional highs/lows, recurring themes, observed patterns, and an interactive SVG trajectory wave.
- **Smart Journal Search**: Search modal featuring suggested reflective spark queries (e.g., *"When did I feel most peaceful?"*), emotional spectrum filters, and full-text keyword indexing across titles, thoughts, and locations.
- **On This Day**: Automated keepsake discovery algorithm identifying calendar anniversary reflections or milestone entries from past days.
- **AI Writing Prompts**: Curated and rotating "Thought Sparks" that can be shuffled or inserted directly into the writing canvas with one click.

---

## Original Feature: Mood Rewind

**Mood Rewind** is the core differentiating capability of Personal Gemini Journal.

While standard journaling tools merely search or filter by dates, Mood Rewind acts as an objective, compassionate observer across time:
- **Trajectory Mapping**: Calculates continuous emotional waves connecting chronological reflections into a smooth visual curve.
- **Pattern Recognition**: Uncovers behavioral correlations (e.g., how morning walks correlate with higher mood stability, or how specific recurring deadlines trigger anxiety).
- **Thematic Clustering**: Identifies subconscious topics recurring across disparate reflections.
- **Compassionate Synthesis**: Produces a personalized retrospective letter directly from Gemini, celebrating resilience and proposing a gentle guiding question for the future.

---

## Google Technologies

| Technology | Architectural Role |
|---|---|
| **Gemini 3.8 Flash** (`@google/genai`) | Powers companion reflections, multi-turn dialogue, tone modulation, and multi-entry retrospective synthesis in Mood Rewind. |
| **Firebase Authentication** | Secure Google OAuth token acquisition on the client via `GoogleAuthProvider` and `signInWithPopup`. |
| **Cloud Firestore** | NoSQL document database providing document-level tenant isolation, real-time client synchronization, and strict Security Rules. |
| **Google Cloud Secret Manager** | Securely mounts `GEMINI_API_KEY` at runtime in production without committing keys or storing `.env` files. |
| **Google Cloud Run** | Fully managed containerized hosting executing the production Node.js/Express server and serving the compiled SPA. |

---

## Architecture

```
                                  BROWSER (Vite + React)
                     ┌──────────────────────────────────────────────┐
                     │  - JournalEditor & SignatureMoodScale        │
                     │  - HistoryView & Smart Search                │
                     │  - Mood Rewind (SVG Trajectory Wave)         │
                     │  - Firebase Web SDK (Auth / Firestore Sync)  │
                     └───────────────┬──────────────────────────────┘
                                     │ 1. Firebase Google Auth
                                     ▼
                          Firebase Authentication
                        (Issues signed JWT ID Token)
                                     │
                                     │ 2. Attach Authorization: Bearer <idToken>
                                     ▼
                       GOOGLE CLOUD RUN CONTAINER (:8080)
                     ┌──────────────────────────────────────────────┐
                     │  Express Backend (dist/server.cjs)           │
                     │  ├── Token Verification (Firebase Admin)     │
                     │  │   └── Derives verified req.user.uid       │
                     │  ├── Scoped Route Handlers (/api/journals)   │
                     │  │   └── users/{uid}/journals/{journalId}    │
                     │  │   └── users/{uid}/rewinds/{rewindId}      │
                     │  └── Static Vite SPA Assets (dist/)          │
                     └──────────────┬───────────────────────────────┘
                                    │
             ┌──────────────────────┴──────────────────────┐
             │ 3. Server-side Gemini API                   │ 4. Scoped Firestore Access
             ▼                                             ▼
   Google Gen AI SDK                              Cloud Firestore Database
   (gemini-3.8-flash)                          users/{userId}/journals/{journalId}
   GEMINI_API_KEY from Secret Manager          users/{userId}/rewinds/{rewindId}
                                               (Enforced by firestore.rules)
```

---

## Security & Defense-in-Depth

1. **Authentication**: Uses official Firebase Google Sign-In. Tokens are cryptographically signed JWTs with short lifespans and automatic refresh cycles.
2. **Authorization**: Every backend API endpoint (`/api/journals/*`) routes through `requireAuth` middleware, which calls `firebase-admin/auth` `verifyIdToken()`.
3. **No Client Trust**: The backend strictly ignores any client-supplied `userId`. All operations derive user identity exclusively from `decodedToken.uid`.
4. **Firestore Security Rules**: Rules enforce that clients can only read/write documents where `request.auth.uid == userId`. Cross-tenant access is rejected by Firestore's internal access engine:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, update: if request.auth != null && request.auth.uid == userId;
         allow create: if request.auth != null && request.auth.uid == userId;
         allow delete: if false;

         match /journals/{journalId} {
           allow read, write: if request.auth != null && request.auth.uid == userId;
         }

         match /rewinds/{rewindId} {
           allow read, write: if request.auth != null && request.auth.uid == userId;
         }
       }
       match /{document=**} {
         allow read, write: if false;
       }
     }
   }
   ```
5. **Secret Management**: No API keys or service account private keys are checked into source control. `GEMINI_API_KEY` is loaded server-side only via environment variables / Secret Manager.
6. **Prompt Injection Hardening**: All Gemini calls run through dedicated system instructions with strict structural guardrails, fixed JSON schemas, and role separation between user journals and model outputs.

---

## Local Setup

### Prerequisites
- Node.js 20+
- npm

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/personal-gemini-journal.git
   cd personal-gemini-journal
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment configuration:
   ```bash
   cp .env.example .env
   cp firebase-applet-config.example.json firebase-applet-config.json
   ```
4. Set your `GEMINI_API_KEY` in `.env` and fill in your Firebase Web App credentials in `firebase-applet-config.json`.
5. Start development server:
   ```bash
   npm run dev
   ```
6. Open `http://localhost:3000` in your browser.

---

## Firebase Setup

1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication** and add **Google** as a Sign-in Provider.
3. Add your domain (e.g., `localhost` or your Cloud Run URL) to **Authentication > Settings > Authorized domains**.
4. Create a **Cloud Firestore** database.
5. Deploy security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
6. In **Project Settings > General > Your apps**, register a Web App and copy the config parameters into `firebase-applet-config.json`.

---

## Environment Variables

| Variable | Scope | Secret? | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | Server-side only | **YES** | Google AI Studio / Vertex AI Gemini API key. |
| `PORT` | Server-side runtime | No | Port on which the Express server listens (defaults to `8080` in Cloud Run, `3000` in dev). |
| `NODE_ENV` | Build/Runtime | No | Set to `production` in container. |
| `K_SERVICE` | Cloud Run runtime | No | Automatically injected by Google Cloud Run. |

> **Note:** Client configuration is stored in `firebase-applet-config.json`. These are public client identifiers (API key, project ID) guarded by Firestore Security Rules.

---

## Docker Container

A multi-stage `Dockerfile` is included for building minimal, hardened production images:

```bash
# Build Docker image
docker build -t personal-gemini-journal:latest .

# Run Docker container locally
docker run -p 8080:8080 -e GEMINI_API_KEY="your-gemini-api-key" personal-gemini-journal:latest
```

---

## Google Cloud Run Deployment

Deploy directly using the Google Cloud CLI.

> **CRITICAL REQUIREMENT:** The Cloud Run service **MUST** include the label `dev-tutorial=cloud-run-ai-challenge`.

### Deployment Command

```bash
# 1. Set your GCP project ID
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"
gcloud config set project $PROJECT_ID

# 2. Store your Gemini API Key in Google Cloud Secret Manager
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=- \
  || echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add gemini-api-key --data-file=-

# 3. Grant Secret Accessor permission to the default compute service account
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 4. Build and deploy directly from source to Cloud Run with required label
gcloud run deploy personal-gemini-journal \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=gemini-api-key:latest \
  --labels dev-tutorial=cloud-run-ai-challenge
```

### Label Verification
Verify that the required label has been successfully applied to your service:
```bash
gcloud run services describe personal-gemini-journal \
  --region $REGION \
  --format="value(metadata.labels['dev-tutorial'])"
```
*Expected output:* `cloud-run-ai-challenge`

---

## Repository Structure

```
personal-gemini-journal/
├── Dockerfile                   # Multi-stage production container build
├── .dockerignore                # Container build context exclusions
├── .gitignore                   # Strict secret and credential exclusion rules
├── .env.example                 # Documented environment variable template
├── firebase-applet-config.json  # Active Firebase client configuration
├── firebase-blueprint.json      # Firestore collection and index schema definitions
├── firestore.rules              # Deployed Firestore security and isolation rules
├── index.html                   # HTML entry point with metadata tags
├── metadata.json                # AI Studio application metadata
├── package.json                 # Node dependencies and build scripts
├── server.ts                    # Express + Vite server entry point with dynamic port handling
├── server/
│   ├── firebaseAdmin.ts         # Firebase Admin SDK initialization & token verifier
│   ├── gemini.ts                # Gemini 3.8 Flash SDK companion & rewind logic
│   ├── middleware/
│   │   └── auth.ts              # Bearer token authentication middleware
│   └── routes/
│       ├── auth.ts              # Authentication health check endpoints
│       └── journals.ts          # Scoped journal CRUD, chat, and rewind endpoints
└── src/
    ├── App.tsx                  # Root layout, real-time listener, and view switcher
    ├── components/
    │   ├── AuthCard.tsx         # Google Sign-In interface with privacy badges
    │   ├── HistoryView.tsx      # Chronological archive with full-text search & filters
    │   ├── JournalEditor.tsx    # Distraction-free editor, prompt sparks, On This Day
    │   ├── MoodRewindView.tsx   # Original feature: interactive emotional wave & analysis
    │   ├── Navbar.tsx           # Navigation header, user profile, and sign-out
    │   └── SignatureMoodScale.tsx # 5-tier emotional resonance selector
    ├── contexts/
    │   └── AuthContext.tsx      # Firebase auth provider & state management
    ├── services/
    │   ├── api.ts               # Authenticated API client
    │   ├── firestore.ts         # Direct Firestore client sync & queries
    │   └── weather.ts           # Geolocation and atmospheric weather provider
    └── types.ts                 # Shared TypeScript interfaces
```

---

## 3–5 Minute Judge Demo Flow

Follow this flow for an impactful presentation:
1. **Landing & Google Sign-In (0:00 - 0:30)**: Open the app, highlight the privacy badge (*Private & Encrypted in Cloud Firestore*), and click **Continue with Google**.
2. **Contextual Capture (0:30 - 1:15)**: Notice the automatically detected atmospheric weather and location pill. Select an emotional resonance on the **Signature Mood Scale** (e.g., *Grounded* or *Uncertain*).
3. **Thought Sparks & Writing (1:15 - 1:45)**: Click **Use Prompt** from the AI Writing Prompt spark or type a personal reflection.
4. **Gemini Reflection Dialogue (1:45 - 2:30)**: Click **Reflect with Gemini**. Show how Gemini acknowledges the thoughts and weather, offers a reframing perspective, and asks a gentle question. Reply directly to demonstrate multi-turn reflection.
5. **Memory Discovery (2:30 - 3:15)**: Open **Smart Journal Search**, search for *"When did I feel most peaceful?"*, and inspect **On This Day** to demonstrate retrospective discovery.
6. **Mood Rewind (Original Feature) (3:15 - 4:15)**: Navigate to the **Rewind** tab. Click **Generate Mood Rewind** to reveal the synthesized narrative, emotional trajectory wave, recurring themes, and Gemini's personal note.
7. **Cloud Run & Security Wrap-up (4:15 - 5:00)**: Highlight the Cloud Run deployment with label `dev-tutorial=cloud-run-ai-challenge`, explain the zero-trust token verification, and show that each user's data is strictly inaccessible to anyone else.

---

## Realistic Future Improvements

- **Voice Reflections**: Audio-in recording using Gemini Live API for spoken stream-of-consciousness journaling.
- **Biometric Offline Cache**: IndexedDB local encrypted cache for offline journaling with background sync upon reconnecting.
- **Quarterly Retrospective Exports**: Exportable, beautifully typeset PDF keepsake journals formatted with personal emotional trajectory charts.

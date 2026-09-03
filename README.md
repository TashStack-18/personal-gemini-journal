# Personal Gemini Journal

A secure, AI-powered journaling app built for Cohort 3: "Accelerate AI with Cloud Run." Write and talk through your thoughts with Gemini, then revisit them through an AI-generated Mood Rewind that surfaces patterns across your entries.

> This README follows the structure defined in `PROJECT_SPEC.md`.

## Features
- Firebase Authentication (sign up / log in / log out with email & password)
- Multi-turn journaling conversations with Gemini (Phase 5)
- Per-user isolated storage in Cloud Firestore (`users/{userId}/journals/{journalId}`)
- Strict Security Rules enforcing user isolation
- **Mood Rewind** — an AI-generated summary of recurring themes and emotional arc across recent entries (Phase 6)
- Secrets managed via Google Cloud Secret Manager (no hardcoded credentials)

## Architecture
See `PROJECT_SPEC.md` Section 6 for the full architecture diagram and explanation:
- React frontend (Vite + Tailwind) calls Firebase Auth directly to obtain signed ID tokens.
- Frontend attaches `Authorization: Bearer <idToken>` on backend requests.
- Node.js + Express backend verifies ID tokens using Firebase Admin SDK and extracts `uid`.
- Backend strictly scopes all data operations to `users/{uid}/...` — never trusting client-provided `userId`.
- Cloud Firestore Security Rules enforce isolation as defense-in-depth.

## Tech Stack
- Frontend: React (Vite) + Tailwind CSS
- Backend: Node.js + Express
- AI: Gemini API (via @google/genai)
- Auth: Firebase Authentication
- Database: Cloud Firestore
- Secrets: Google Cloud Secret Manager
- Hosting & Container: Google Cloud Run + Docker

## Setup & Running Locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure `.env`:
   Copy `.env.example` to `.env` and fill in your Firebase configuration from the Firebase Console.
3. Start the application:
   ```bash
   npm run dev
   ```
4. Open the application in your browser (default port 3000).

## Testing User Isolation
- Sign up with User A (`userA@example.com`), create a test journal entry.
- Log out.
- Sign up with User B (`userB@example.com`). Notice User B's dashboard is completely empty and isolated.
- Inspect network requests or backend logs to verify that the backend derives user identity strictly from the verified Firebase ID token.

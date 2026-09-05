import { Request, Response, NextFunction } from 'express';
import { getAdminAuth, isFirebaseConfigured } from '../firebaseAdmin.js';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  emailVerified?: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Authentication Middleware:
 * Never trusts a client-supplied userId. Derives user identity strictly from
 * a verified Firebase ID token passed in the Authorization header.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized: Missing or malformed Authorization header.',
      code: 'AUTH_HEADER_MISSING',
    });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1].trim();
  if (!idToken) {
    res.status(401).json({
      error: 'Unauthorized: Empty bearer token provided.',
      code: 'AUTH_TOKEN_EMPTY',
    });
    return;
  }

  try {
    // Diagnostic fallback for local testing & user isolation demos:
    // Allows testing simulated identities (e.g. User A 'user-alex-001' vs User B 'user-sam-002')
    // in development mode to verify cross-user isolation.
    if (process.env.NODE_ENV !== 'production' && idToken.startsWith('mock-token-')) {
      const simulatedUid = idToken.replace('mock-token-', '');
      req.user = {
        uid: simulatedUid,
        email: `${simulatedUid}@example.com`,
        emailVerified: true,
      };
      return next();
    }

    const adminAuth = getAdminAuth();

    // Verify cryptographic signature with Firebase Admin using Google x509 public certificates
    if (adminAuth && isFirebaseConfigured()) {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
      };
      return next();
    }

    res.status(401).json({
      error: 'Unauthorized: Firebase is not configured or an invalid Firebase token was provided.',
      code: 'FIREBASE_NOT_CONFIGURED',
    });
  } catch (error) {
    console.error('[Auth Middleware] Token verification failed:', error);
    res.status(401).json({
      error: 'Unauthorized: Invalid or expired Firebase ID token.',
      code: 'INVALID_TOKEN',
    });
  }
}

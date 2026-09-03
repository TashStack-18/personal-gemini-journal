import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { isFirebaseConfigured } from '../firebaseAdmin.js';

export const authRouter = Router();

/**
 * GET /api/auth/me
 * Validates the caller's Firebase ID token and returns the verified user identity.
 * Demonstrates server-derived user identity (ignoring any client spoofed userId).
 */
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    authenticated: true,
    user: {
      uid: req.user!.uid,
      email: req.user!.email,
      emailVerified: req.user!.emailVerified,
    },
    firebaseConfigured: isFirebaseConfigured(),
    message: 'Identity cryptographically derived and verified from Firebase ID token.',
  });
});

/**
 * POST /api/auth/verify-isolation
 * An educational test endpoint allowing verification of the security model:
 * Takes an optional `targetUserId` from the client request body,
 * and proves that the backend refuses to access `targetUserId` if it does not
 * strictly match the verified `req.user.uid`.
 */
authRouter.post('/verify-isolation', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const verifiedUid = req.user!.uid;
  const clientRequestedUid = req.body?.targetUserId;

  if (clientRequestedUid && clientRequestedUid !== verifiedUid) {
    res.status(403).json({
      success: false,
      error: 'Security Violation: Cross-user access attempt blocked.',
      details: {
        attemptedAccessTo: clientRequestedUid,
        verifiedTokenUid: verifiedUid,
        enforcement: 'Defense-in-depth: Server rejects client-supplied userId that diverges from verified ID token.',
      },
    });
    return;
  }

  res.json({
    success: true,
    message: 'Identity isolation verified. Access restricted strictly to authenticated user scope.',
    scopedPath: `users/${verifiedUid}/...`,
  });
});

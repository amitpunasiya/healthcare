import { initializeApp, getApps, cert, applicationDefault, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

let firebaseApp: App | null = null;
let firebaseAuth: Auth | null = null;

export const initFirebaseAdmin = (): { app: App; auth: Auth } => {
  if (firebaseApp && firebaseAuth) {
    return { app: firebaseApp, auth: firebaseAuth };
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseApp = existingApps[0];
    firebaseAuth = getAuth(firebaseApp);
    return { app: firebaseApp, auth: firebaseAuth };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (projectId && clientEmail && privateKey) {
    try {
      firebaseApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('[Firebase Admin] Successfully initialized with service account credentials.');
    } catch (err: any) {
      console.error('[Firebase Admin] Initialization error:', err?.message);
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      firebaseApp = initializeApp({
        credential: applicationDefault(),
      });
      console.log('[Firebase Admin] Initialized with Google Application Default Credentials.');
    } catch (err: any) {
      console.error('[Firebase Admin] ADC initialization error:', err?.message);
    }
  }

  if (!firebaseApp) {
    console.warn(
      '[Firebase Admin] Notice: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY is not set. Initializing dev fallback.'
    );
    try {
      firebaseApp = initializeApp({
        projectId: projectId || 'carepulse-dev',
      });
    } catch (err: any) {
      console.error('[Firebase Admin] Dev fallback error:', err?.message);
    }
  }

  firebaseAuth = getAuth(firebaseApp!);
  return { app: firebaseApp!, auth: firebaseAuth };
};

const { app, auth } = initFirebaseAdmin();
export { app, auth };
export default auth;

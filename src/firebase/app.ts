import { initializeApp } from 'firebase/app'
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signOut as fbSignOut,
} from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
/** Firestore database id. This project's database was created as "default" (not "(default)"). */
export const databaseId = import.meta.env.VITE_FIRESTORE_DATABASE || '(default)'
export const db = getFirestore(app, databaseId)

/** Local development against `firebase emulators:start` (VITE_USE_EMULATOR=1). */
export const usingEmulator = import.meta.env.VITE_USE_EMULATOR === '1'
if (usingEmulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

/** Emulator only: sign in as a fake Google user without a popup. */
export async function signInAsTestUser(name: string): Promise<void> {
  const token = JSON.stringify({ sub: name, email: `${name}@example.com`, name, email_verified: true })
  await signInWithCredential(auth, GoogleAuthProvider.credential(token))
}

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(auth, new GoogleAuthProvider())
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth)
}

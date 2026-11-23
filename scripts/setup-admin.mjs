// Creates or updates the admin account from environment variables. Run by the deploy workflow.
//   ADMIN_PASSWORD                       the admin's password (GitHub secret)
//   GOOGLE_APPLICATION_CREDENTIALS       service account key file (production)
//   FIREBASE_AUTH_EMULATOR_HOST          set to run against the Auth emulator instead
//   PROJECT_ID                           defaults to the project in .firebaserc
import { readFileSync } from 'node:fs'
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

// Keep in sync with src/admin/config.ts (and the UID with firestore.rules).
const ADMIN_UID = 'gamble-dice-admin'
const email = 'admin@gamble-dice.invalid'
const password = process.env.ADMIN_PASSWORD
const projectId = process.env.PROJECT_ID || JSON.parse(readFileSync('.firebaserc', 'utf8')).projects.default
const emulator = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST)

if (!password) {
  console.log('ADMIN_PASSWORD not set; skipping admin setup.')
  process.exit(0)
}
if (password.length < 8) {
  console.error('ADMIN_PASSWORD must be at least 8 characters.')
  process.exit(1)
}

const app = initializeApp(emulator ? { projectId } : { credential: applicationDefault(), projectId })

if (!emulator) {
  // Make sure email/password sign-in is enabled for the project.
  const token = (await app.options.credential.getAccessToken()).access_token
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config?updateMask=signIn.email.enabled,signIn.email.passwordRequired`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Goog-User-Project': projectId },
      body: JSON.stringify({ signIn: { email: { enabled: true, passwordRequired: true } } }),
    },
  )
  if (!res.ok) {
    console.error(`Could not enable email/password sign-in (HTTP ${res.status}): ${await res.text()}`)
    process.exit(1)
  }
  console.log('Email/password sign-in is enabled.')
}

const auth = getAuth(app)
try {
  await auth.getUser(ADMIN_UID)
  await auth.updateUser(ADMIN_UID, { email, password, emailVerified: true, disabled: false })
  console.log('Admin account updated.')
} catch (e) {
  if (e.code !== 'auth/user-not-found') throw e
  await auth.createUser({ uid: ADMIN_UID, email, password, emailVerified: true })
  console.log('Admin account created.')
}

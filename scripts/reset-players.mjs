// One-off maintenance: reset every player's coins to 1000 and clear gacha items and icon.
// Names, friend IDs, friends and rooms are kept. Run from the "Reset players" GitHub Actions workflow.
//   GOOGLE_APPLICATION_CREDENTIALS   service account key file (production)
//   FIRESTORE_EMULATOR_HOST          set to run against the emulator instead
//   PROJECT_ID                       defaults to the project in .firebaserc
//   DATABASE_ID                      defaults to VITE_FIRESTORE_DATABASE in .env, else "(default)"
import { readFileSync } from 'node:fs'
import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const INITIAL_COINS = 1000 // src/game/config.ts
const projectId = process.env.PROJECT_ID || JSON.parse(readFileSync('.firebaserc', 'utf8')).projects.default
const databaseId =
  process.env.DATABASE_ID || readFileSync('.env', 'utf8').match(/^VITE_FIRESTORE_DATABASE=(.+)$/m)?.[1]?.trim() || '(default)'
const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST)

const app = initializeApp(emulator ? { projectId } : { credential: applicationDefault(), projectId })
const db = getFirestore(app, databaseId)

const users = await db.collection('users').get()
let done = 0
for (let i = 0; i < users.docs.length; i += 400) {
  const batch = db.batch()
  for (const d of users.docs.slice(i, i + 400)) batch.update(d.ref, { coins: INITIAL_COINS, items: {}, icon: null })
  await batch.commit()
  done += Math.min(400, users.docs.length - i)
}
console.log(`Reset ${done} player(s) in ${projectId}/${databaseId}: coins=${INITIAL_COINS}, items and icon cleared.`)

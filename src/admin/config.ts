/**
 * The admin's Firebase Auth UID. The account is created by scripts/setup-admin.mjs (run from the deploy
 * workflow) from the ADMIN_EMAIL / ADMIN_PASSWORD GitHub secrets. Must match `isAdmin()` in firestore.rules.
 */
export const ADMIN_UID = 'gamble-dice-admin'

/**
 * The admin's Firebase Auth UID. The account is created by scripts/setup-admin.mjs (run from the deploy
 * workflow) from the ADMIN_PASSWORD GitHub secret. Must match `isAdmin()` in firestore.rules.
 */
export const ADMIN_UID = 'gamble-dice-admin'

/**
 * Firebase Auth needs an email, but the admin only types a password: this fixed, never-delivered address
 * (the .invalid domain is reserved) is used behind the scenes. Keep in sync with scripts/setup-admin.mjs.
 */
export const ADMIN_LOGIN_EMAIL = 'admin@gamble-dice.invalid'

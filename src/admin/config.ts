/**
 * SHA-256 of the admin password for the in-game /admin page. This is a friends-only game, so the password
 * is only a light lock: anyone reading the code could get past it. To change it, replace this hash with
 * the SHA-256 of the new password (e.g. `printf '%s' 'new-password' | sha256sum`).
 */
export const ADMIN_PASSWORD_SHA256 = 'a3c595e09a5e5965c826cd3d544ed2237d052160a56f087d61299879c3199319'

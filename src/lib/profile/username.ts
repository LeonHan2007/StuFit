const USERNAME_REGEX = /^[a-z][a-z0-9_]{2,29}$/;

export const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "settings",
  "stufit",
  "login",
  "signup",
  "social",
  "account",
  "dashboard",
  "workout",
  "plan",
]);

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(username: string): string | null {
  const normalized = normalizeUsername(username);
  if (!USERNAME_REGEX.test(normalized)) {
    return "Username must be 3–30 characters: lowercase letters, numbers, and underscores; must start with a letter.";
  }
  if (RESERVED_USERNAMES.has(normalized)) {
    return "This username is reserved.";
  }
  return null;
}

export function profileInitials(
  displayName: string | null | undefined,
  username: string | null | undefined
): string {
  if (displayName?.trim()) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return displayName.trim().slice(0, 2).toUpperCase();
  }
  if (username) return username.slice(0, 2).toUpperCase();
  return "?";
}

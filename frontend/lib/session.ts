export type Session = {
  token: string;
  role: "Admin" | "Department" | "Soldier";
  username: string;
  department?: string | null;
};

const KEY = "arjuna_session";

export function saveSession(session: Session) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function getSession(): Session | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

// Browser data store. Keeps the whole Db in localStorage behind one provider so the
// UI never touches storage directly; replacing this file with server calls is the
// only change needed to move to a real database.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { Db, User } from "./types";
import { makeSeed } from "./seed";
import { NotiError } from "./service";
import * as auth from "./auth";

const DB_KEY = "noti.db.v1";
const SESSION_KEY = "noti.session.v1";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

interface Session { userId: string; expiresAt: number }

interface NotiStore {
  ready: boolean;
  db: Db | null;
  user: User | null;
  run: (fn: (db: Db, user: User) => Db, success?: string) => boolean;
  runAsync: (fn: (db: Db, user: User) => Promise<Db>, success?: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<{ user?: User | undefined; error?: string | undefined }>;
  signUp: (input: unknown) => Promise<{ user?: User | undefined; error?: string | undefined }>;
  signOut: () => void;
  resetDemo: () => Promise<void>;
}

const Ctx = createContext<NotiStore | null>(null);

export function NotiProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Db | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const dbRef = useRef<Db | null>(null);

  const commit = useCallback((next: Db) => {
    dbRef.current = next;
    setDb(next);
    localStorage.setItem(DB_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let loaded: Db | null = null;
      try {
        const raw = localStorage.getItem(DB_KEY);
        if (raw) loaded = JSON.parse(raw) as Db;
      } catch { loaded = null; }
      if (!loaded || loaded.version !== 1) loaded = await makeSeed();
      if (cancelled) return;
      commit(loaded);
      try {
        const s = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as Session | null;
        if (s && s.expiresAt > Date.now() && loaded.users.some((u) => u.id === s.userId)) setSession(s);
        else localStorage.removeItem(SESSION_KEY);
      } catch { localStorage.removeItem(SESSION_KEY); }
    })();
    return () => { cancelled = true; };
  }, [commit]);

  // Expire the session while the tab is open.
  useEffect(() => {
    if (!session) return;
    const t = setTimeout(() => { setSession(null); localStorage.removeItem(SESSION_KEY); toast("Your session expired. Please sign in again."); }, session.expiresAt - Date.now());
    return () => clearTimeout(t);
  }, [session]);

  const user = useMemo(() => (db && session ? db.users.find((u) => u.id === session.userId) ?? null : null), [db, session]);

  const startSession = (u: User) => {
    const s = { userId: u.id, expiresAt: Date.now() + SESSION_TTL_MS };
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setSession(s);
  };

  const fail = (e: unknown) => {
    toast.error(e instanceof NotiError ? e.message : "Something went wrong. Please try again.");
    if (!(e instanceof NotiError)) console.error(e);
    return false;
  };

  const run: NotiStore["run"] = (fn, success) => {
    const cur = dbRef.current;
    if (!cur || !user) return false;
    try { commit(fn(cur, user)); if (success) toast.success(success); return true; } catch (e) { return fail(e); }
  };
  const runAsync: NotiStore["runAsync"] = async (fn, success) => {
    const cur = dbRef.current;
    if (!cur || !user) return false;
    try { commit(await fn(cur, user)); if (success) toast.success(success); return true; } catch (e) { return fail(e); }
  };

  const value: NotiStore = {
    ready: db !== null,
    db,
    user,
    run,
    runAsync,
    async signIn(email, password) {
      const cur = dbRef.current;
      if (!cur) return { error: "Still loading, try again" };
      const r = await auth.signIn(cur, { email, password });
      commit(r.db);
      if (r.user) startSession(r.user);
      return { user: r.user, error: r.error };
    },
    async signUp(input) {
      const cur = dbRef.current;
      if (!cur) return { error: "Still loading, try again" };
      try {
        const r = await auth.signUp(cur, input);
        commit(r.db);
        startSession(r.user);
        return { user: r.user };
      } catch (e) {
        return { error: e instanceof NotiError ? e.message : "Could not create the account" };
      }
    },
    signOut() { localStorage.removeItem(SESSION_KEY); setSession(null); },
    async resetDemo() { commit(await makeSeed()); localStorage.removeItem(SESSION_KEY); setSession(null); },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNoti() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useNoti must be used inside NotiProvider");
  return v;
}

export const dashboardPathFor = (role: User["role"]) =>
  (({ teacher: "/dashboard/teacher", student: "/dashboard/student", parent: "/dashboard/parent", admin: "/dashboard/admin" }) as const)[role];

"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { mobileApi } from "@/lib/api";
import { clearToken, getToken } from "@/lib/storage";

type SessionState = {
  ready: boolean;
  authenticated: boolean;
  user: null | {
    id: string;
    email: string;
    username: string;
    name: string;
    bio: string | null;
    avatarUrl: string | null;
    privacyDefault: string;
    subscriptionPlan?: string;
  };
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SessionState["user"]>(null);

  async function refresh() {
    const token = await getToken();
    if (!token) {
      setUser(null);
      setReady(true);
      return;
    }

    try {
      const bootstrap = await mobileApi.getBootstrap();
      setUser(bootstrap.user);
    } catch {
      await clearToken();
      setUser(null);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    let active = true;

    (async () => {
      const token = await getToken();
      if (!token) {
        if (active) {
          setUser(null);
          setReady(true);
        }
        return;
      }

      try {
        const bootstrap = await mobileApi.getBootstrap();
        if (active) {
          setUser(bootstrap.user);
        }
      } catch {
        await clearToken();
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setReady(true);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <SessionContext.Provider
      value={{
        ready,
        authenticated: Boolean(user),
        user,
        async signIn(email, password) {
          await mobileApi.signIn(email, password);
          await refresh();
        },
        async signOut() {
          await mobileApi.signOut();
          setUser(null);
        },
        refresh,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return value;
}
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setLoading(true);
        setError("");

        const form = new FormData(event.currentTarget);
        const email = String(form.get("email") || "");
        const password = String(form.get("password") || "");

        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError(
            result.error === "AUTH_RATE_LIMITED"
              ? "Too many login attempts. Please try again later."
              : "Could not sign in. Check your credentials.",
          );
          setLoading(false);
          return;
        }

        router.push("/dashboard");
        router.refresh();
      }}
    >
      <Input name="email" type="email" placeholder="you@email.com" required />
      <Input name="password" type="password" placeholder="••••••••" required minLength={8} />
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <Button className="w-full" type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Login"}
      </Button>
    </form>
  );
}

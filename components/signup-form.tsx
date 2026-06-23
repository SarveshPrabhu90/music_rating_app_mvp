"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignupForm() {
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
        const payload = {
          name: String(form.get("name") || ""),
          email: String(form.get("email") || ""),
          password: String(form.get("password") || ""),
        };

        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = (await response.json()) as {
            error?: string | { message?: string };
            message?: string;
            errorMessage?: string;
          };
          const nextError =
            typeof data.error === "string"
              ? data.error
              : data.error?.message || data.message || data.errorMessage || "Could not create account.";
          setError(nextError);
          setLoading(false);
          return;
        }

        await signIn("credentials", {
          email: payload.email,
          password: payload.password,
          redirect: false,
        });

        router.push("/dashboard");
        router.refresh();
      }}
    >
      <Input name="name" type="text" placeholder="Your name" required />
      <Input name="email" type="email" placeholder="you@email.com" required />
      <Input name="password" type="password" placeholder="8+ characters" required minLength={8} />
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <Button className="w-full" type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create account"}
      </Button>
    </form>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { NimbusWordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({ component: Forgot });

function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-16">
      <NimbusWordmark />
      <h1 className="mt-10 font-display text-3xl font-medium">Reset your password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the email on your account. If it exists, we will send a reset link. Accounts created with Google or X
        should sign in with that provider.
      </p>
      {sent ? (
        <p className="mt-8 text-sm">If an account exists for that address, a reset email is on its way.</p>
      ) : (
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full">
            Send reset link
          </Button>
        </form>
      )}
      <Link to="/login" className="mt-8 text-sm text-muted-foreground hover:text-foreground">
        Back to sign in
      </Link>
    </main>
  );
}

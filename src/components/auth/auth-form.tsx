import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NimbusWordmark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (mode === "signup") {
        const res = await authClient.signUp.email({
          email,
          password,
          name: name || email.split("@")[0]!,
        });
        if (res.error) throw new Error(res.error.message || "Could not create account");
        navigate({ to: "/onboarding" });
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message || "Could not sign in");
        navigate({ to: "/app" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative grid min-h-dvh lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-foreground p-10 text-background lg:flex">
        <NimbusWordmark className="[&_.text-muted-foreground]:text-background/60" />
        <blockquote className="max-w-md">
          <p className="font-display text-3xl font-medium leading-snug tracking-tight">
            The work lives in one place. The tabs can finally rest.
          </p>
          <footer className="mt-4 text-sm text-background/70">Independent studios, on Nimbus.</footer>
        </blockquote>
      </div>
      <div className="flex flex-col p-6 sm:p-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="lg:invisible">
            <NimbusWordmark />
          </Link>
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="font-display text-3xl font-medium tracking-tight">
            {mode === "signup" ? "Create your workspace" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup" ? "Free to start. No card required." : "Sign in to continue to Nimbus."}
          </p>
          <div className="mt-8 space-y-2">
            {authEnabled ? (
              GROK_PROVIDERS.map((p) => (
                <Button
                  key={p.providerId}
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => signIn(p.providerId, { callbackURL: "/app" })}
                >
                  Continue with {p.label}
                </Button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sign-in is disabled.</p>
            )}
          </div>
          <div className="relative my-6 text-center text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <span className="bg-background px-3">or email</span>
            <div className="absolute left-0 right-0 top-1/2 -z-10 h-px bg-border" />
          </div>
          <form className="space-y-4" onSubmit={onSubmit}>
            {mode === "signup" ? (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === "login" ? (
                  <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
                    Forgot password
                  </Link>
                ) : null}
              </div>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>
          <p className="mt-6 text-sm text-muted-foreground">
            {mode === "signup" ? (
              <>
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New here?{" "}
                <Link to="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
                  Create a workspace
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

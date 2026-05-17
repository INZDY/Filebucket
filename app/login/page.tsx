import { Cloud, LockKeyhole } from "lucide-react";
import { redirect } from "next/navigation";

import { loginAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getSession } from "@/lib/auth";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getSession();

  if (session) {
    redirect("/");
  }

  const params = await searchParams;
  const hasError = params?.error === "invalid";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#eef4f2_100%)] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-soft">
            <Cloud className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-normal">Filebucket</h1>
            <p className="text-sm text-muted-foreground">Sign in to your private vault</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-teal-700">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <CardTitle>Login</CardTitle>
            <CardDescription>Use the admin credentials configured for this deployment.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={loginAction} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="email">
                  Email
                </label>
                <Input
                  autoComplete="email"
                  autoFocus
                  id="email"
                  name="email"
                  placeholder="admin@filebucket.local"
                  required
                  type="email"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="password">
                  Password
                </label>
                <Input
                  autoComplete="current-password"
                  id="password"
                  name="password"
                  placeholder="Enter password"
                  required
                  type="password"
                />
              </div>

              {hasError ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Invalid email or password.
                </p>
              ) : null}

              <Button className="w-full" type="submit">
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

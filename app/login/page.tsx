import { Cloud, LockKeyhole, BookOpenText, ImagePlus, Tags, Download } from "lucide-react";
import { redirect } from "next/navigation";

import { loginAction, loginWithProviderAction } from "@/app/login/actions";
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

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-2 bg-[#0a0a0d] text-slate-100 antialiased overflow-hidden">
      {/* Left Column: Landing / Marketing Feature Display (Visible on desktop) */}
      <section className="hidden lg:flex flex-col justify-between p-16 bg-gradient-to-br from-[#0c0c0e] via-[#0f0f13] to-[#0a0a0d] border-r border-slate-800/40 relative">
        {/* Subtle backdrop glow */}
        <div className="absolute top-1/4 left-1/4 -z-10 h-72 w-72 rounded-full bg-purple-600/10 blur-[100px] pointer-events-none" />
        
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.15)]">
            <Cloud className="h-5.5 w-5.5" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-50 to-slate-300 bg-clip-text text-transparent">
              Filebucket
            </span>
          </div>
        </div>

        {/* Feature List / Presentation */}
        <div className="my-auto max-w-lg space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
              Your personal, quiet <br />
              <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                markdown & media vault
              </span>
            </h2>
            <p className="text-base text-slate-400 leading-relaxed">
              Filebucket is a distraction-free space for your notes, checklists, and media files. Obsidian-inspired layout, stored securely, and fully exportable at any time.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 pt-4">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-900/30 border border-purple-800/40 text-purple-400">
                <BookOpenText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200 text-sm">Obsidian-Style Workbench</h3>
                <p className="text-xs text-slate-400 mt-1">Rendered live preview, heading navigation, and quiet single-pane tabs.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-900/30 border border-purple-800/40 text-purple-400">
                <ImagePlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200 text-sm">First-Class Media Assets</h3>
                <p className="text-xs text-slate-400 mt-1">Directly upload, browse, and reference images, audio, video, PDFs, and TXT files.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-900/30 border border-purple-800/40 text-purple-400">
                <Tags className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200 text-sm">Flexible Tags & Search</h3>
                <p className="text-xs text-slate-400 mt-1">Filter with secondary tags and find items instantly using inline whole-vault search.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-900/30 border border-purple-800/40 text-purple-400">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200 text-sm">100% Data Portability</h3>
                <p className="text-xs text-slate-400 mt-1">Download your entire vault as a structured ZIP file containing Markdown and original files.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-slate-500">
          © {new Date().getFullYear()} Filebucket. Seed-only deploy.
        </div>
      </section>

      {/* Right Column: Unified Login Container */}
      <section className="flex flex-col items-center justify-center p-8 lg:p-16 relative">
        {/* Subtle backdrop glow */}
        <div className="absolute bottom-1/4 right-1/4 -z-10 h-72 w-72 rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />

        {/* Logo display on mobile */}
        <div className="lg:hidden mb-8 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
            <Cloud className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-50 to-slate-300 bg-clip-text text-transparent">
              Filebucket
            </h1>
          </div>
        </div>

        <div className="w-full max-w-md">
          <Card className="glass-panel border-slate-800/80 bg-slate-950/40 shadow-2xl relative overflow-hidden">
            {/* Fine border decoration */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/35 to-transparent" />
            
            <CardHeader className="space-y-3 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-950/40 border border-purple-800/30 text-purple-400 shadow-[0_0_10px_rgba(139,92,246,0.1)]">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-slate-50 tracking-tight">Login</CardTitle>
                <CardDescription className="text-slate-400 text-xs mt-1">
                  {process.env.NODE_ENV === "development"
                    ? "Use the admin credentials or OAuth to access your private vault."
                    : "Sign in using your configured Google or GitHub account."}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {process.env.NODE_ENV === "development" && (
                <form action={loginAction} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300" htmlFor="email">
                      Email Address
                    </label>
                    <Input
                      autoComplete="email"
                      autoFocus
                      id="email"
                      name="email"
                      placeholder="admin@filebucket.local"
                      required
                      type="email"
                      className="glass-input h-10 bg-slate-900/60 border-slate-800 text-slate-200 placeholder-slate-500 focus-visible:ring-1 focus-visible:ring-purple-500 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300" htmlFor="password">
                      Password
                    </label>
                    <Input
                      autoComplete="current-password"
                      id="password"
                      name="password"
                      placeholder="Enter password"
                      required
                      type="password"
                      className="glass-input h-10 bg-slate-900/60 border-slate-800 text-slate-200 placeholder-slate-500 focus-visible:ring-1 focus-visible:ring-purple-500 text-sm"
                    />
                  </div>

                  {params?.error === "invalid" && (
                    <div className="rounded-lg border border-red-500/20 bg-red-950/35 px-4 py-3 text-xs text-red-300 flex items-start gap-2.5 animate-shake">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                      <span>Invalid email or password. Please verify the credentials.</span>
                    </div>
                  )}

                  <Button 
                    className="w-full h-10 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium shadow-md shadow-purple-600/10 hover:shadow-purple-600/25 transition-all duration-200" 
                    type="submit"
                  >
                    Sign in
                  </Button>
                </form>
              )}

              {process.env.NODE_ENV === "development" && (
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#0a0a0d] px-2 text-slate-500">Or continue with</span>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <form action={async () => {
                  "use server";
                  await loginWithProviderAction("google");
                }}>
                  <Button
                    type="submit"
                    className="w-full h-10 bg-slate-900 hover:bg-slate-800 hover:text-white text-slate-200 border border-slate-800/80 font-medium flex items-center justify-center transition-all duration-200"
                  >
                    <svg className="mr-2 h-4 w-4 text-purple-400" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                      <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                    </svg>
                    Sign in with Google
                  </Button>
                </form>

                <form action={async () => {
                  "use server";
                  await loginWithProviderAction("github");
                }}>
                  <Button
                    type="submit"
                    className="w-full h-10 bg-slate-900 hover:bg-slate-800 hover:text-white text-slate-200 border border-slate-800/80 font-medium flex items-center justify-center transition-all duration-200"
                  >
                    <svg className="mr-2 h-4 w-4 text-indigo-400" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="github" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v-3.293c0-.319.192-.694.801-.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path>
                    </svg>
                    Sign in with GitHub
                  </Button>
                </form>
              </div>

              {params?.error && params.error !== "invalid" && (
                <div className="rounded-lg border border-red-500/20 bg-red-950/35 px-4 py-3 text-xs text-red-300 flex items-start gap-2.5 animate-shake">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                  <span>Access denied. Only the configured admin user can log in.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

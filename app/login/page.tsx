import { Cloud, LockKeyhole, BookOpenText, ImagePlus, Tags, Download } from "lucide-react";
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
                  Use the admin credentials configured for this deployment.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
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

                {hasError ? (
                  <div className="rounded-lg border border-red-500/20 bg-red-950/35 px-4 py-3 text-xs text-red-300 flex items-start gap-2.5 animate-shake">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                    <span>Invalid email or password. Please verify the credentials.</span>
                  </div>
                ) : null}

                <Button 
                  className="w-full h-10 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium shadow-md shadow-purple-600/10 hover:shadow-purple-600/25 transition-all duration-200" 
                  type="submit"
                >
                  Sign in
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

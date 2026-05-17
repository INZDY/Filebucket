import {
  Archive,
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Cloud,
  Database,
  Download,
  FileArchive,
  FileImage,
  FileText,
  Folder,
  FolderOpen,
  Grid3X3,
  HardDrive,
  Image as ImageIcon,
  Link2,
  ListFilter,
  LockKeyhole,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Star,
  UploadCloud,
  Users,
  Workflow
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { logoutAction } from "@/app/login/actions";
import { requireSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Files", icon: FolderOpen, active: true },
  { label: "Transfers", icon: UploadCloud },
  { label: "Shared", icon: Users },
  { label: "Workflows", icon: Workflow },
  { label: "Archive", icon: Archive },
  { label: "Settings", icon: Settings }
];

const buckets = [
  { name: "Product Launch", files: 184, size: "42.8 GB", color: "bg-teal-600" },
  { name: "Legal Vault", files: 63, size: "8.4 GB", color: "bg-slate-700" },
  { name: "Design System", files: 520, size: "18.1 GB", color: "bg-rose-500" },
  { name: "Finance Ops", files: 91, size: "12.6 GB", color: "bg-amber-500" }
];

const files = [
  {
    name: "Q3 investor model.xlsx",
    bucket: "Finance Ops",
    size: "6.8 MB",
    modified: "2 min ago",
    owner: "IR",
    status: "Synced",
    icon: Database
  },
  {
    name: "Brand campaign selects.zip",
    bucket: "Product Launch",
    size: "1.4 GB",
    modified: "18 min ago",
    owner: "MO",
    status: "Review",
    icon: FileArchive
  },
  {
    name: "Customer migration notes.pdf",
    bucket: "Legal Vault",
    size: "24 MB",
    modified: "1 hr ago",
    owner: "AK",
    status: "Locked",
    icon: FileText
  },
  {
    name: "Component audit board.fig",
    bucket: "Design System",
    size: "412 MB",
    modified: "Today",
    owner: "SN",
    status: "Synced",
    icon: FileImage
  }
];

const activities = [
  { text: "Nadia shared Product Launch with Growth", time: "7m", icon: Share2 },
  { text: "Retention archive completed checksum", time: "24m", icon: ShieldCheck },
  { text: "Creative batch is waiting for review", time: "41m", icon: Clock3 }
];

function StatusBadge({ status }: { status: string }) {
  if (status === "Synced") {
    return <Badge variant="success">Synced</Badge>;
  }

  if (status === "Locked") {
    return <Badge variant="secondary">Locked</Badge>;
  }

  return <Badge variant="warning">Review</Badge>;
}

export default async function Home() {
  const session = await requireSession();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4f2_100%)]">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r bg-white/88 px-4 py-5 lg:block">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-soft">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold">Filebucket</p>
              <p className="text-xs text-muted-foreground">Workspace storage</p>
            </div>
          </div>

          <nav className="mt-8 space-y-1">
            {navigation.map((item) => (
              <Button
                key={item.label}
                variant={item.active ? "secondary" : "ghost"}
                className={cn(
                  "h-10 w-full justify-start px-3",
                  item.active && "bg-teal-50 text-teal-900 hover:bg-teal-100"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            ))}
          </nav>

          <div className="mt-8 rounded-lg border bg-slate-950 p-4 text-white">
            <div className="flex items-center justify-between">
              <HardDrive className="h-5 w-5 text-teal-300" />
              <Badge className="bg-white/10 text-white" variant="outline">
                Pro
              </Badge>
            </div>
            <p className="mt-4 text-sm font-medium">2.2 TB available</p>
            <p className="mt-1 text-xs text-slate-300">Usage resets on June 1</p>
            <Progress value={68} className="mt-4 bg-white/12" />
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-10 border-b bg-white/86 px-4 py-3 backdrop-blur md:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" className="lg:hidden">
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-xl font-semibold tracking-normal">Files</h1>
                  <p className="text-sm text-muted-foreground">
                    14,820 objects across 6 team buckets
                  </p>
                </div>
              </div>

              <div className="flex flex-1 items-center gap-2 md:max-w-2xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search files, owners, tags" />
                </div>
                <div className="hidden items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm md:flex">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span className="max-w-[160px] truncate">{session.email}</span>
                </div>
                <form action={logoutAction}>
                  <Button variant="outline" type="submit">
                    Sign out
                  </Button>
                </form>
                <Button>
                  <Plus className="h-4 w-4" />
                  Upload
                </Button>
              </div>
            </div>
          </header>

          <div className="grid flex-1 gap-5 p-4 md:p-6 xl:grid-cols-[1fr_340px]">
            <div className="min-w-0 space-y-5">
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {buckets.map((bucket) => (
                  <Card key={bucket.name} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-md text-white", bucket.color)}>
                          <Folder className="h-5 w-5" />
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-4">
                        <p className="font-medium">{bucket.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {bucket.files} files · {bucket.size}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </section>

              <section className="rounded-lg border bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="font-semibold">Recent files</h2>
                    <p className="text-sm text-muted-foreground">Sorted by latest activity</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <ListFilter className="h-4 w-4" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      <ChevronDown className="h-4 w-4" />
                      Sort
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-muted/45 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Name</th>
                        <th className="px-4 py-3 text-left font-medium">Bucket</th>
                        <th className="px-4 py-3 text-left font-medium">Size</th>
                        <th className="px-4 py-3 text-left font-medium">Owner</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                        <th className="px-4 py-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.map((file) => (
                        <tr key={file.name} className="border-t bg-white hover:bg-muted/35">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                                <file.icon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{file.modified}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">{file.bucket}</td>
                          <td className="px-4 py-4 text-muted-foreground">{file.size}</td>
                          <td className="px-4 py-4">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{file.owner}</AvatarFallback>
                            </Avatar>
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge status={file.status} />
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Link2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <aside className="space-y-5">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Upload queue</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-teal-700">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-medium">Homepage renders</p>
                        <span className="text-xs text-muted-foreground">82%</span>
                      </div>
                      <Progress value={82} className="mt-2" />
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <p className="font-semibold">18</p>
                      <p className="text-xs text-muted-foreground">Active</p>
                    </div>
                    <div>
                      <p className="font-semibold">642</p>
                      <p className="text-xs text-muted-foreground">Synced</p>
                    </div>
                    <div>
                      <p className="font-semibold">4</p>
                      <p className="text-xs text-muted-foreground">Flagged</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Access control</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <LockKeyhole className="h-4 w-4 text-teal-700" />
                      <div>
                        <p className="text-sm font-medium">Legal Vault</p>
                        <p className="text-xs text-muted-foreground">MFA required</p>
                      </div>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <Star className="h-4 w-4 text-amber-500" />
                      <div>
                        <p className="text-sm font-medium">Priority share</p>
                        <p className="text-xs text-muted-foreground">Expires Friday</p>
                      </div>
                    </div>
                    <Badge variant="outline">3 links</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.text} className="flex gap-3">
                      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                        <activity.icon className="h-4 w-4 text-slate-700" />
                      </div>
                      <div>
                        <p className="text-sm leading-5">{activity.text}</p>
                        <p className="text-xs text-muted-foreground">{activity.time} ago</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

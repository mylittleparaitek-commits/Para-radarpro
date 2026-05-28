import { requireUser } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/login");
  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar isAdmin={user.profile.role === "admin"} />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopNav profile={user.profile} />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/layout/bottom-nav";
import { UserAvatar } from "@/components/social/user-avatar";

export async function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let headerProfile: {
    avatar_url: string | null;
    display_name: string | null;
    username: string | null;
  } | null = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url, display_name, username")
      .eq("id", user.id)
      .maybeSingle();
    headerProfile = data;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/85 pt-safe backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="bg-gradient-to-r from-violet-400 to-violet-300 bg-clip-text text-2xl font-bold tracking-tight text-transparent"
          >
            StuFit
          </Link>
          {user && (
            <UserAvatar
              href="/account"
              avatarUrl={headerProfile?.avatar_url}
              displayName={headerProfile?.display_name}
              username={headerProfile?.username}
              size="default"
            />
          )}
        </div>
      </header>

      {title && (
        <div className="mx-auto max-w-5xl px-4 pt-7">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        </div>
      )}

      <main className="mx-auto max-w-5xl flex-1 px-4 py-8 pb-32">{children}</main>

      <BottomNav />
    </div>
  );
}

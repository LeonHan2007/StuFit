import { Suspense } from "react";
import Link from "next/link";
import { getRequestProfile, getRequestUser } from "@/lib/supabase/server";
import { BottomNav } from "@/components/layout/bottom-nav";
import { UserAvatar } from "@/components/social/user-avatar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/85 pt-safe backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="bg-gradient-to-r from-primary to-[oklch(0.66_0.2_291)] bg-clip-text text-2xl font-bold tracking-tight text-transparent"
          >
            StuFit
          </Link>
          <Suspense fallback={<div className="size-10 rounded-full bg-muted" />}>
            <HeaderAvatar />
          </Suspense>
        </div>
      </header>

      {children}

      <BottomNav />
    </div>
  );
}

async function HeaderAvatar() {
  const user = await getRequestUser();
  if (!user) return null;

  const headerProfile = await getRequestProfile(user.id);

  return (
    <UserAvatar
      href="/account"
      avatarUrl={headerProfile?.avatar_url}
      displayName={headerProfile?.display_name}
      username={headerProfile?.username}
      size="default"
    />
  );
}

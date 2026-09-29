import { AppShell } from "@/components/layout/app-shell";
import { getRequestUser } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await getRequestUser();
  return <AppShell>{children}</AppShell>;
}

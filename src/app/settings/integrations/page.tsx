import { redirect } from "next/navigation";

export default async function IntegrationsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  if (params.connected) qs.set("connected", params.connected);
  if (params.error) qs.set("error", params.error);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  redirect(`/settings/accountability${suffix}`);
}

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Calendar,
  Dumbbell,
  Flame,
  LineChart,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", user.id)
      .single();

    if (!profile?.onboarding_completed_at) {
      redirect("/onboarding");
    }
    redirect("/dashboard");
  }

  const features = [
    {
      icon: Dumbbell,
      title: "Live workout logging",
      description:
        "Log sets in real time with technique guides and video cues.",
    },
    {
      icon: LineChart,
      title: "Progress dashboard",
      description: "Track streaks, weekly volume, and workout history.",
    },
    {
      icon: Zap,
      title: "Smart plans",
      description:
        "Personalized programs from your goals — no AI required.",
    },
    {
      icon: Calendar,
      title: "Calendar sync",
      description:
        "Schedule workouts around your classes and events.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
        <span className="bg-gradient-to-r from-violet-400 to-violet-300 bg-clip-text text-2xl font-bold text-transparent">
          StuFit
        </span>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/auth/login"
            className={cn(buttonVariants({ variant: "ghost" }), "w-full sm:w-auto")}
          >
            Log in
          </Link>
          <Link
            href="/auth/login"
            className={cn(buttonVariants(), "w-full sm:w-auto")}
          >
            Get started free
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-16 text-center md:py-24">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-muted px-4 py-1 text-sm">
          <Flame className="h-4 w-4 text-primary" />
          Built for students — 100% free stack
        </div>
        <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
          Train smarter between classes
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Plan workouts, log every set with proper form guidance, track your
          streak, and sync sessions to Google Calendar.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/auth/login"
            className={cn(buttonVariants({ size: "lg" }), "h-14 px-8 text-lg")}
          >
            Start free
          </Link>
          <Link
            href="/auth/login"
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "h-14 px-8 text-lg"
            )}
          >
            Sign in
          </Link>
        </div>
        <div className="mx-auto mt-12 aspect-video max-w-3xl overflow-hidden rounded-2xl border bg-card shadow-xl">
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-muted-foreground">
            <Dumbbell className="h-16 w-16 opacity-40" />
            <p className="text-sm">App preview — live logging & dashboard</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="mb-8 text-center text-2xl font-bold">Everything you need</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, description }) => (
            <Card key={title}>
              <CardHeader>
                <Icon className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        StuFit — student workout planner. Supabase + Next.js.
      </footer>
    </div>
  );
}

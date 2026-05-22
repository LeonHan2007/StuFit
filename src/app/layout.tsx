import type { Metadata, Viewport } from "next";
import { Roboto_Flex, Roboto_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const robotoFlex = Roboto_Flex({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const robotoMono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "StuFit — Student Workout Planner",
  description:
    "Plan workouts, log sets in real time, track streaks, and sync with Google Calendar.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${robotoFlex.variable} ${robotoMono.variable} min-h-screen font-sans antialiased`}
      >
        <ThemeProvider>
          {children}
          <Toaster richColors position="bottom-center" offset="5.5rem" />
        </ThemeProvider>
      </body>
    </html>
  );
}

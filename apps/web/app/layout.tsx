import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "./_components/app-shell";
import "./globals.css";

// The design tokens read these variables (--font-heading, --font-sans and
// --font-mono in globals.css).
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Clerk's components read the same design tokens, so they follow the theme.
// Its styles sit in their own cascade layer, below Tailwind's utilities.
const CLERK_APPEARANCE = {
  cssLayerName: "clerk",
  variables: {
    colorBackground: "var(--card)",
    colorForeground: "var(--card-foreground)",
    colorPrimary: "var(--primary)",
    colorPrimaryForeground: "var(--primary-foreground)",
    colorMuted: "var(--muted)",
    colorMutedForeground: "var(--muted-foreground)",
    // Inputs sit on the page color so they stand out from the card.
    colorInput: "var(--background)",
    colorInputForeground: "var(--foreground)",
    // Clerk derives its borders from this at low opacity, so it takes the ink
    // color; the soft --border would vanish in the dark theme.
    colorBorder: "var(--foreground)",
    colorRing: "var(--ring)",
    colorDanger: "var(--destructive)",
    colorNeutral: "var(--foreground)",
    colorModalBackdrop: "rgb(12 10 8 / 0.48)",
    fontFamily: "var(--font-sans)",
    fontFamilyButtons: "var(--font-sans)",
    borderRadius: "var(--radius)",
  },
} as const;

export const metadata: Metadata = {
  title: "Flashcards",
  description: "Spaced-repetition flashcards for the things you want to remember.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes sets the theme class on <html> before React hydrates.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${geist.variable} ${geistMono.variable}`}
    >
      <body>
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          appearance={CLERK_APPEARANCE}
        >
          <ThemeProvider>
            <TooltipProvider>
              <AppShell>{children}</AppShell>
            </TooltipProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}

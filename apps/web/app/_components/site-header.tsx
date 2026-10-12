import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Brand } from "./brand";
import { MobileNav } from "./mobile-nav";

/** The header on every page: navigation menu (phones), brand, theme and auth. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-1.5 border-b bg-background px-3 lg:px-5">
      <MobileNav />
      <div className="mr-auto pl-1 lg:pl-0">
        <Brand />
      </div>
      <ThemeToggle />
      <Show when="signed-out">
        <SignInButton>
          <Button variant="outline" size="sm">
            Sign in
          </Button>
        </SignInButton>
        <SignUpButton>
          <Button size="sm">Sign up</Button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </header>
  );
}

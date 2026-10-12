import type { ReactNode } from "react";
import { NavLinks } from "./nav-links";
import { SiteHeader } from "./site-header";

/**
 * The layout every page shares: the header, a sidebar with the main navigation
 * from 1024 px (the header's menu sheet below that), and the page content.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="hidden border-r px-3 py-[18px] lg:block">
          <nav aria-label="Main">
            <NavLinks />
          </nav>
        </aside>
        <main className="min-w-0 px-4 pt-5 pb-10 md:px-9 md:pt-8 md:pb-12 lg:px-12 lg:pt-9 lg:pb-14">
          {children}
        </main>
      </div>
    </div>
  );
}

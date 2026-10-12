import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Pages that show the user's own data. Signed-out visitors go to /sign-in and
// come back here afterwards; /, /sign-in and /sign-up stay public.
const isPrivate = createRouteMatcher(["/decks(.*)", "/notes(.*)", "/cards(.*)"]);

export default clerkMiddleware(
  async (auth, request) => {
    if (isPrivate(request)) await auth.protect();
  },
  // Where auth.protect() sends signed-out visitors (as ClerkProvider does).
  { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};

import { auth } from "@clerk/nextjs/server";
import { apiClient, type ApiSchemas } from "../_lib/api";

/**
 * The signed-in user's account as the API returns it. Renders nothing when
 * signed out, and a short message instead of failing the page when the API
 * can't be reached.
 */
export async function AccountSummary() {
  const { userId } = await auth();
  if (!userId) return null;

  const me = await loadMe();
  return (
    <section
      aria-label="Your account"
      className="grid gap-1 rounded-xl border bg-card p-5 text-card-foreground"
    >
      {me ? (
        <>
          <p className="text-sm text-muted-foreground">Signed in as</p>
          <p className="font-medium">{me.email ?? "No email yet"}</p>
          <p className="text-sm text-muted-foreground">Time zone: {me.timezone}</p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground" role="status">
          Couldn&apos;t load your account right now.
        </p>
      )}
    </section>
  );
}

async function loadMe(): Promise<ApiSchemas["MeResponse"] | null> {
  try {
    const { data } = await (await apiClient()).GET("/me");
    return data ?? null;
  } catch {
    return null;
  }
}

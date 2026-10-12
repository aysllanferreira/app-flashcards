import { auth } from "@clerk/nextjs/server";
import { apiFetch } from "../_lib/api";
import styles from "./account-summary.module.css";

// The fields of the API's MeResponse (GET /me) this section shows.
interface Me {
  email: string | null;
  timezone: string;
}

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
    <section className={styles.account} aria-label="Your account">
      {me ? (
        <>
          <p className={styles.label}>Signed in as</p>
          <p className={styles.email}>{me.email ?? "No email yet"}</p>
          <p className={styles.meta}>Time zone: {me.timezone}</p>
        </>
      ) : (
        <p className={styles.error} role="status">
          Couldn&apos;t load your account right now.
        </p>
      )}
    </section>
  );
}

async function loadMe(): Promise<Me | null> {
  try {
    const res = await apiFetch("/me");
    if (!res.ok) return null;
    return (await res.json()) as Me;
  } catch {
    return null;
  }
}

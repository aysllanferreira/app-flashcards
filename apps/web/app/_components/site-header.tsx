import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import styles from "./site-header.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        Flashcards
      </Link>
      <nav className={styles.auth}>
        <Show when="signed-out">
          <SignInButton>
            <button type="button" className={styles.secondary}>
              Sign in
            </button>
          </SignInButton>
          <SignUpButton>
            <button type="button" className={styles.primary}>
              Sign up
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </nav>
    </header>
  );
}

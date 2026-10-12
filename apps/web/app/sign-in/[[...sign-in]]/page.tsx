import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div style={{ display: "flex", flex: 1, padding: "48px 16px", alignItems: "center", justifyContent: "center" }}>
      <SignIn />
    </div>
  );
}

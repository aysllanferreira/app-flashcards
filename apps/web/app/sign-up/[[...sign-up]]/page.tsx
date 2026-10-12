import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div style={{ display: "flex", flex: 1, padding: "48px 16px", alignItems: "center", justifyContent: "center" }}>
      <SignUp />
    </div>
  );
}

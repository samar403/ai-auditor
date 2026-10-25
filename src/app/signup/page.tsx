import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata = { title: "Create a workspace" };

export default function SignupPage() {
  return (
    <AuthCard title="Create your workspace" subtitle="You'll be the admin. Next you'll describe your business so AI Auditor knows which rules apply." footer={<>Already have an account? <Link className="text-ledger underline" href="/login">Sign in</Link></>}>
      <SignupForm />
    </AuthCard>
  );
}

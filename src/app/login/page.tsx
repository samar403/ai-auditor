import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthCard title="Sign in" subtitle="Welcome back. Your regulators didn't take the day off either." footer={<>New here? <Link className="text-ledger underline" href="/signup">Create a workspace</Link></>}>
      <LoginForm />
    </AuthCard>
  );
}

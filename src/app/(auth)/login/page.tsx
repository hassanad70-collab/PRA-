import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Sign In",
  description: "Sign in to your PRA Talent Intelligence account.",
  path: "/login",
  noIndex: true,
});

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

import { RegisterForm } from "@/components/auth/register-form";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Create Account",
  description: "Create your free PRA Talent Intelligence account.",
  path: "/register",
  noIndex: true,
});

export default function RegisterPage() {
  return <RegisterForm />;
}

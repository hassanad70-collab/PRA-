import { CompanyForm } from "@/components/admin/company-form";

export default function NewCompanyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New company</h1>
        <p className="mt-1 text-sm text-muted-foreground">Register a new company on the platform.</p>
      </div>
      <CompanyForm />
    </div>
  );
}

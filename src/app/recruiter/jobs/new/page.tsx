import { JobForm } from "@/components/recruiter/job-form";

export default function NewJobPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create a new job</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Jobs are saved as drafts. Publish when you&apos;re ready to start receiving applications.
        </p>
      </div>
      <JobForm />
    </div>
  );
}

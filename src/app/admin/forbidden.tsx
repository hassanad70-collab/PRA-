import Link from "next/link";
import { ShieldOff } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <ShieldOff className="h-12 w-12 text-muted-foreground" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Access Denied</h1>
        <p className="mt-1 text-sm text-muted-foreground">You don&apos;t have permission to access this page.</p>
      </div>
      <Button asChild variant="outline">
        <Link href="/admin/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}

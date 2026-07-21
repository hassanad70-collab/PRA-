"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreVertical, Power, PowerOff, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setCompanyActive, softDeleteCompany } from "@/actions/admin-companies";

export function CompanyActionsMenu({ companyId, isActive, deletedAt }: { companyId: string; isActive: boolean; deletedAt: string | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<{ success: boolean; error?: string }>, successMsg: string, redirectHome?: boolean) => {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        toast.success(successMsg);
        if (redirectHome) router.push("/admin/companies");
        router.refresh();
      } else {
        toast.error(result.error ?? "Action failed");
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={isPending} aria-label="Company actions">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!deletedAt && isActive && (
          <DropdownMenuItem onClick={() => run(() => setCompanyActive(companyId, false), "Company disabled")}>
            <PowerOff className="h-4 w-4" /> Disable
          </DropdownMenuItem>
        )}
        {!deletedAt && !isActive && (
          <DropdownMenuItem onClick={() => run(() => setCompanyActive(companyId, true), "Company enabled")}>
            <Power className="h-4 w-4" /> Enable
          </DropdownMenuItem>
        )}
        {!deletedAt && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => run(() => softDeleteCompany(companyId), "Company deleted", true)}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

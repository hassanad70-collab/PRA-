import { Badge } from "@/components/ui/badge";

export function UserStatusBadge({ isActive, deletedAt }: { isActive: boolean; deletedAt: string | null }) {
  if (deletedAt) return <Badge variant="destructive">Deleted</Badge>;
  if (!isActive) return <Badge variant="warning">Disabled</Badge>;
  return <Badge variant="success">Active</Badge>;
}

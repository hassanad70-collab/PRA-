import { redirect } from "@/i18n/navigation";
import { BellOff } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getNotifications } from "@/lib/workspace/analytics";
import { formatDate } from "@/lib/utils";
import type { Notification } from "@/types/database";

function notificationIcon(type: string) {
  const MAP: Record<string, string> = {
    application_update: "📋",
    interview_scheduled: "📅",
    job_match: "✨",
    message: "💬",
    system: "🔔",
  };
  return MAP[type] ?? "🔔";
}

export default async function NotificationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const notifications = await getNotifications(user.id) as Notification[];
  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unread > 0 ? `${unread} unread notification${unread !== 1 ? "s" : ""}` : "You're all caught up."}
          </p>
        </div>
        {unread > 0 && <Badge variant="destructive">{unread} unread</Badge>}
      </div>

      {notifications.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <BellOff className="h-10 w-10 text-muted-foreground/40" />
            <div>
              <p className="font-medium">No notifications yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Application updates, interview invites, and job matches will appear here.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {notifications.map((n) => {
          const content = (
            <Card className={`transition-shadow hover:shadow-sm ${!n.is_read ? "border-primary/30 bg-primary/5" : ""}`}>
              <CardContent className="flex items-start gap-4 pt-4 pb-4">
                <span className="text-xl shrink-0 mt-0.5">{notificationIcon(n.type)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(n.created_at)}</p>
                </div>
              </CardContent>
            </Card>
          );

          return n.link ? (
            <Link key={n.id} href={n.link}>
              {content}
            </Link>
          ) : (
            <div key={n.id}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}

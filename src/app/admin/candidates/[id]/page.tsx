import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserRowActions } from "@/components/admin/user-row-actions";
import { UserStatusBadge } from "@/components/admin/user-status-badge";
import { getAdminCandidateDetail } from "@/lib/queries/admin";
import { formatDate, initials, scoreBadgeVariant } from "@/lib/utils";

export default async function AdminCandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile, candidate, resumes, atsScores, jobMatches, applications } = await getAdminCandidateDetail(id);
  if (!profile || !candidate) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/candidates" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to candidates
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg">{initials(profile.full_name)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{profile.full_name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <UserStatusBadge isActive={profile.is_active} deletedAt={profile.deleted_at} />
            </div>
          </div>
        </div>
        <UserRowActions userId={profile.id} isActive={profile.is_active} deletedAt={profile.deleted_at} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Current position</p>
            <p className="mt-1 text-lg font-semibold">{candidate.current_position ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Years of experience</p>
            <p className="mt-1 text-lg font-semibold">{candidate.years_of_experience}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Profile completion</p>
            <p className="mt-1 text-lg font-semibold">{candidate.profile_completion_percent}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {resumes.length === 0 && <p className="text-sm text-muted-foreground">No resumes uploaded.</p>}
          {resumes.map((resume) => (
            <div key={resume.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{resume.file_name}</span>
                {resume.is_primary && <Badge variant="outline">Primary</Badge>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={resume.parse_status === "completed" ? "success" : resume.parse_status === "failed" ? "destructive" : "outline"} className="capitalize">
                  {resume.parse_status}
                </Badge>
                <span className="text-xs text-muted-foreground">{formatDate(resume.uploaded_at)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ATS score history</CardTitle>
        </CardHeader>
        <CardContent>
          {atsScores.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ATS scores generated yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resume</TableHead>
                  <TableHead>Overall</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {atsScores.map((score) => (
                  <TableRow key={score.id}>
                    <TableCell>{score.resume?.file_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={scoreBadgeVariant(score.overall_score)}>{score.overall_score}</Badge>
                    </TableCell>
                    <TableCell>{score.experience_score ?? "—"}</TableCell>
                    <TableCell>{score.skills_score ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(score.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI job-matching history</CardTitle>
        </CardHeader>
        <CardContent>
          {jobMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No AI job matches generated yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Match score</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobMatches.map((match) => (
                  <TableRow key={match.id}>
                    <TableCell>{match.job?.title ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{match.job?.company?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={scoreBadgeVariant(match.match_score)}>{Math.round(match.match_score)}%</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(match.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No applications submitted yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>{app.job?.title ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{app.job?.company?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {app.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(app.applied_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

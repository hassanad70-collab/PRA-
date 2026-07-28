"use client";

import * as React from "react";

import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createJob, draftJobDescription, updateJob } from "@/actions/jobs";
import type { EmploymentType, ExperienceLevel, Job } from "@/types/database";

const EMPLOYMENT_TYPES: EmploymentType[] = ["full_time", "part_time", "contract", "internship", "temporary"];
const EXPERIENCE_LEVELS: ExperienceLevel[] = ["entry", "junior", "mid", "senior", "lead", "manager", "director", "executive"];

export interface JobFormLabels {
  jobTitleLabel: string;
  jobTitlePlaceholder: string;
  departmentLabel: string;
  departmentPlaceholder: string;
  aiAssistantLabel: string;
  aiAssistantDescription: string;
  keyPointsPlaceholder: string;
  draftWithAi: string;
  descriptionLabel: string;
  responsibilitiesLabel: string;
  requirementsLabel: string;
  benefitsLabel: string;
  employmentTypeLabel: string;
  employmentTypeLabels: Record<EmploymentType, string>;
  experienceLevelLabel: string;
  experienceLevelLabels: Record<ExperienceLevel, string>;
  minExperienceYearsLabel: string;
  educationRequirementLabel: string;
  educationRequirementPlaceholder: string;
  headcountLabel: string;
  requiredSkillsLabel: string;
  niceToHaveSkillsLabel: string;
  locationLabel: string;
  locationPlaceholder: string;
  remotePositionLabel: string;
  salaryMinLabel: string;
  salaryMaxLabel: string;
  currencyLabel: string;
  saveChanges: string;
  createJobDraft: string;
  toastJobUpdated: string;
  toastJobCreated: string;
  toastFormErrors: string;
  toastAddTitleFirst: string;
  toastDraftGenerated: string;
  toastDraftFailed: string;
}

export function JobForm({ job, labels }: { job?: Job; labels: JobFormLabels }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [isDrafting, startDraftTransition] = React.useTransition();
  const [isRemote, setIsRemote] = React.useState(job?.is_remote ?? false);
  const [employmentType, setEmploymentType] = React.useState<string>(job?.employment_type ?? "full_time");
  const [experienceLevel, setExperienceLevel] = React.useState<string>(job?.experience_level ?? "mid");
  const [title, setTitle] = React.useState(job?.title ?? "");
  const [department, setDepartment] = React.useState(job?.department ?? "");
  const [keyPoints, setKeyPoints] = React.useState("");
  const [description, setDescription] = React.useState(job?.description ?? "");
  const [responsibilities, setResponsibilities] = React.useState(job?.responsibilities?.join("\n") ?? "");
  const [requirements, setRequirements] = React.useState(job?.requirements?.join("\n") ?? "");
  const [benefits, setBenefits] = React.useState(job?.benefits?.join("\n") ?? "");
  const [requiredSkills, setRequiredSkills] = React.useState(job?.required_skills?.join(", ") ?? "");

  const onSubmit = (formData: FormData) => {
    formData.set("isRemote", isRemote ? "true" : "false");
    startTransition(async () => {
      const result = job ? await updateJob(job.id, formData) : await createJob(formData);
      if (result.success) {
        toast.success(job ? labels.toastJobUpdated : labels.toastJobCreated);
        router.push(`/recruiter/jobs/${result.jobId ?? job?.id}`);
        router.refresh();
      } else {
        toast.error(result.error ?? labels.toastFormErrors);
      }
    });
  };

  const handleDraft = () => {
    if (!title.trim()) {
      toast.error(labels.toastAddTitleFirst);
      return;
    }
    startDraftTransition(async () => {
      const result = await draftJobDescription({ title, department, employmentType, experienceLevel, keyPoints });
      if (result.success && result.draft) {
        setDescription(result.draft.description);
        setResponsibilities(result.draft.responsibilities.join("\n"));
        setRequirements(result.draft.requirements.join("\n"));
        setBenefits(result.draft.benefits.join("\n"));
        setRequiredSkills(result.draft.required_skills.join(", "));
        toast.success(labels.toastDraftGenerated);
      } else {
        toast.error(result.error ?? labels.toastDraftFailed);
      }
    });
  };

  return (
    <form action={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">{labels.jobTitleLabel}</Label>
          <Input id="title" name="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={labels.jobTitlePlaceholder} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="department">{labels.departmentLabel}</Label>
          <Input id="department" name="department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder={labels.departmentPlaceholder} />
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <Label htmlFor="keyPoints" className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" /> {labels.aiAssistantLabel}
        </Label>
        <p className="text-xs text-muted-foreground">{labels.aiAssistantDescription}</p>
        <Textarea
          id="keyPoints"
          rows={2}
          value={keyPoints}
          onChange={(e) => setKeyPoints(e.target.value)}
          placeholder={labels.keyPointsPlaceholder}
        />
        <Button type="button" variant="outline" size="sm" disabled={isDrafting} onClick={handleDraft}>
          {isDrafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {labels.draftWithAi}
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{labels.descriptionLabel}</Label>
        <Textarea id="description" name="description" rows={6} required value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-1">
        <div className="space-y-2">
          <Label htmlFor="responsibilities">{labels.responsibilitiesLabel}</Label>
          <Textarea id="responsibilities" name="responsibilities" rows={4} value={responsibilities} onChange={(e) => setResponsibilities(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="requirements">{labels.requirementsLabel}</Label>
          <Textarea id="requirements" name="requirements" rows={4} value={requirements} onChange={(e) => setRequirements(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="benefits">{labels.benefitsLabel}</Label>
          <Textarea id="benefits" name="benefits" rows={3} value={benefits} onChange={(e) => setBenefits(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="employmentType">{labels.employmentTypeLabel}</Label>
          <Select value={employmentType} onValueChange={setEmploymentType}>
            <SelectTrigger id="employmentType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {labels.employmentTypeLabels[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="employmentType" value={employmentType} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="experienceLevel">{labels.experienceLevelLabel}</Label>
          <Select value={experienceLevel} onValueChange={setExperienceLevel}>
            <SelectTrigger id="experienceLevel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPERIENCE_LEVELS.map((l) => (
                <SelectItem key={l} value={l}>
                  {labels.experienceLevelLabels[l]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="experienceLevel" value={experienceLevel} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="minExperienceYears">{labels.minExperienceYearsLabel}</Label>
          <Input id="minExperienceYears" name="minExperienceYears" type="number" step="0.5" defaultValue={job?.min_experience_years ?? 0} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="educationRequirement">{labels.educationRequirementLabel}</Label>
          <Input id="educationRequirement" name="educationRequirement" defaultValue={job?.education_requirement ?? ""} placeholder={labels.educationRequirementPlaceholder} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="headcount">{labels.headcountLabel}</Label>
          <Input id="headcount" name="headcount" type="number" defaultValue={job?.headcount ?? 1} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="requiredSkills">{labels.requiredSkillsLabel}</Label>
          <Textarea id="requiredSkills" name="requiredSkills" rows={2} required value={requiredSkills} onChange={(e) => setRequiredSkills(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="niceToHaveSkills">{labels.niceToHaveSkillsLabel}</Label>
          <Textarea id="niceToHaveSkills" name="niceToHaveSkills" rows={2} defaultValue={job?.nice_to_have_skills?.join(", ") ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="location">{labels.locationLabel}</Label>
          <Input id="location" name="location" defaultValue={job?.location ?? ""} placeholder={labels.locationPlaceholder} />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <Switch checked={isRemote} onCheckedChange={setIsRemote} id="isRemote" />
          <Label htmlFor="isRemote">{labels.remotePositionLabel}</Label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="salaryMin">{labels.salaryMinLabel}</Label>
          <Input id="salaryMin" name="salaryMin" type="number" defaultValue={job?.salary_min ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salaryMax">{labels.salaryMaxLabel}</Label>
          <Input id="salaryMax" name="salaryMax" type="number" defaultValue={job?.salary_max ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salaryCurrency">{labels.currencyLabel}</Label>
          <Input id="salaryCurrency" name="salaryCurrency" defaultValue={job?.salary_currency ?? "USD"} />
        </div>
      </div>

      <Button type="submit" variant="gradient" size="lg" disabled={isPending}>
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {job ? labels.saveChanges : labels.createJobDraft}
      </Button>
    </form>
  );
}

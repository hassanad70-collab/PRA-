import { z } from "zod";

export const jobFormSchema = z.object({
  title: z.string().min(3, "Title is required").max(160),
  department: z.string().max(120).optional().or(z.literal("")),
  description: z.string().min(50, "Description should be at least 50 characters"),
  responsibilities: z.string().optional().or(z.literal("")),
  requirements: z.string().optional().or(z.literal("")),
  benefits: z.string().optional().or(z.literal("")),
  employmentType: z.enum(["full_time", "part_time", "contract", "internship", "temporary"]),
  experienceLevel: z.enum(["entry", "junior", "mid", "senior", "lead", "manager", "director", "executive"]),
  minExperienceYears: z.coerce.number().min(0).max(40),
  educationRequirement: z.string().max(160).optional().or(z.literal("")),
  requiredSkills: z.string().min(2, "List at least one required skill"),
  niceToHaveSkills: z.string().optional().or(z.literal("")),
  location: z.string().max(160).optional().or(z.literal("")),
  isRemote: z.boolean().default(false),
  salaryMin: z.coerce.number().min(0).optional(),
  salaryMax: z.coerce.number().min(0).optional(),
  salaryCurrency: z.string().default("USD"),
  headcount: z.coerce.number().min(1).default(1),
});

export type JobFormInput = z.infer<typeof jobFormSchema>;

export function parseListField(value?: string): string[] {
  if (!value) return [];
  return value
    .split(/\r?\n|,/)
    .map((v) => v.trim())
    .filter(Boolean);
}

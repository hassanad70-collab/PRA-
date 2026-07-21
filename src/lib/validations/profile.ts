import { z } from "zod";

export const basicInfoSchema = z.object({
  headline: z.string().max(160).optional().or(z.literal("")),
  summary: z.string().max(2000).optional().or(z.literal("")),
  currentPosition: z.string().max(160).optional().or(z.literal("")),
  currentCompany: z.string().max(160).optional().or(z.literal("")),
  yearsOfExperience: z.coerce.number().min(0).max(60).optional(),
  location: z.string().max(160).optional().or(z.literal("")),
  city: z.string().max(120).optional().or(z.literal("")),
  country: z.string().max(120).optional().or(z.literal("")),
  expectedSalaryMin: z.coerce.number().min(0).optional(),
  expectedSalaryMax: z.coerce.number().min(0).optional(),
  noticePeriodDays: z.coerce.number().min(0).max(365).optional(),
  willingToRelocate: z.boolean().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  githubUrl: z.string().url().optional().or(z.literal("")),
  portfolioUrl: z.string().url().optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
});

export type BasicInfoInput = z.infer<typeof basicInfoSchema>;

export const experienceSchema = z.object({
  companyName: z.string().min(1, "Company is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  location: z.string().optional().or(z.literal("")),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional().or(z.literal("")),
  isCurrent: z.boolean().default(false),
  description: z.string().optional().or(z.literal("")),
});

export type ExperienceInput = z.infer<typeof experienceSchema>;

export const educationSchema = z.object({
  institution: z.string().min(1, "Institution is required"),
  degree: z.string().optional().or(z.literal("")),
  fieldOfStudy: z.string().optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
  grade: z.string().optional().or(z.literal("")),
});

export type EducationInput = z.infer<typeof educationSchema>;

export const skillSchema = z.object({
  skillName: z.string().min(1, "Skill is required"),
  proficiency: z.enum(["beginner", "intermediate", "advanced", "expert"]).default("intermediate"),
  yearsExperience: z.coerce.number().min(0).max(40).optional(),
});

export type SkillInput = z.infer<typeof skillSchema>;

import { z } from "zod";

export const scheduleInterviewSchema = z.object({
  scheduledAt: z.string().min(1, "Date and time are required"),
  durationMinutes: z.coerce.number().min(5).max(480).default(45),
  interviewType: z.enum(["phone", "video", "onsite", "technical", "panel", "final"]),
  locationOrLink: z.string().max(500).optional().or(z.literal("")),
});

export type ScheduleInterviewInput = z.infer<typeof scheduleInterviewSchema>;

export const interviewFeedbackSchema = z.object({
  situation: z.string().max(2000).optional().or(z.literal("")),
  task: z.string().max(2000).optional().or(z.literal("")),
  action: z.string().max(2000).optional().or(z.literal("")),
  result: z.string().max(2000).optional().or(z.literal("")),
  feedback: z.string().max(4000).optional().or(z.literal("")),
  hiringRecommendation: z.enum(["strong_yes", "yes", "neutral", "no", "strong_no"]),
});

export type InterviewFeedbackInput = z.infer<typeof interviewFeedbackSchema>;

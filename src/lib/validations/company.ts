import { z } from "zod";

export const companyFormSchema = z.object({
  name: z.string().min(2, "Company name is required").max(160),
  website: z.string().max(255).optional().or(z.literal("")),
  industry: z.string().max(120).optional().or(z.literal("")),
  companySize: z.string().max(60).optional().or(z.literal("")),
  headquarters: z.string().max(160).optional().or(z.literal("")),
  foundedYear: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().min(1800).max(2100).optional()),
  description: z.string().max(2000).optional().or(z.literal("")),
});

export type CompanyFormInput = z.infer<typeof companyFormSchema>;

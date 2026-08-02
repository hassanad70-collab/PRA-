import { z } from "zod";

export const candidateRegisterSchema = z
  .object({
    fullName: z.string().min(2, "Enter your full name").max(120),
    email: z.string().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type CandidateRegisterInput = z.infer<typeof candidateRegisterSchema>;

export const recruiterRegisterSchema = z
  .object({
    fullName: z.string().min(2, "Enter your full name").max(120),
    email: z.string().email("Enter a valid email address"),
    companyName: z.string().min(2, "Enter your company name").max(160),
    jobTitle: z.string().min(2, "Enter your job title").max(120),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RecruiterRegisterInput = z.infer<typeof recruiterRegisterSchema>;

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const phoneSchema = z.object({
  phone: z
    .string()
    .min(7, "Enter a valid phone number")
    .regex(/^\+[1-9]\d{6,14}$/, "Use international format: +[country code][number]"),
});

export type PhoneInput = z.infer<typeof phoneSchema>;

export const phoneOtpSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/),
  token: z.string().length(6, "Code must be 6 digits").regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export type PhoneOtpInput = z.infer<typeof phoneOtpSchema>;

export const completeProfileSchema = z.object({
  fullName: z.string().min(2, "Enter your full name").max(120),
  city: z.string().min(1, "Enter your city").max(120),
  country: z.string().min(1, "Select your country").max(120),
  currentPosition: z.string().min(2, "Enter your current or most recent job title").max(160),
  yearsOfExperience: z.coerce.number().min(0, "Enter years of experience").max(60),
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/).optional().or(z.literal("")),
});

export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;

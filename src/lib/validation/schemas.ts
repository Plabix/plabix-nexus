import { z } from "zod";

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(1, "Enter your name").max(120),
    organizationName: z.string().trim().min(1, "Enter an organization name").max(120),
    email: z.string().trim().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export const renameDocumentSchema = z.object({
  title: z.string().trim().min(1, "Title can't be empty").max(250),
});

export const sendMessageSchema = z.object({
  sessionId: z.string().uuid(),
  content: z.string().trim().min(1, "Message can't be empty").max(4000),
  documentIds: z.array(z.string().uuid()).optional(),
});

export const createSessionSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(1, "Organization name can't be empty").max(120),
});

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1, "Give this key a name").max(80),
});

export const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
] as const;

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

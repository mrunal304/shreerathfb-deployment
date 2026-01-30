import { z } from "zod";

// MongoDB ID schema (string)
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ID");

// Feedback Schema matching the user's requirements
export const feedbackSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phoneNumber: z.string().regex(/^9\d{9}$/, "Phone number must be 10 digits and start with 9"),
  location: z.string().min(1, "Location is required"),
  dineType: z.enum(["dine_in", "take_out"]),
  ratings: z.object({
    interior: z.number().min(1).max(5),
    food: z.number().min(1).max(5),
    service: z.number().min(1).max(5),
    staff: z.number().min(1).max(5),
    hygiene: z.number().min(1).max(5),
  }),
  note: z.string().max(500, "Note cannot exceed 500 characters").optional().default(""),
  createdAt: z.string().or(z.date()).optional(), // Date as ISO string from API
  contactedAt: z.string().or(z.date()).nullable().optional(),
  contactedBy: z.string().nullable().optional(),
  dateKey: z.string().optional(), // For duplicate checking (YYYY-MM-DD)
});

export const insertFeedbackSchema = feedbackSchema.pick({
  name: true,
  phoneNumber: true,
  location: true,
  dineType: true,
  ratings: true,
  note: true,
});

// Admin Auth Schema
export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const contactUpdateSchema = z.object({
  contactedBy: z.string().min(1, "Staff name is required"),
});

// Types
export type Feedback = z.infer<typeof feedbackSchema> & { _id: string };
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type ContactUpdate = z.infer<typeof contactUpdateSchema>;

// Analytics Types
export type AnalyticsData = {
  totalFeedback: number;
  averageRating: number;
  responseRate: number;
  topCategory: string;
  weeklyTrends: Array<{
    date: string;
    interior: number;
    food: number;
    service: number;
    staff: number;
    hygiene: number;
  }>;
  categoryPerformance: Array<{
    category: string;
    rating: number;
  }>;
  feedbackVolume: Array<{
    name: string;
    value: number;
  }>;
};

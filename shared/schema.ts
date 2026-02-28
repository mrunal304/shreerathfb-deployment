import { z } from "zod";

// MongoDB ID schema (string)
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ID");

// Visit Schema
export const visitSchema = z.object({
  location: z.string().min(1, "Location is required"),
  dineType: z.enum(["dine_in", "take_out"]),
  ratings: z.object({
    foodQuality: z.number().min(1).max(5),
    foodTaste: z.number().min(1).max(5),
    staffBehavior: z.number().min(1).max(5),
    hygiene: z.number().min(1).max(5),
    ambience: z.number().min(1).max(5),
    serviceSpeed: z.number().min(1).max(5),
  }),
  note: z.string().max(500, "Note cannot exceed 500 characters").optional().default(""),
  staffName: z.string().optional().default(""),
  staffComment: z.string().optional().default(""),
  createdAt: z.string().or(z.date()).optional(),
  dateKey: z.string().optional(),
});

// Feedback Schema (Customer-based with Visits)
export const feedbackSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phoneNumber: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  visits: z.array(visitSchema),
  contactedAt: z.string().or(z.date()).nullable().optional(),
  contactedBy: z.string().nullable().optional(),
});

// Customer Card Schema
export const customerCardSchema = z.object({
  phoneNumber: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  name: z.string().min(1, "Name is required"),
  totalVisits: z.number().int().default(1),
  firstVisitDate: z.string().or(z.date()),
  lastVisitDate: z.string().or(z.date()),
  visits: z.array(z.string()), // Array of feedback document IDs
});

export const insertFeedbackSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phoneNumber: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  location: z.string().min(1, "Location is required"),
  dineType: z.enum(["dine_in", "take_out"]),
  ratings: z.object({
    foodQuality: z.number().min(1).max(5),
    foodTaste: z.number().min(1).max(5),
    staffBehavior: z.number().min(1).max(5),
    hygiene: z.number().min(1).max(5),
    ambience: z.number().min(1).max(5),
    serviceSpeed: z.number().min(1).max(5),
  }),
  note: z.string().max(500, "Note cannot exceed 500 characters").optional().default(""),
  staffName: z.string().optional().default(""),
  staffComment: z.string().optional().default(""),
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
export type Visit = z.infer<typeof visitSchema>;
export type Feedback = z.infer<typeof feedbackSchema> & { _id: string };
export type CustomerCard = z.infer<typeof customerCardSchema> & { _id: string };
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
    foodQuality: number;
    foodTaste: number;
    staffBehavior: number;
    hygiene: number;
    ambience: number;
    serviceSpeed: number;
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

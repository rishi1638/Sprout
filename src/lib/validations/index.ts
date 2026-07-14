import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const childSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required."),
  last_name: z.string().trim().min(1, "Last name is required."),
  dob: z
    .string()
    .min(1, "Date of birth is required.")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date.")
    .refine((value) => new Date(value) <= new Date(), "Date of birth cannot be in the future."),
  enrollment_status: z.enum(["enrolled", "waitlisted", "withdrawn"]),
  allergies: z.string().trim(),
  immunizations: z.string().trim(),
  medical_notes: z.string().trim(),
});
export type ChildFormValues = z.infer<typeof childSchema>;

export const emergencyContactSchema = z.object({
  name: z.string().trim().min(1, "Contact name is required."),
  relationship: z.string().trim().min(1, "Relationship is required."),
  phone: z.string().trim().min(7, "Enter a valid phone number."),
  priority: z.coerce.number().int().min(1, "Priority must be 1 or higher."),
});
export type EmergencyContactValues = z.infer<typeof emergencyContactSchema>;

export const guardianLinkSchema = z.object({
  parent_id: z.string().uuid("Select a parent."),
  relationship: z.string().trim().min(1, "Relationship is required."),
  is_primary: z.boolean(),
});
export type GuardianLinkValues = z.infer<typeof guardianLinkSchema>;

export const classroomSchema = z.object({
  name: z.string().trim().min(1, "Classroom name is required."),
  description: z.string().trim(),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1."),
  min_age_months: z.coerce.number().int().min(0, "Minimum age cannot be negative."),
  max_age_months: z.coerce.number().int().min(0, "Maximum age cannot be negative."),
}).refine((values) => values.max_age_months === 0 || values.max_age_months >= values.min_age_months, {
  message: "Maximum age must be greater than or equal to minimum age.",
  path: ["max_age_months"],
});
export type ClassroomFormValues = z.infer<typeof classroomSchema>;

export const enrollmentSchema = z.object({
  child_id: z.string().uuid("Select a child."),
  classroom_id: z.string().uuid("Select a classroom."),
});
export type EnrollmentValues = z.infer<typeof enrollmentSchema>;

export const staffAssignmentSchema = z.object({
  staff_id: z.string().uuid("Select a staff member."),
  classroom_id: z.string().uuid("Select a classroom."),
});
export type StaffAssignmentValues = z.infer<typeof staffAssignmentSchema>;

export const mealLogSchema = z.object({
  food: z.string().trim().min(1, "Describe what was served."),
  amount_eaten: z.enum(["all", "most", "some", "none"]),
  note: z.string().trim(),
});
export type MealLogValues = z.infer<typeof mealLogSchema>;

export const napLogSchema = z.object({
  start: z.string().min(1, "Nap start time is required."),
  end: z.string().min(1, "Nap end time is required."),
  note: z.string().trim(),
}).refine((values) => values.end > values.start, {
  message: "Nap end must be after the start time.",
  path: ["end"],
});
export type NapLogValues = z.infer<typeof napLogSchema>;

export const diaperLogSchema = z.object({
  kind: z.enum(["wet", "soiled", "dry", "bathroom"]),
  note: z.string().trim(),
});
export type DiaperLogValues = z.infer<typeof diaperLogSchema>;

export const noteLogSchema = z.object({
  note: z.string().trim().min(1, "Write a note before saving."),
});
export type NoteLogValues = z.infer<typeof noteLogSchema>;

export const announcementSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  message: z.string().trim().min(1, "Message is required."),
  audience: z.enum(["all", "parents", "staff"]),
  active: z.boolean(),
});
export type AnnouncementValues = z.infer<typeof announcementSchema>;

export const eventSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required."),
    description: z.string().trim(),
    start_at: z.string().min(1, "Start time is required."),
    end_at: z.string().min(1, "End time is required."),
    classroom_id: z.string().optional(),
    audience: z.enum(["all", "parents", "staff"]),
  })
  .refine((values) => new Date(values.end_at) > new Date(values.start_at), {
    message: "Event end must be after the start time.",
    path: ["end_at"],
  });
export type EventValues = z.infer<typeof eventSchema>;

export const permissionFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().trim(),
  child_id: z.string().uuid("Select a child."),
  due_date: z.string().min(1, "Due date is required."),
  active: z.boolean(),
});
export type PermissionFormValues = z.infer<typeof permissionFormSchema>;

export const billingPlanSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required."),
  amount_dollars: z.coerce.number().min(0, "Amount cannot be negative."),
  interval: z.enum(["weekly", "monthly"]),
  description: z.string().trim(),
  active: z.boolean(),
});
export type BillingPlanValues = z.infer<typeof billingPlanSchema>;

export const childPlanSchema = z.object({
  child_id: z.string().uuid("Select a child."),
  plan_id: z.string().uuid("Select a plan."),
});
export type ChildPlanValues = z.infer<typeof childPlanSchema>;

export const staffProfileSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required."),
  phone: z.string().trim(),
  role: z.enum(["admin", "staff", "parent"]),
});
export type StaffProfileValues = z.infer<typeof staffProfileSchema>;

export function parseAllergies(input: string): string[] {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseImmunizations(input: string): { name: string }[] {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((name) => ({ name }));
}

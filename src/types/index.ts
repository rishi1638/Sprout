import type { ActivityType, Json, Tables } from "@/lib/database.types";

export type Profile = Tables<"profiles">;
export type Child = Tables<"children">;
export type Classroom = Tables<"classrooms">;
export type Enrollment = Tables<"enrollments">;
export type Activity = Tables<"activities">;
export type Attendance = Tables<"attendance">;
export type BillingPlan = Tables<"billing_plans">;
export type Invoice = Tables<"invoices">;
export type Announcement = Tables<"announcements">;
export type Event = Tables<"events">;
export type PermissionForm = Tables<"permission_forms">;
export type PermissionSignature = Tables<"permission_signatures">;
export type EmergencyContact = Tables<"emergency_contacts">;
export type Guardianship = Tables<"guardianships">;

export interface MealDetails {
  food: string;
  amount_eaten: "all" | "most" | "some" | "none";
}

export interface NapDetails {
  start: string;
  end: string;
}

export interface DiaperDetails {
  kind: "wet" | "soiled" | "dry" | "bathroom";
}

export type ActivityDetails = Partial<MealDetails & NapDetails & DiaperDetails>;

export function readActivityDetails(details: Json): ActivityDetails {
  if (details && typeof details === "object" && !Array.isArray(details)) {
    return details as ActivityDetails;
  }
  return {};
}

export interface ChildWithRelations extends Child {
  guardianships: (Guardianship & { profiles: Pick<Profile, "id" | "full_name" | "phone"> | null })[];
  enrollments: (Enrollment & { classrooms: Pick<Classroom, "id" | "name"> | null })[];
  emergency_contacts: EmergencyContact[];
}

export interface ActivityWithChild extends Activity {
  children: Pick<Child, "id" | "first_name" | "last_name"> | null;
  profiles: Pick<Profile, "id" | "full_name"> | null;
}

export interface AttendanceWithChild extends Attendance {
  children: Pick<Child, "id" | "first_name" | "last_name"> | null;
}

export interface InvoiceWithRelations extends Invoice {
  children: Pick<Child, "id" | "first_name" | "last_name"> | null;
  profiles: Pick<Profile, "id" | "full_name"> | null;
}

export interface ClassroomRatio {
  classroom_id: string;
  name: string;
  capacity: number;
  children_present: number;
  staff_assigned: number;
  enrolled_count: number;
}

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  meal: "Meal",
  nap: "Nap",
  diaper: "Diaper",
  bathroom: "Bathroom",
  note: "Note",
  photo: "Photo",
};

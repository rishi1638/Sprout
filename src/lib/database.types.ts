export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "admin" | "staff" | "parent";
export type EnrollmentStatus = "enrolled" | "waitlisted" | "withdrawn";
export type ActivityType = "meal" | "nap" | "diaper" | "bathroom" | "note" | "photo";
export type InvoiceStatus = "unpaid" | "paid" | "void";
export type BillingInterval = "weekly" | "monthly";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: UserRole;
          phone: string | null;
          avatar_url: string | null;
          quick_pin: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          role?: UserRole;
          phone?: string | null;
          avatar_url?: string | null;
          quick_pin?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: UserRole;
          phone?: string | null;
          avatar_url?: string | null;
          quick_pin?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      children: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          dob: string;
          enrollment_status: EnrollmentStatus;
          allergies: string[];
          immunizations: Json;
          medical_notes: string | null;
          photo_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          dob: string;
          enrollment_status?: EnrollmentStatus;
          allergies?: string[];
          immunizations?: Json;
          medical_notes?: string | null;
          photo_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          dob?: string;
          enrollment_status?: EnrollmentStatus;
          allergies?: string[];
          immunizations?: Json;
          medical_notes?: string | null;
          photo_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      emergency_contacts: {
        Row: {
          id: string;
          child_id: string;
          name: string;
          relationship: string;
          phone: string;
          priority: number;
        };
        Insert: {
          id?: string;
          child_id: string;
          name: string;
          relationship: string;
          phone: string;
          priority?: number;
        };
        Update: {
          id?: string;
          child_id?: string;
          name?: string;
          relationship?: string;
          phone?: string;
          priority?: number;
        };
        Relationships: [];
      };
      guardianships: {
        Row: {
          child_id: string;
          parent_id: string;
          relationship: string;
          is_primary: boolean;
        };
        Insert: {
          child_id: string;
          parent_id: string;
          relationship?: string;
          is_primary?: boolean;
        };
        Update: {
          child_id?: string;
          parent_id?: string;
          relationship?: string;
          is_primary?: boolean;
        };
        Relationships: [];
      };
      classrooms: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          capacity: number;
          min_age_months: number | null;
          max_age_months: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          capacity: number;
          min_age_months?: number | null;
          max_age_months?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          capacity?: number;
          min_age_months?: number | null;
          max_age_months?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      staff_assignments: {
        Row: {
          classroom_id: string;
          staff_id: string;
        };
        Insert: {
          classroom_id: string;
          staff_id: string;
        };
        Update: {
          classroom_id?: string;
          staff_id?: string;
        };
        Relationships: [];
      };
      enrollments: {
        Row: {
          id: string;
          child_id: string;
          classroom_id: string;
          start_date: string;
          end_date: string | null;
        };
        Insert: {
          id?: string;
          child_id: string;
          classroom_id: string;
          start_date?: string;
          end_date?: string | null;
        };
        Update: {
          id?: string;
          child_id?: string;
          classroom_id?: string;
          start_date?: string;
          end_date?: string | null;
        };
        Relationships: [];
      };
      activities: {
        Row: {
          id: string;
          child_id: string;
          classroom_id: string | null;
          staff_id: string;
          type: ActivityType;
          occurred_at: string;
          details: Json;
          note: string | null;
          photo_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          child_id: string;
          classroom_id?: string | null;
          staff_id: string;
          type: ActivityType;
          occurred_at?: string;
          details?: Json;
          note?: string | null;
          photo_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          child_id?: string;
          classroom_id?: string | null;
          staff_id?: string;
          type?: ActivityType;
          occurred_at?: string;
          details?: Json;
          note?: string | null;
          photo_path?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      attendance: {
        Row: {
          id: string;
          child_id: string;
          classroom_id: string;
          check_in_at: string;
          check_in_by: string;
          check_out_at: string | null;
          check_out_by: string | null;
        };
        Insert: {
          id?: string;
          child_id: string;
          classroom_id: string;
          check_in_at?: string;
          check_in_by: string;
          check_out_at?: string | null;
          check_out_by?: string | null;
        };
        Update: {
          id?: string;
          child_id?: string;
          classroom_id?: string;
          check_in_at?: string;
          check_in_by?: string;
          check_out_at?: string | null;
          check_out_by?: string | null;
        };
        Relationships: [];
      };
      billing_plans: {
        Row: {
          id: string;
          name: string;
          amount_cents: number;
          interval: BillingInterval;
          description: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          amount_cents: number;
          interval?: BillingInterval;
          description?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          amount_cents?: number;
          interval?: BillingInterval;
          description?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      child_plans: {
        Row: {
          child_id: string;
          plan_id: string;
          start_date: string;
        };
        Insert: {
          child_id: string;
          plan_id: string;
          start_date?: string;
        };
        Update: {
          child_id?: string;
          plan_id?: string;
          start_date?: string;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          parent_id: string;
          child_id: string;
          plan_id: string | null;
          period_start: string;
          period_end: string;
          amount_cents: number;
          status: InvoiceStatus;
          issued_at: string;
          paid_at: string | null;
        };
        Insert: {
          id?: string;
          parent_id: string;
          child_id: string;
          plan_id?: string | null;
          period_start: string;
          period_end: string;
          amount_cents: number;
          status?: InvoiceStatus;
          issued_at?: string;
          paid_at?: string | null;
        };
        Update: {
          id?: string;
          parent_id?: string;
          child_id?: string;
          plan_id?: string | null;
          period_start?: string;
          period_end?: string;
          amount_cents?: number;
          status?: InvoiceStatus;
          issued_at?: string;
          paid_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      classroom_ratios: {
        Row: {
          classroom_id: string;
          name: string;
          capacity: number;
          children_present: number;
          staff_assigned: number;
          enrolled_count: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      generate_monthly_invoices: {
        Args: { target_month?: string };
        Returns: number;
      };
      auth_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
    };
    Enums: {
      user_role: UserRole;
      enrollment_status: EnrollmentStatus;
      activity_type: ActivityType;
      invoice_status: InvoiceStatus;
      billing_interval: BillingInterval;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"];

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      body_measurements: {
        Row: {
          bicep_cm: number | null
          body_fat_pct: number | null
          chest_cm: number | null
          created_at: string
          hips_cm: number | null
          id: string
          measured_at: string
          notes: string | null
          thigh_cm: number | null
          user_id: string
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          bicep_cm?: number | null
          body_fat_pct?: number | null
          chest_cm?: number | null
          created_at?: string
          hips_cm?: number | null
          id?: string
          measured_at?: string
          notes?: string | null
          thigh_cm?: number | null
          user_id: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          bicep_cm?: number | null
          body_fat_pct?: number | null
          chest_cm?: number | null
          created_at?: string
          hips_cm?: number | null
          id?: string
          measured_at?: string
          notes?: string | null
          thigh_cm?: number | null
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      exercises: {
        Row: {
          created_at: string
          description: string | null
          equipment: Database["public"]["Enums"]["equipment_type"]
          exercise_type: Database["public"]["Enums"]["exercise_type"]
          id: string
          image_url: string | null
          instructions: string[]
          is_custom: boolean
          muscle_group: Database["public"]["Enums"]["muscle_group"]
          name: string
          secondary_muscles: Database["public"]["Enums"]["muscle_group"][]
          user_id: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          equipment?: Database["public"]["Enums"]["equipment_type"]
          exercise_type?: Database["public"]["Enums"]["exercise_type"]
          id?: string
          image_url?: string | null
          instructions?: string[]
          is_custom?: boolean
          muscle_group: Database["public"]["Enums"]["muscle_group"]
          name: string
          secondary_muscles?: Database["public"]["Enums"]["muscle_group"][]
          user_id?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          equipment?: Database["public"]["Enums"]["equipment_type"]
          exercise_type?: Database["public"]["Enums"]["exercise_type"]
          id?: string
          image_url?: string | null
          instructions?: string[]
          is_custom?: boolean
          muscle_group?: Database["public"]["Enums"]["muscle_group"]
          name?: string
          secondary_muscles?: Database["public"]["Enums"]["muscle_group"][]
          user_id?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      goals: {
        Row: {
          completed: boolean
          created_at: string
          current_value: number | null
          deadline: string | null
          id: string
          target_value: number
          title: string
          type: Database["public"]["Enums"]["goal_type"]
          unit: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          current_value?: number | null
          deadline?: string | null
          id?: string
          target_value: number
          title: string
          type: Database["public"]["Enums"]["goal_type"]
          unit: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          current_value?: number | null
          deadline?: string | null
          id?: string
          target_value?: number
          title?: string
          type?: Database["public"]["Enums"]["goal_type"]
          unit?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_records: {
        Row: {
          achieved_at: string
          created_at: string
          estimated_one_rep_max: number
          exercise_id: string
          id: string
          reps: number
          user_id: string
          weight_kg: number
        }
        Insert: {
          achieved_at: string
          created_at?: string
          estimated_one_rep_max: number
          exercise_id: string
          id?: string
          reps: number
          user_id: string
          weight_kg: number
        }
        Update: {
          achieved_at?: string
          created_at?: string
          estimated_one_rep_max?: number
          exercise_id?: string
          id?: string
          reps?: number
          user_id?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activity_level: Database["public"]["Enums"]["activity_level"]
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          goal: Database["public"]["Enums"]["fitness_goal"]
          height_cm: number | null
          id: string
          name: string
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          activity_level?: Database["public"]["Enums"]["activity_level"]
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          goal?: Database["public"]["Enums"]["fitness_goal"]
          height_cm?: number | null
          id?: string
          name?: string
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          activity_level?: Database["public"]["Enums"]["activity_level"]
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          goal?: Database["public"]["Enums"]["fitness_goal"]
          height_cm?: number | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      template_exercises: {
        Row: {
          default_reps: number | null
          default_sets: number
          default_weight_kg: number | null
          exercise_id: string
          id: string
          order: number
          template_id: string
        }
        Insert: {
          default_reps?: number | null
          default_sets?: number
          default_weight_kg?: number | null
          exercise_id: string
          id?: string
          order?: number
          template_id: string
        }
        Update: {
          default_reps?: number | null
          default_sets?: number
          default_weight_kg?: number | null
          exercise_id?: string
          id?: string
          order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_exercises_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          distance_meters: number | null
          duration_seconds: number | null
          exercise_id: string
          id: string
          is_pr: boolean
          logged_at: string
          notes: string | null
          reps: number | null
          rpe: number | null
          set_number: number
          set_type: Database["public"]["Enums"]["set_type"]
          weight_kg: number | null
          workout_id: string
        }
        Insert: {
          distance_meters?: number | null
          duration_seconds?: number | null
          exercise_id: string
          id?: string
          is_pr?: boolean
          logged_at?: string
          notes?: string | null
          reps?: number | null
          rpe?: number | null
          set_number: number
          set_type?: Database["public"]["Enums"]["set_type"]
          weight_kg?: number | null
          workout_id: string
        }
        Update: {
          distance_meters?: number | null
          duration_seconds?: number | null
          exercise_id?: string
          id?: string
          is_pr?: boolean
          logged_at?: string
          notes?: string | null
          reps?: number | null
          rpe?: number | null
          set_number?: number
          set_type?: Database["public"]["Enums"]["set_type"]
          weight_kg?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sets_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          created_at: string
          duration_minutes: number | null
          finished_at: string | null
          id: string
          name: string
          notes: string | null
          started_at: string
          template_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          finished_at?: string | null
          id?: string
          name: string
          notes?: string | null
          started_at?: string
          template_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          finished_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          started_at?: string
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      latest_workouts: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          finished_at: string | null
          id: string | null
          name: string | null
          notes: string | null
          started_at: string | null
          template_id: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      activity_level:
        | "sedentary"
        | "lightly_active"
        | "moderately_active"
        | "very_active"
        | "extra_active"
      equipment_type:
        | "barbell"
        | "dumbbell"
        | "cable"
        | "machine"
        | "bodyweight"
        | "kettlebell"
        | "bands"
        | "other"
      exercise_type: "strength" | "cardio" | "bodyweight" | "olympic"
      fitness_goal: "lose_fat" | "maintain" | "build_muscle" | "strength"
      gender_type: "male" | "female"
      goal_type:
        | "weight_target"
        | "lift_target"
        | "body_fat_target"
        | "workout_frequency"
      muscle_group:
        | "chest"
        | "back"
        | "shoulders"
        | "biceps"
        | "triceps"
        | "forearms"
        | "core"
        | "quadriceps"
        | "hamstrings"
        | "glutes"
        | "calves"
        | "full_body"
        | "cardio"
      set_type: "normal" | "warmup" | "dropset" | "failure" | "superset"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
> = (DefaultSchema["Tables"] & DefaultSchema["Views"])[T] extends { Row: infer R } ? R : never

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Insert: infer I } ? I : never

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Update: infer U } ? U : never

export type Enums<T extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][T]

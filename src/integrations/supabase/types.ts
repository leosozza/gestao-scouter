export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      "Bitrix leads": {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      fichas: {
        Row: {
          agendado: string | null
          cadastro_existe_foto: string | null
          compareceu: string | null
          confirmado: string | null
          created_at: string | null
          criado: string | null
          data_confirmacao_ficha: string | null
          datahoracel: string | null
          etapa: string | null
          etapafunil: string | null
          ficha_confirmada: string | null
          foto: string | null
          funilfichas: string | null
          gerenciamentofunil: string | null
          hora_criacao_ficha: string | null
          id: number
          idade: string | null
          local_da_abordagem: string | null
          localizacao: string | null
          modelo: string | null
          nome: string | null
          presenca_confirmada: string | null
          projetos: string | null
          qdoagendou: string | null
          scouter: string | null
          supervisor_do_scouter: string | null
          tabulacao: string | null
          updated_at: string | null
          valor_ficha: string | null
        }
        Insert: {
          agendado?: string | null
          cadastro_existe_foto?: string | null
          compareceu?: string | null
          confirmado?: string | null
          created_at?: string | null
          criado?: string | null
          data_confirmacao_ficha?: string | null
          datahoracel?: string | null
          etapa?: string | null
          etapafunil?: string | null
          ficha_confirmada?: string | null
          foto?: string | null
          funilfichas?: string | null
          gerenciamentofunil?: string | null
          hora_criacao_ficha?: string | null
          id: number
          idade?: string | null
          local_da_abordagem?: string | null
          localizacao?: string | null
          modelo?: string | null
          nome?: string | null
          presenca_confirmada?: string | null
          projetos?: string | null
          qdoagendou?: string | null
          scouter?: string | null
          supervisor_do_scouter?: string | null
          tabulacao?: string | null
          updated_at?: string | null
          valor_ficha?: string | null
        }
        Update: {
          agendado?: string | null
          cadastro_existe_foto?: string | null
          compareceu?: string | null
          confirmado?: string | null
          created_at?: string | null
          criado?: string | null
          data_confirmacao_ficha?: string | null
          datahoracel?: string | null
          etapa?: string | null
          etapafunil?: string | null
          ficha_confirmada?: string | null
          foto?: string | null
          funilfichas?: string | null
          gerenciamentofunil?: string | null
          hora_criacao_ficha?: string | null
          id?: number
          idade?: string | null
          local_da_abordagem?: string | null
          localizacao?: string | null
          modelo?: string | null
          nome?: string | null
          presenca_confirmada?: string | null
          projetos?: string | null
          qdoagendou?: string | null
          scouter?: string | null
          supervisor_do_scouter?: string | null
          tabulacao?: string | null
          updated_at?: string | null
          valor_ficha?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          allowed: boolean
          created_at: string | null
          id: number
          module: string
          role_id: number
        }
        Insert: {
          action: string
          allowed?: boolean
          created_at?: string | null
          id?: number
          module: string
          role_id: number
        }
        Update: {
          action?: string
          allowed?: boolean
          created_at?: string | null
          id?: number
          module?: string
          role_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          role_id: number
          scouter_id: number | null
          supervisor_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name: string
          role_id: number
          scouter_id?: number | null
          supervisor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role_id?: number
          scouter_id?: number | null
          supervisor_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "user_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "users_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: number
          payload: Json | null
          source: string
          status: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: number
          payload?: Json | null
          source: string
          status: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: number
          payload?: Json | null
          source?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_permissions: {
        Row: {
          action: string | null
          allowed: boolean | null
          module: string | null
          role: string | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_role: {
        Args: { user_id: string }
        Returns: string
      }
      has_permission: {
        Args: { action_name: string; module_name: string; user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

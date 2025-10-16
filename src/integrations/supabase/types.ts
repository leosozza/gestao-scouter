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
      app_settings: {
        Row: {
          auto_sync_interval: number | null
          created_at: string | null
          default_tile_server: string | null
          enable_offline_mode: boolean | null
          id: string
          max_file_size_mb: number | null
          updated_at: string | null
        }
        Insert: {
          auto_sync_interval?: number | null
          created_at?: string | null
          default_tile_server?: string | null
          enable_offline_mode?: boolean | null
          id?: string
          max_file_size_mb?: number | null
          updated_at?: string | null
        }
        Update: {
          auto_sync_interval?: number | null
          created_at?: string | null
          default_tile_server?: string | null
          enable_offline_mode?: boolean | null
          id?: string
          max_file_size_mb?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          agent_id: number | null
          call_duration: number | null
          call_recording_url: string | null
          call_status: string
          ficha_id: number | null
          id: number
          notes: string | null
          phone_called: string
          timestamp: string | null
        }
        Insert: {
          agent_id?: number | null
          call_duration?: number | null
          call_recording_url?: string | null
          call_status: string
          ficha_id?: number | null
          id?: number
          notes?: string | null
          phone_called: string
          timestamp?: string | null
        }
        Update: {
          agent_id?: number | null
          call_duration?: number | null
          call_recording_url?: string | null
          call_status?: string
          ficha_id?: number | null
          id?: number
          notes?: string | null
          phone_called?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "telemarketing_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_ficha_id_fkey"
            columns: ["ficha_id"]
            isOneToOne: false
            referencedRelation: "fichas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_ficha_id_fkey"
            columns: ["ficha_id"]
            isOneToOne: false
            referencedRelation: "fichas_completas"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_configs: {
        Row: {
          config: Json
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          config: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dashboard_indicator_configs: {
        Row: {
          aggregation: string
          chart_type: string | null
          created_at: string | null
          filter_condition: Json | null
          format: string | null
          id: string
          indicator_key: string
          position: number | null
          source_column: string
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          aggregation?: string
          chart_type?: string | null
          created_at?: string | null
          filter_condition?: Json | null
          format?: string | null
          id?: string
          indicator_key: string
          position?: number | null
          source_column: string
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          aggregation?: string
          chart_type?: string | null
          created_at?: string | null
          filter_condition?: Json | null
          format?: string | null
          id?: string
          indicator_key?: string
          position?: number | null
          source_column?: string
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      fichas: {
        Row: {
          agendado: string | null
          bitrix_id: string | null
          bitrix_status: string | null
          bitrix_synced_at: string | null
          cadastro_existe_foto: string | null
          compareceu: string | null
          confirmado: string | null
          criado: string | null
          data_agendamento: string | null
          deleted: boolean | null
          email: string | null
          etapa: string | null
          ficha_confirmada: string | null
          foto: string | null
          hora_criacao_ficha: string | null
          id: number
          idade: string | null
          latitude: number | null
          local_da_abordagem: string | null
          localizacao: string | null
          longitude: number | null
          modelo: string | null
          nome: string
          observacoes_telemarketing: string | null
          presenca_confirmada: string | null
          projeto: string | null
          raw: Json | null
          resultado_ligacao: string | null
          scouter: string | null
          scouter_user_id: string | null
          supervisor: string | null
          tabulacao: string | null
          telefone: string | null
          telemarketing_user_id: string | null
          updated_at: string | null
          valor_ficha: number | null
        }
        Insert: {
          agendado?: string | null
          bitrix_id?: string | null
          bitrix_status?: string | null
          bitrix_synced_at?: string | null
          cadastro_existe_foto?: string | null
          compareceu?: string | null
          confirmado?: string | null
          criado?: string | null
          data_agendamento?: string | null
          deleted?: boolean | null
          email?: string | null
          etapa?: string | null
          ficha_confirmada?: string | null
          foto?: string | null
          hora_criacao_ficha?: string | null
          id?: number
          idade?: string | null
          latitude?: number | null
          local_da_abordagem?: string | null
          localizacao?: string | null
          longitude?: number | null
          modelo?: string | null
          nome: string
          observacoes_telemarketing?: string | null
          presenca_confirmada?: string | null
          projeto?: string | null
          raw?: Json | null
          resultado_ligacao?: string | null
          scouter?: string | null
          scouter_user_id?: string | null
          supervisor?: string | null
          tabulacao?: string | null
          telefone?: string | null
          telemarketing_user_id?: string | null
          updated_at?: string | null
          valor_ficha?: number | null
        }
        Update: {
          agendado?: string | null
          bitrix_id?: string | null
          bitrix_status?: string | null
          bitrix_synced_at?: string | null
          cadastro_existe_foto?: string | null
          compareceu?: string | null
          confirmado?: string | null
          criado?: string | null
          data_agendamento?: string | null
          deleted?: boolean | null
          email?: string | null
          etapa?: string | null
          ficha_confirmada?: string | null
          foto?: string | null
          hora_criacao_ficha?: string | null
          id?: number
          idade?: string | null
          latitude?: number | null
          local_da_abordagem?: string | null
          localizacao?: string | null
          longitude?: number | null
          modelo?: string | null
          nome?: string
          observacoes_telemarketing?: string | null
          presenca_confirmada?: string | null
          projeto?: string | null
          raw?: Json | null
          resultado_ligacao?: string | null
          scouter?: string | null
          scouter_user_id?: string | null
          supervisor?: string | null
          tabulacao?: string | null
          telefone?: string | null
          telemarketing_user_id?: string | null
          updated_at?: string | null
          valor_ficha?: number | null
        }
        Relationships: []
      }
      field_mappings: {
        Row: {
          created_at: string | null
          data_type: string
          description: string | null
          entity_type: string
          id: string
          is_required: boolean | null
          legacy_aliases: Json
          supabase_field: string
          transform_function: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_type: string
          description?: string | null
          entity_type: string
          id?: string
          is_required?: boolean | null
          legacy_aliases?: Json
          supabase_field: string
          transform_function?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_type?: string
          description?: string | null
          entity_type?: string
          id?: string
          is_required?: boolean | null
          legacy_aliases?: Json
          supabase_field?: string
          transform_function?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          allowed: boolean | null
          id: number
          module: string
          role_id: number | null
        }
        Insert: {
          action: string
          allowed?: boolean | null
          id?: number
          module: string
          role_id?: number | null
        }
        Update: {
          action?: string
          allowed?: boolean | null
          id?: number
          module?: string
          role_id?: number | null
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
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          phone: string | null
          project: string
          scouter_id: number | null
          supervisor_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name: string
          phone?: string | null
          project: string
          scouter_id?: number | null
          supervisor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          project?: string
          scouter_id?: number | null
          supervisor_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      roles: {
        Row: {
          description: string | null
          id: number
          name: string
          project: string | null
        }
        Insert: {
          description?: string | null
          id?: number
          name: string
          project?: string | null
        }
        Update: {
          description?: string | null
          id?: number
          name?: string
          project?: string | null
        }
        Relationships: []
      }
      scouter_locations: {
        Row: {
          accuracy: number | null
          battery_level: number | null
          id: number
          is_moving: boolean | null
          latitude: number
          longitude: number
          scouter_id: number | null
          timestamp: string | null
        }
        Insert: {
          accuracy?: number | null
          battery_level?: number | null
          id?: number
          is_moving?: boolean | null
          latitude: number
          longitude: number
          scouter_id?: number | null
          timestamp?: string | null
        }
        Update: {
          accuracy?: number | null
          battery_level?: number | null
          id?: number
          is_moving?: boolean | null
          latitude?: number
          longitude?: number
          scouter_id?: number | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scouter_locations_scouter_id_fkey"
            columns: ["scouter_id"]
            isOneToOne: false
            referencedRelation: "scouter_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scouter_metrics: {
        Row: {
          created_at: string | null
          fichas_com_foto: number | null
          fichas_confirmadas: number | null
          id: number
          iqs: number | null
          periodo: string
          scouter_id: number | null
          taxa_conversao: number | null
          total_fichas: number | null
        }
        Insert: {
          created_at?: string | null
          fichas_com_foto?: number | null
          fichas_confirmadas?: number | null
          id?: number
          iqs?: number | null
          periodo: string
          scouter_id?: number | null
          taxa_conversao?: number | null
          total_fichas?: number | null
        }
        Update: {
          created_at?: string | null
          fichas_com_foto?: number | null
          fichas_confirmadas?: number | null
          id?: number
          iqs?: number | null
          periodo?: string
          scouter_id?: number | null
          taxa_conversao?: number | null
          total_fichas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scouter_metrics_scouter_id_fkey"
            columns: ["scouter_id"]
            isOneToOne: false
            referencedRelation: "scouter_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scouter_payments: {
        Row: {
          bonus: number | null
          created_at: string | null
          data_pagamento: string | null
          descontos: number | null
          id: number
          observacoes: string | null
          periodo: string
          scouter_id: number | null
          status: string | null
          valor_base: number
          valor_total: number
        }
        Insert: {
          bonus?: number | null
          created_at?: string | null
          data_pagamento?: string | null
          descontos?: number | null
          id?: number
          observacoes?: string | null
          periodo: string
          scouter_id?: number | null
          status?: string | null
          valor_base: number
          valor_total: number
        }
        Update: {
          bonus?: number | null
          created_at?: string | null
          data_pagamento?: string | null
          descontos?: number | null
          id?: number
          observacoes?: string | null
          periodo?: string
          scouter_id?: number | null
          status?: string | null
          valor_base?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "scouter_payments_scouter_id_fkey"
            columns: ["scouter_id"]
            isOneToOne: false
            referencedRelation: "scouter_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scouter_profiles: {
        Row: {
          ativo: boolean | null
          cpf: string | null
          created_at: string | null
          data_admissao: string | null
          id: number
          nome: string
          supervisor: string | null
          supervisor_user_id: string | null
          telefone: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          cpf?: string | null
          created_at?: string | null
          data_admissao?: string | null
          id?: number
          nome: string
          supervisor?: string | null
          supervisor_user_id?: string | null
          telefone?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          cpf?: string | null
          created_at?: string | null
          data_admissao?: string | null
          id?: number
          nome?: string
          supervisor?: string | null
          supervisor_user_id?: string | null
          telefone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          completed_at: string | null
          errors: Json | null
          id: string
          processing_time_ms: number | null
          records_failed: number
          records_synced: number
          started_at: string
          sync_direction: string
        }
        Insert: {
          completed_at?: string | null
          errors?: Json | null
          id?: string
          processing_time_ms?: number | null
          records_failed?: number
          records_synced?: number
          started_at?: string
          sync_direction: string
        }
        Update: {
          completed_at?: string | null
          errors?: Json | null
          id?: string
          processing_time_ms?: number | null
          records_failed?: number
          records_synced?: number
          started_at?: string
          sync_direction?: string
        }
        Relationships: []
      }
      sync_status: {
        Row: {
          id: string
          last_error: string | null
          last_sync_at: string | null
          last_sync_success: boolean | null
          project_name: string
          total_records: number | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          last_sync_success?: boolean | null
          project_name: string
          total_records?: number | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          last_sync_success?: boolean | null
          project_name?: string
          total_records?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      telemarketing_agents: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          data_admissao: string | null
          id: number
          nome: string
          supervisor: string | null
          telefone: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          data_admissao?: string | null
          id?: number
          nome: string
          supervisor?: string | null
          telefone?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          data_admissao?: string | null
          id?: number
          nome?: string
          supervisor?: string | null
          telefone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      telemarketing_metrics: {
        Row: {
          agent_id: number | null
          conversoes: number | null
          created_at: string | null
          id: number
          ligacoes_atendidas: number | null
          periodo: string
          taxa_conversao: number | null
          tempo_medio_ligacao: number | null
          total_ligacoes: number | null
        }
        Insert: {
          agent_id?: number | null
          conversoes?: number | null
          created_at?: string | null
          id?: number
          ligacoes_atendidas?: number | null
          periodo: string
          taxa_conversao?: number | null
          tempo_medio_ligacao?: number | null
          total_ligacoes?: number | null
        }
        Update: {
          agent_id?: number | null
          conversoes?: number | null
          created_at?: string | null
          id?: number
          ligacoes_atendidas?: number | null
          periodo?: string
          taxa_conversao?: number | null
          tempo_medio_ligacao?: number | null
          total_ligacoes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "telemarketing_metrics_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "telemarketing_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          project: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: number
          payload: Json | null
          source: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: number
          payload?: Json | null
          source?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: number
          payload?: Json | null
          source?: string | null
          status?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      fichas_completas: {
        Row: {
          agendado: string | null
          bitrix_id: string | null
          bitrix_status: string | null
          bitrix_synced_at: string | null
          cadastro_existe_foto: string | null
          compareceu: string | null
          confirmado: string | null
          criado: string | null
          data_agendamento: string | null
          deleted: boolean | null
          email: string | null
          etapa: string | null
          ficha_confirmada: string | null
          foto: string | null
          hora_criacao_ficha: string | null
          id: number | null
          idade: string | null
          latitude: number | null
          local_da_abordagem: string | null
          localizacao: string | null
          longitude: number | null
          modelo: string | null
          nome: string | null
          observacoes_telemarketing: string | null
          presenca_confirmada: string | null
          projeto: string | null
          raw: Json | null
          resultado_ligacao: string | null
          scouter: string | null
          scouter_nome_completo: string | null
          scouter_telefone: string | null
          scouter_user_id: string | null
          supervisor: string | null
          tabulacao: string | null
          telefone: string | null
          telemarketing_nome: string | null
          telemarketing_user_id: string | null
          total_ligacoes: number | null
          ultima_ligacao: string | null
          updated_at: string | null
          valor_ficha: number | null
        }
        Relationships: []
      }
      metricas_gerais: {
        Row: {
          comparecimentos: number | null
          data: string | null
          fichas_confirmadas: number | null
          fichas_tabuladas: number | null
          projeto: string | null
          total_fichas: number | null
          valor_medio_ficha: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_has_project_access: {
        Args: { _project: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "supervisor"
        | "scouter"
        | "telemarketing"
        | "gestor_telemarketing"
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
    Enums: {
      app_role: [
        "admin",
        "supervisor",
        "scouter",
        "telemarketing",
        "gestor_telemarketing",
      ],
    },
  },
} as const

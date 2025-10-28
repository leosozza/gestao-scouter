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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      bitrix_leads: {
        Row: {
          agencia_e_seletivas: string | null
          alerta: string | null
          bitrix_id: number
          cadastro_existe_foto: string | null
          celular: string | null
          created_at: string | null
          data_de_criacao_da_ficha: string | null
          data_do_agendamento: string | null
          etapa: string | null
          etapa_funil: string | null
          ficha_confirmada: string | null
          fonte: string | null
          foto_do_modelo: string | null
          gerenciamento_funil: string | null
          id: string
          idade: number | null
          lead_score: string | null
          local_da_abordagem: string | null
          nome_do_modelo: string | null
          op_telemarketing: string | null
          presenca_confirmada: string | null
          primeiro_nome: string | null
          scouter: string | null
          status_da_ficha: string | null
          supervisor_do_scouter: string | null
          synced_at: string | null
          telefone_de_trabalho: string | null
          updated_at: string | null
          user_id: string | null
          valor_da_ficha: string | null
        }
        Insert: {
          agencia_e_seletivas?: string | null
          alerta?: string | null
          bitrix_id: number
          cadastro_existe_foto?: string | null
          celular?: string | null
          created_at?: string | null
          data_de_criacao_da_ficha?: string | null
          data_do_agendamento?: string | null
          etapa?: string | null
          etapa_funil?: string | null
          ficha_confirmada?: string | null
          fonte?: string | null
          foto_do_modelo?: string | null
          gerenciamento_funil?: string | null
          id?: string
          idade?: number | null
          lead_score?: string | null
          local_da_abordagem?: string | null
          nome_do_modelo?: string | null
          op_telemarketing?: string | null
          presenca_confirmada?: string | null
          primeiro_nome?: string | null
          scouter?: string | null
          status_da_ficha?: string | null
          supervisor_do_scouter?: string | null
          synced_at?: string | null
          telefone_de_trabalho?: string | null
          updated_at?: string | null
          user_id?: string | null
          valor_da_ficha?: string | null
        }
        Update: {
          agencia_e_seletivas?: string | null
          alerta?: string | null
          bitrix_id?: number
          cadastro_existe_foto?: string | null
          celular?: string | null
          created_at?: string | null
          data_de_criacao_da_ficha?: string | null
          data_do_agendamento?: string | null
          etapa?: string | null
          etapa_funil?: string | null
          ficha_confirmada?: string | null
          fonte?: string | null
          foto_do_modelo?: string | null
          gerenciamento_funil?: string | null
          id?: string
          idade?: number | null
          lead_score?: string | null
          local_da_abordagem?: string | null
          nome_do_modelo?: string | null
          op_telemarketing?: string | null
          presenca_confirmada?: string | null
          primeiro_nome?: string | null
          scouter?: string | null
          status_da_ficha?: string | null
          supervisor_do_scouter?: string | null
          synced_at?: string | null
          telefone_de_trabalho?: string | null
          updated_at?: string | null
          user_id?: string | null
          valor_da_ficha?: string | null
        }
        Relationships: []
      }
      bitrix_payment_updates: {
        Row: {
          bitrix_lead_ids: number[] | null
          bitrix_response: Json | null
          bitrix_update_status: string | null
          created_at: string | null
          dias_falta: number
          dias_folga: number
          dias_trabalhados: number
          id: string
          payment_status: string | null
          periodo_fim: string
          periodo_inicio: string
          project_name: string
          scouter_name: string
          sent_to_bitrix_at: string | null
          total_ajuda_custo: number
          total_fichas: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bitrix_lead_ids?: number[] | null
          bitrix_response?: Json | null
          bitrix_update_status?: string | null
          created_at?: string | null
          dias_falta: number
          dias_folga: number
          dias_trabalhados: number
          id?: string
          payment_status?: string | null
          periodo_fim: string
          periodo_inicio: string
          project_name: string
          scouter_name: string
          sent_to_bitrix_at?: string | null
          total_ajuda_custo: number
          total_fichas: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bitrix_lead_ids?: number[] | null
          bitrix_response?: Json | null
          bitrix_update_status?: string | null
          created_at?: string | null
          dias_falta?: number
          dias_folga?: number
          dias_trabalhados?: number
          id?: string
          payment_status?: string | null
          periodo_fim?: string
          periodo_inicio?: string
          project_name?: string
          scouter_name?: string
          sent_to_bitrix_at?: string | null
          total_ajuda_custo?: number
          total_fichas?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bitrix_settings: {
        Row: {
          auto_sync_enabled: boolean | null
          created_at: string | null
          domain: string
          id: string
          last_sync_at: string | null
          leads_stage_mapping: Json | null
          scouter_field_mapping: Json | null
          sync_interval_minutes: number | null
          updated_at: string | null
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          auto_sync_enabled?: boolean | null
          created_at?: string | null
          domain: string
          id?: string
          last_sync_at?: string | null
          leads_stage_mapping?: Json | null
          scouter_field_mapping?: Json | null
          sync_interval_minutes?: number | null
          updated_at?: string | null
          user_id: string
          webhook_url?: string | null
        }
        Update: {
          auto_sync_enabled?: boolean | null
          created_at?: string | null
          domain?: string
          id?: string
          last_sync_at?: string | null
          leads_stage_mapping?: Json | null
          scouter_field_mapping?: Json | null
          sync_interval_minutes?: number | null
          updated_at?: string | null
          user_id?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      bitrix_sync_runs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          records_created: number | null
          records_failed: number | null
          records_processed: number | null
          records_updated: number | null
          started_at: string | null
          status: string
          sync_type: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          records_created?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string | null
          status?: string
          sync_type: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          records_created?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

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
          ajuda_custo_tier: Json
          created_at: string
          id: string
          peso_agendado: number
          peso_compareceu: number
          peso_concl_neg: number
          peso_concl_pos: number
          peso_confirmada: number
          peso_contato: number
          peso_foto: number
          peso_interesse: number
          peso_sem_contato: number
          peso_sem_interesse_def: number
          peso_sem_interesse_momento: number
          quality_threshold: number
          updated_at: string
          valor_base_ficha: number
        }
        Insert: {
          ajuda_custo_tier?: Json
          created_at?: string
          id?: string
          peso_agendado?: number
          peso_compareceu?: number
          peso_concl_neg?: number
          peso_concl_pos?: number
          peso_confirmada?: number
          peso_contato?: number
          peso_foto?: number
          peso_interesse?: number
          peso_sem_contato?: number
          peso_sem_interesse_def?: number
          peso_sem_interesse_momento?: number
          quality_threshold?: number
          updated_at?: string
          valor_base_ficha?: number
        }
        Update: {
          ajuda_custo_tier?: Json
          created_at?: string
          id?: string
          peso_agendado?: number
          peso_compareceu?: number
          peso_concl_neg?: number
          peso_concl_pos?: number
          peso_confirmada?: number
          peso_contato?: number
          peso_foto?: number
          peso_interesse?: number
          peso_sem_contato?: number
          peso_sem_interesse_def?: number
          peso_sem_interesse_momento?: number
          quality_threshold?: number
          updated_at?: string
          valor_base_ficha?: number
        }
        Relationships: []
      }
      bitrix_leads: {
        Row: {
          altura_cm: string | null
          bairro: string | null
          bitrix_id: number
          celular: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cor_do_cabelo: string | null
          cor_dos_olhos: string | null
          created_at: string
          data_de_criacao_da_ficha: string | null
          endereco: string | null
          etapa: string | null
          foto_do_modelo: string | null
          id: string
          lead_score: string | null
          local_da_abordagem: string | null
          manequim_de_roupa: string | null
          medida_da_cintura: string | null
          medida_do_busto: string | null
          medida_do_quadril: string | null
          nome_do_modelo: string | null
          numero: string | null
          numero_do_calcado: string | null
          ponto_de_referencia: string | null
          primeiro_nome: string | null
          telefone_de_trabalho: string | null
          uf: string | null
          updated_at: string
          valor_da_ficha: string | null
        }
        Insert: {
          altura_cm?: string | null
          bairro?: string | null
          bitrix_id: number
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cor_do_cabelo?: string | null
          cor_dos_olhos?: string | null
          created_at?: string
          data_de_criacao_da_ficha?: string | null
          endereco?: string | null
          etapa?: string | null
          foto_do_modelo?: string | null
          id?: string
          lead_score?: string | null
          local_da_abordagem?: string | null
          manequim_de_roupa?: string | null
          medida_da_cintura?: string | null
          medida_do_busto?: string | null
          medida_do_quadril?: string | null
          nome_do_modelo?: string | null
          numero?: string | null
          numero_do_calcado?: string | null
          ponto_de_referencia?: string | null
          primeiro_nome?: string | null
          telefone_de_trabalho?: string | null
          uf?: string | null
          updated_at?: string
          valor_da_ficha?: string | null
        }
        Update: {
          altura_cm?: string | null
          bairro?: string | null
          bitrix_id?: number
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cor_do_cabelo?: string | null
          cor_dos_olhos?: string | null
          created_at?: string
          data_de_criacao_da_ficha?: string | null
          endereco?: string | null
          etapa?: string | null
          foto_do_modelo?: string | null
          id?: string
          lead_score?: string | null
          local_da_abordagem?: string | null
          manequim_de_roupa?: string | null
          medida_da_cintura?: string | null
          medida_do_busto?: string | null
          medida_do_quadril?: string | null
          nome_do_modelo?: string | null
          numero?: string | null
          numero_do_calcado?: string | null
          ponto_de_referencia?: string | null
          primeiro_nome?: string | null
          telefone_de_trabalho?: string | null
          uf?: string | null
          updated_at?: string
          valor_da_ficha?: string | null
        }
        Relationships: []
      }
      bitrix_sync_runs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          records_created: number | null
          records_failed: number | null
          records_processed: number | null
          records_updated: number | null
          started_at: string
          status: string
          sync_type: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          records_created?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string
          status?: string
          sync_type: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          records_created?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string
          status?: string
          sync_type?: string
          user_id?: string
        }
        Relationships: []
      }
      scouter_profiles: {
        Row: {
          active: boolean
          created_at: string
          current_tier_id: string | null
          fichas_value: number
          id: string
          scouter_name: string
          updated_at: string
          user_id: string | null
          weekly_goal: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          current_tier_id?: string | null
          fichas_value?: number
          id?: string
          scouter_name: string
          updated_at?: string
          user_id?: string | null
          weekly_goal?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          current_tier_id?: string | null
          fichas_value?: number
          id?: string
          scouter_name?: string
          updated_at?: string
          user_id?: string | null
          weekly_goal?: number
        }
        Relationships: [
          {
            foreignKeyName: "scouter_profiles_current_tier_id_fkey"
            columns: ["current_tier_id"]
            isOneToOne: false
            referencedRelation: "scouter_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      scouter_tiers: {
        Row: {
          bonus_multiplier: number
          conversion_rate_max: number
          conversion_rate_min: number
          created_at: string
          id: string
          max_fichas_per_week: number | null
          min_fichas_per_week: number
          tier_name: string
          tier_order: number
          updated_at: string
        }
        Insert: {
          bonus_multiplier?: number
          conversion_rate_max?: number
          conversion_rate_min?: number
          created_at?: string
          id?: string
          max_fichas_per_week?: number | null
          min_fichas_per_week?: number
          tier_name: string
          tier_order: number
          updated_at?: string
        }
        Update: {
          bonus_multiplier?: number
          conversion_rate_max?: number
          conversion_rate_min?: number
          created_at?: string
          id?: string
          max_fichas_per_week?: number | null
          min_fichas_per_week?: number
          tier_name?: string
          tier_order?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      vw_funil_semana: {
        Row: {
          convertidos: number | null
          semana: string | null
          taxa_conversao: number | null
          total_fichas: number | null
          valor_medio_ficha: number | null
        }
        Relationships: []
      }
      vw_projecao_scouter: {
        Row: {
          projecao_agressiva: number | null
          projecao_conservadora: number | null
          projecao_historica: number | null
          projecao_provavel: number | null
          scouter_name: string | null
          semana_futura: number | null
          semana_label: string | null
          tier_name: string | null
          weekly_goal: number | null
        }
        Relationships: []
      }
      vw_quality_semana: {
        Row: {
          conversion_rate_max: number | null
          conversion_rate_min: number | null
          convertidos: number | null
          performance_status: string | null
          scouter: string | null
          semana: string | null
          taxa_conversao_individual: number | null
          tier_name: string | null
          total_fichas: number | null
        }
        Relationships: []
      }
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

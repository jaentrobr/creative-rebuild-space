// Tipos gerados a partir do schema real do Supabase do projeto (efkdhroootmfleltepye).
// Regenerar rodando o script de introspecção quando o schema mudar.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      advances: {
        Row: {
          id: string
          producer_id: string
          event_id: string | null
          type: Database["public"]["Enums"]["advance_type"]
          requested_amount: number
          fee_amount: number
          net_amount: number
          status: Database["public"]["Enums"]["process_status"]
          asaas_reference_id: string | null
          processed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          producer_id?: string
          event_id?: string | null
          type?: Database["public"]["Enums"]["advance_type"]
          requested_amount?: number
          fee_amount?: number
          net_amount?: number
          status?: Database["public"]["Enums"]["process_status"]
          asaas_reference_id?: string | null
          processed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          producer_id?: string
          event_id?: string | null
          type?: Database["public"]["Enums"]["advance_type"]
          requested_amount?: number
          fee_amount?: number
          net_amount?: number
          status?: Database["public"]["Enums"]["process_status"]
          asaas_reference_id?: string | null
          processed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: number
          actor_id: string | null
          action: string
          entity: string
          entity_id: string | null
          details: Json
          created_at: string
        }
        Insert: {
          id?: number
          actor_id?: string | null
          action?: string
          entity?: string
          entity_id?: string | null
          details?: Json
          created_at?: string
        }
        Update: {
          id?: number
          actor_id?: string | null
          action?: string
          entity?: string
          entity_id?: string | null
          details?: Json
          created_at?: string
        }
        Relationships: []
      }
      chargebacks: {
        Row: {
          id: string
          order_id: string
          event_id: string
          amount: number
          status: Database["public"]["Enums"]["chargeback_status"]
          reason: string | null
          defense_deadline: string | null
          defense_notes: string | null
          defense_files: string[] | null
          asaas_chargeback_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id?: string
          event_id?: string
          amount?: number
          status?: Database["public"]["Enums"]["chargeback_status"]
          reason?: string | null
          defense_deadline?: string | null
          defense_notes?: string | null
          defense_files?: string[] | null
          asaas_chargeback_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          event_id?: string
          amount?: number
          status?: Database["public"]["Enums"]["chargeback_status"]
          reason?: string | null
          defense_deadline?: string | null
          defense_notes?: string | null
          defense_files?: string[] | null
          asaas_chargeback_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      checkins: {
        Row: {
          id: string
          ticket_id: string | null
          event_id: string
          staff_user_id: string | null
          result: Database["public"]["Enums"]["checkin_result"]
          code_prefix: string | null
          scanned_at: string
          device_id: string | null
          was_offline: boolean
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id?: string | null
          event_id?: string
          staff_user_id?: string | null
          result?: Database["public"]["Enums"]["checkin_result"]
          code_prefix?: string | null
          scanned_at?: string
          device_id?: string | null
          was_offline?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string | null
          event_id?: string
          staff_user_id?: string | null
          result?: Database["public"]["Enums"]["checkin_result"]
          code_prefix?: string | null
          scanned_at?: string
          device_id?: string | null
          was_offline?: boolean
          created_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          id: string
          event_id: string
          code: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          max_uses: number | null
          used_count: number
          valid_until: string | null
          ticket_type_ids: string[] | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          event_id?: string
          code?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          max_uses?: number | null
          used_count?: number
          valid_until?: string | null
          ticket_type_ids?: string[] | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          code?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          max_uses?: number | null
          used_count?: number
          valid_until?: string | null
          ticket_type_ids?: string[] | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      event_staff: {
        Row: {
          id: string
          event_id: string
          user_id: string
          display_name: string
          username: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          event_id?: string
          user_id?: string
          display_name?: string
          username?: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          display_name?: string
          username?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          producer_id: string
          slug: string
          title: string
          genre: string | null
          age_rating: string | null
          description: string | null
          banner_url: string | null
          starts_at: string | null
          ends_at: string | null
          doors_open_at: string | null
          venue_name: string | null
          cep: string | null
          street: string | null
          address_number: string | null
          neighborhood: string | null
          city: string | null
          state: string | null
          latitude: number | null
          longitude: number | null
          status: Database["public"]["Enums"]["event_status"]
          visibility: Database["public"]["Enums"]["event_visibility"]
          fee_payer: Database["public"]["Enums"]["fee_payer"]
          max_installments: number
          allow_cancellation: boolean
          allow_transfer: boolean
          transfer_lock_hours: number
          courtesy_limit: number
          is_featured: boolean
          suspended_reason: string | null
          fee_pix_percent: number
          fee_pix_min: number
          fee_card_percent: number
          fee_card_min: number
          published_at: string | null
          created_at: string
          updated_at: string
          original_starts_at: string | null
          previous_starts_at: string | null
          reschedule_count: number
          rescheduled_at: string | null
          reschedule_reason: string | null
        }
        Insert: {
          id?: string
          producer_id?: string
          slug?: string
          title?: string
          genre?: string | null
          age_rating?: string | null
          description?: string | null
          banner_url?: string | null
          starts_at?: string | null
          ends_at?: string | null
          doors_open_at?: string | null
          venue_name?: string | null
          cep?: string | null
          street?: string | null
          address_number?: string | null
          neighborhood?: string | null
          city?: string | null
          state?: string | null
          latitude?: number | null
          longitude?: number | null
          status?: Database["public"]["Enums"]["event_status"]
          visibility?: Database["public"]["Enums"]["event_visibility"]
          fee_payer?: Database["public"]["Enums"]["fee_payer"]
          max_installments?: number
          allow_cancellation?: boolean
          allow_transfer?: boolean
          transfer_lock_hours?: number
          courtesy_limit?: number
          is_featured?: boolean
          suspended_reason?: string | null
          fee_pix_percent?: number
          fee_pix_min?: number
          fee_card_percent?: number
          fee_card_min?: number
          published_at?: string | null
          created_at?: string
          updated_at?: string
          original_starts_at?: string | null
          previous_starts_at?: string | null
          reschedule_count?: number
          rescheduled_at?: string | null
          reschedule_reason?: string | null
        }
        Update: {
          id?: string
          producer_id?: string
          slug?: string
          title?: string
          genre?: string | null
          age_rating?: string | null
          description?: string | null
          banner_url?: string | null
          starts_at?: string | null
          ends_at?: string | null
          doors_open_at?: string | null
          venue_name?: string | null
          cep?: string | null
          street?: string | null
          address_number?: string | null
          neighborhood?: string | null
          city?: string | null
          state?: string | null
          latitude?: number | null
          longitude?: number | null
          status?: Database["public"]["Enums"]["event_status"]
          visibility?: Database["public"]["Enums"]["event_visibility"]
          fee_payer?: Database["public"]["Enums"]["fee_payer"]
          max_installments?: number
          allow_cancellation?: boolean
          allow_transfer?: boolean
          transfer_lock_hours?: number
          courtesy_limit?: number
          is_featured?: boolean
          suspended_reason?: string | null
          fee_pix_percent?: number
          fee_pix_min?: number
          fee_card_percent?: number
          fee_card_min?: number
          published_at?: string | null
          created_at?: string
          updated_at?: string
          original_starts_at?: string | null
          previous_starts_at?: string | null
          reschedule_count?: number
          rescheduled_at?: string | null
          reschedule_reason?: string | null
        }
        Relationships: []
      }
      event_reschedules: {
        Row: {
          id: string
          event_id: string
          old_starts_at: string | null
          old_ends_at: string | null
          new_starts_at: string | null
          new_ends_at: string | null
          reason: string | null
          changed_by: string | null
          notified_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id?: string
          old_starts_at?: string | null
          old_ends_at?: string | null
          new_starts_at?: string | null
          new_ends_at?: string | null
          reason?: string | null
          changed_by?: string | null
          notified_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          old_starts_at?: string | null
          old_ends_at?: string | null
          new_starts_at?: string | null
          new_ends_at?: string | null
          reason?: string | null
          changed_by?: string | null
          notified_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      ticket_reschedule_choices: {
        Row: {
          ticket_id: string
          event_id: string
          reschedule_id: string | null
          user_id: string | null
          choice: string
          chosen_at: string
        }
        Insert: {
          ticket_id?: string
          event_id?: string
          reschedule_id?: string | null
          user_id?: string | null
          choice?: string
          chosen_at?: string
        }
        Update: {
          ticket_id?: string
          event_id?: string
          reschedule_id?: string | null
          user_id?: string | null
          choice?: string
          chosen_at?: string
        }
        Relationships: []
      }
      home_banners: {
        Row: {
          id: string
          device: Database["public"]["Enums"]["banner_device"]
          image_url: string
          link_url: string | null
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          device?: Database["public"]["Enums"]["banner_device"]
          image_url?: string
          link_url?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          device?: Database["public"]["Enums"]["banner_device"]
          image_url?: string
          link_url?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      lots: {
        Row: {
          id: string
          ticket_type_id: string
          event_id: string
          name: string
          price: number
          quantity: number
          sold_count: number
          half_price_quota: number
          half_price_sold: number
          max_per_order: number
          sales_start_at: string | null
          sales_end_at: string | null
          advance_rule: Database["public"]["Enums"]["lot_advance_rule"]
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          ticket_type_id?: string
          event_id?: string
          name?: string
          price?: number
          quantity?: number
          sold_count?: number
          half_price_quota?: number
          half_price_sold?: number
          max_per_order?: number
          sales_start_at?: string | null
          sales_end_at?: string | null
          advance_rule?: Database["public"]["Enums"]["lot_advance_rule"]
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          ticket_type_id?: string
          event_id?: string
          name?: string
          price?: number
          quantity?: number
          sold_count?: number
          half_price_quota?: number
          half_price_sold?: number
          max_per_order?: number
          sales_start_at?: string | null
          sales_end_at?: string | null
          advance_rule?: Database["public"]["Enums"]["lot_advance_rule"]
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          code: string
          buyer_id: string
          event_id: string
          status: Database["public"]["Enums"]["order_status"]
          payment_method: Database["public"]["Enums"]["payment_method"]
          installments: number
          subtotal: number
          discount: number
          service_fee: number
          interest: number
          total: number
          coupon_id: string | null
          promoter_id: string | null
          asaas_payment_id: string | null
          paid_at: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code?: string
          buyer_id?: string
          event_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          payment_method?: Database["public"]["Enums"]["payment_method"]
          installments?: number
          subtotal?: number
          discount?: number
          service_fee?: number
          interest?: number
          total?: number
          coupon_id?: string | null
          promoter_id?: string | null
          asaas_payment_id?: string | null
          paid_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          buyer_id?: string
          event_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          payment_method?: Database["public"]["Enums"]["payment_method"]
          installments?: number
          subtotal?: number
          discount?: number
          service_fee?: number
          interest?: number
          total?: number
          coupon_id?: string | null
          promoter_id?: string | null
          asaas_payment_id?: string | null
          paid_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          id: string
          producer_id: string
          amount: number
          method: Database["public"]["Enums"]["payout_method"]
          fee: number
          status: Database["public"]["Enums"]["process_status"]
          asaas_transfer_id: string | null
          processed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          producer_id?: string
          amount?: number
          method?: Database["public"]["Enums"]["payout_method"]
          fee?: number
          status?: Database["public"]["Enums"]["process_status"]
          asaas_transfer_id?: string | null
          processed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          producer_id?: string
          amount?: number
          method?: Database["public"]["Enums"]["payout_method"]
          fee?: number
          status?: Database["public"]["Enums"]["process_status"]
          asaas_transfer_id?: string | null
          processed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          id: number
          fee_pix_percent: number
          fee_pix_min: number
          fee_card_percent: number
          fee_card_min: number
          advance_fee_percent: number
          anticipation_margin_percent: number
          retention_percent: number
          retention_days: number
          payout_business_hours: number
          pix_advance_limit_percent: number
          cancellation_fee_percent: number
          producer_terms_version: string
          genres: string[]
          cities: string[]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: number
          fee_pix_percent?: number
          fee_pix_min?: number
          fee_card_percent?: number
          fee_card_min?: number
          advance_fee_percent?: number
          anticipation_margin_percent?: number
          retention_percent?: number
          retention_days?: number
          payout_business_hours?: number
          pix_advance_limit_percent?: number
          cancellation_fee_percent?: number
          producer_terms_version?: string
          genres?: string[]
          cities?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: number
          fee_pix_percent?: number
          fee_pix_min?: number
          fee_card_percent?: number
          fee_card_min?: number
          advance_fee_percent?: number
          anticipation_margin_percent?: number
          retention_percent?: number
          retention_days?: number
          payout_business_hours?: number
          pix_advance_limit_percent?: number
          cancellation_fee_percent?: number
          producer_terms_version?: string
          genres?: string[]
          cities?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      producer_private: {
        Row: {
          producer_id: string
          person_type: Database["public"]["Enums"]["person_type"] | null
          document: string | null
          legal_name: string | null
          company_type: string | null
          responsible_name: string | null
          responsible_cpf: string | null
          responsible_birth_date: string | null
          monthly_income: number | null
          address: Json | null
          pix_key: string | null
          verification_status: Database["public"]["Enums"]["verification_status"]
          verification_notes: string | null
          verification_submitted_at: string | null
          asaas_account_id: string | null
          asaas_wallet_id: string | null
          is_blocked: boolean
          blocked_reason: string | null
          risk_flag: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          producer_id?: string
          person_type?: Database["public"]["Enums"]["person_type"] | null
          document?: string | null
          legal_name?: string | null
          company_type?: string | null
          responsible_name?: string | null
          responsible_cpf?: string | null
          responsible_birth_date?: string | null
          monthly_income?: number | null
          address?: Json | null
          pix_key?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verification_notes?: string | null
          verification_submitted_at?: string | null
          asaas_account_id?: string | null
          asaas_wallet_id?: string | null
          is_blocked?: boolean
          blocked_reason?: string | null
          risk_flag?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          producer_id?: string
          person_type?: Database["public"]["Enums"]["person_type"] | null
          document?: string | null
          legal_name?: string | null
          company_type?: string | null
          responsible_name?: string | null
          responsible_cpf?: string | null
          responsible_birth_date?: string | null
          monthly_income?: number | null
          address?: Json | null
          pix_key?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verification_notes?: string | null
          verification_submitted_at?: string | null
          asaas_account_id?: string | null
          asaas_wallet_id?: string | null
          is_blocked?: boolean
          blocked_reason?: string | null
          risk_flag?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      producer_secrets: {
        Row: {
          producer_id: string
          asaas_api_key: string | null
          created_at: string
        }
        Insert: {
          producer_id?: string
          asaas_api_key?: string | null
          created_at?: string
        }
        Update: {
          producer_id?: string
          asaas_api_key?: string | null
          created_at?: string
        }
        Relationships: []
      }
      producers: {
        Row: {
          id: string
          owner_id: string
          display_name: string
          logo_url: string | null
          instagram: string | null
          whatsapp: string | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id?: string
          display_name?: string
          logo_url?: string | null
          instagram?: string | null
          whatsapp?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          display_name?: string
          logo_url?: string | null
          instagram?: string | null
          whatsapp?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          email: string | null
          phone: string | null
          phone_verified_at: string | null
          cpf: string | null
          birth_date: string | null
          avatar_url: string | null
          notify_email: boolean
          notify_sms: boolean
          onboarding_completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name?: string | null
          email?: string | null
          phone?: string | null
          phone_verified_at?: string | null
          cpf?: string | null
          birth_date?: string | null
          avatar_url?: string | null
          notify_email?: boolean
          notify_sms?: boolean
          onboarding_completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          email?: string | null
          phone?: string | null
          phone_verified_at?: string | null
          cpf?: string | null
          birth_date?: string | null
          avatar_url?: string | null
          notify_email?: boolean
          notify_sms?: boolean
          onboarding_completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      promoters: {
        Row: {
          id: string
          event_id: string
          name: string
          whatsapp: string | null
          code: string
          commission_type: Database["public"]["Enums"]["commission_type"]
          commission_value: number
          click_count: number
          commission_paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id?: string
          name?: string
          whatsapp?: string | null
          code?: string
          commission_type?: Database["public"]["Enums"]["commission_type"]
          commission_value?: number
          click_count?: number
          commission_paid_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          name?: string
          whatsapp?: string | null
          code?: string
          commission_type?: Database["public"]["Enums"]["commission_type"]
          commission_value?: number
          click_count?: number
          commission_paid_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          id: string
          order_id: string
          ticket_id: string | null
          event_id: string
          rule: Database["public"]["Enums"]["refund_rule"]
          amount: number
          fee_retained: number
          status: Database["public"]["Enums"]["process_status"]
          reason: string | null
          requested_by: string | null
          asaas_refund_id: string | null
          processed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id?: string
          ticket_id?: string | null
          event_id?: string
          rule?: Database["public"]["Enums"]["refund_rule"]
          amount?: number
          fee_retained?: number
          status?: Database["public"]["Enums"]["process_status"]
          reason?: string | null
          requested_by?: string | null
          asaas_refund_id?: string | null
          processed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          ticket_id?: string | null
          event_id?: string
          rule?: Database["public"]["Enums"]["refund_rule"]
          amount?: number
          fee_retained?: number
          status?: Database["public"]["Enums"]["process_status"]
          reason?: string | null
          requested_by?: string | null
          asaas_refund_id?: string | null
          processed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      terms_acceptances: {
        Row: {
          id: string
          user_id: string
          document: string
          version: string
          accepted_at: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          user_id?: string
          document?: string
          version?: string
          accepted_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          document?: string
          version?: string
          accepted_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      ticket_types: {
        Row: {
          id: string
          event_id: string
          name: string
          description: string | null
          has_half_price: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          event_id?: string
          name?: string
          description?: string | null
          has_half_price?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          name?: string
          description?: string | null
          has_half_price?: boolean
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          id: string
          order_id: string
          event_id: string
          ticket_type_id: string
          lot_id: string
          holder_user_id: string | null
          holder_name: string
          holder_email: string | null
          holder_cpf: string | null
          is_half_price: boolean
          price: number
          status: Database["public"]["Enums"]["ticket_status"]
          qr_token: string
          used_at: string | null
          used_by: string | null
          transferred_from_ticket_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id?: string
          event_id?: string
          ticket_type_id?: string
          lot_id?: string
          holder_user_id?: string | null
          holder_name?: string
          holder_email?: string | null
          holder_cpf?: string | null
          is_half_price?: boolean
          price?: number
          status?: Database["public"]["Enums"]["ticket_status"]
          qr_token?: string
          used_at?: string | null
          used_by?: string | null
          transferred_from_ticket_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          event_id?: string
          ticket_type_id?: string
          lot_id?: string
          holder_user_id?: string | null
          holder_name?: string
          holder_email?: string | null
          holder_cpf?: string | null
          is_half_price?: boolean
          price?: number
          status?: Database["public"]["Enums"]["ticket_status"]
          qr_token?: string
          used_at?: string | null
          used_by?: string | null
          transferred_from_ticket_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: Database["public"]["Enums"]["app_role"]
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          id: number
          provider: string
          external_id: string | null
          event_type: string | null
          payload: Json
          processed_at: string | null
          error: string | null
          created_at: string
        }
        Insert: {
          id?: number
          provider?: string
          external_id?: string | null
          event_type?: string | null
          payload?: Json
          processed_at?: string | null
          error?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          provider?: string
          external_id?: string | null
          event_type?: string | null
          payload?: Json
          processed_at?: string | null
          error?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      become_producer: { Args: { p_display_name: string }; Returns: Json }
      choose_reschedule_option: { Args: { p_ticket_id: string, p_choice: string }; Returns: Json }
      get_reschedule_summary: { Args: { p_event_id: string }; Returns: Json }
      can_see_finance: { Args: { _user_id: string }; Returns: Json }
      checkin_ticket: { Args: { p_device_id?: string, p_event_id: string, p_qr_token: string, p_scanned_at?: string, p_was_offline?: boolean }; Returns: Json }
      get_checkin_list: { Args: { p_event_id: string }; Returns: Json }
      get_event_participants: { Args: { p_event_id: string }; Returns: Json }
      has_role: { Args: { _role: string, _user_id: string }; Returns: Json }
      is_admin: { Args: { _user_id: string }; Returns: Json }
      is_event_owner: { Args: { _event_id: string, _user_id: string }; Returns: Json }
      is_event_staff: { Args: { _event_id: string, _user_id: string }; Returns: Json }
      is_event_visible: { Args: { _event_id: string }; Returns: Json }
      is_owner: { Args: { _user_id: string }; Returns: Json }
      is_privileged: { Args: {  }; Returns: Json }
      is_valid_cpf: { Args: { p: string }; Returns: Json }
      owns_producer: { Args: { _producer_id: string, _user_id: string }; Returns: Json }
      release_lot_quantity: { Args: { p_half_qty?: number, p_lot_id: string, p_qty: number }; Returns: Json }
      reserve_lot_quantity: { Args: { p_half_qty?: number, p_lot_id: string, p_qty: number }; Returns: Json }
      rls_auto_enable: { Args: {  }; Returns: Json }
      track_promoter_click: { Args: { p_code: string, p_event_id: string }; Returns: Json }
      validate_coupon: { Args: { p_code: string, p_event_id: string }; Returns: Json }
    }
    Enums: {
      advance_type: "pix_advance" | "card_anticipation"
      app_role: "owner" | "finance" | "support" | "producer" | "staff"
      banner_device: "desktop" | "mobile"
      chargeback_status: "open" | "in_defense" | "won" | "lost"
      checkin_result: "ok" | "already_used" | "canceled" | "not_found" | "other_event"
      commission_type: "none" | "percent" | "fixed"
      discount_type: "percent" | "fixed"
      event_status: "draft" | "published" | "paused" | "ended" | "canceled" | "suspended"
      event_visibility: "public" | "private"
      fee_payer: "buyer" | "producer"
      lot_advance_rule: "sold_out" | "end_date" | "first"
      order_status: "pending" | "paid" | "expired" | "canceled" | "refunded" | "partially_refunded"
      payment_method: "pix" | "credit_card" | "free" | "courtesy"
      payout_method: "pix" | "ted"
      person_type: "pf" | "pj"
      process_status: "requested" | "processing" | "done" | "failed" | "rejected"
      refund_rule: "withdrawal_7d" | "cancellation_fee" | "event_canceled" | "event_rescheduled" | "admin"
      ticket_status: "valid" | "used" | "transferred" | "refunded" | "canceled"
      verification_status: "not_started" | "pending" | "approved" | "rejected"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"]
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T]

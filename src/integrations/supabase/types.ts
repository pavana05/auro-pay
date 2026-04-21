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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          key: string
          points: number | null
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          key: string
          points?: number | null
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          key?: string
          points?: number | null
          title?: string
        }
        Relationships: []
      }
      admin_user_notes: {
        Row: {
          admin_user_id: string
          created_at: string
          id: string
          note: string
          target_user_id: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          id?: string
          note: string
          target_user_id: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          id?: string
          note?: string
          target_user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      bill_split_members: {
        Row: {
          id: string
          is_paid: boolean | null
          paid_at: string | null
          share_amount: number
          split_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_paid?: boolean | null
          paid_at?: string | null
          share_amount?: number
          split_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_paid?: boolean | null
          paid_at?: string | null
          share_amount?: number
          split_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_split_members_split_id_fkey"
            columns: ["split_id"]
            isOneToOne: false
            referencedRelation: "bill_splits"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_splits: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string
          id: string
          status: string | null
          title: string
          total_amount: number
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          status?: string | null
          title: string
          total_amount: number
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          status?: string | null
          title?: string
          total_amount?: number
        }
        Relationships: []
      }
      budgets: {
        Row: {
          alert_threshold: number | null
          category: string
          created_at: string | null
          id: string
          month: string
          monthly_limit: number
          spent: number | null
          user_id: string
        }
        Insert: {
          alert_threshold?: number | null
          category: string
          created_at?: string | null
          id?: string
          month: string
          monthly_limit: number
          spent?: number | null
          user_id: string
        }
        Update: {
          alert_threshold?: number | null
          category?: string
          created_at?: string | null
          id?: string
          month?: string
          monthly_limit?: number
          spent?: number | null
          user_id?: string
        }
        Relationships: []
      }
      chores: {
        Row: {
          approved_at: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          is_recurring: boolean | null
          parent_id: string
          proof_image_url: string | null
          recurrence: string | null
          reward_amount: number
          status: string
          teen_id: string
          title: string
        }
        Insert: {
          approved_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_recurring?: boolean | null
          parent_id: string
          proof_image_url?: string | null
          recurrence?: string | null
          reward_amount?: number
          status?: string
          teen_id: string
          title: string
        }
        Update: {
          approved_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_recurring?: boolean | null
          parent_id?: string
          proof_image_url?: string | null
          recurrence?: string | null
          reward_amount?: number
          status?: string
          teen_id?: string
          title?: string
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      financial_lessons: {
        Row: {
          category: string
          coin_reward: number
          content_json: Json
          created_at: string
          description: string | null
          id: string
          order_index: number
          title: string
        }
        Insert: {
          category?: string
          coin_reward?: number
          content_json?: Json
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title: string
        }
        Update: {
          category?: string
          coin_reward?: number
          content_json?: Json
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title?: string
        }
        Relationships: []
      }
      flagged_transactions: {
        Row: {
          amount: number
          baseline_avg: number
          baseline_stddev: number | null
          created_at: string
          detail: string
          id: string
          multiplier: number
          reason: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          transaction_id: string
          user_id: string
          wallet_id: string
          zscore: number | null
        }
        Insert: {
          amount: number
          baseline_avg: number
          baseline_stddev?: number | null
          created_at?: string
          detail: string
          id?: string
          multiplier: number
          reason: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          transaction_id: string
          user_id: string
          wallet_id: string
          zscore?: number | null
        }
        Update: {
          amount?: number
          baseline_avg?: number
          baseline_stddev?: number | null
          created_at?: string
          detail?: string
          id?: string
          multiplier?: number
          reason?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          transaction_id?: string
          user_id?: string
          wallet_id?: string
          zscore?: number | null
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string | null
          friend_id: string
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          friend_id: string
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          friend_id?: string
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gate_analytics_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          path: string | null
          platform: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          path?: string | null
          platform?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          path?: string | null
          platform?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      health_scores: {
        Row: {
          breakdown: Json
          computed_at: string
          id: string
          level: string
          score: number
          user_id: string
        }
        Insert: {
          breakdown?: Json
          computed_at?: string
          id?: string
          level?: string
          score: number
          user_id: string
        }
        Update: {
          breakdown?: Json
          computed_at?: string
          id?: string
          level?: string
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      incidents: {
        Row: {
          affected_service: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          postmortem_url: string | null
          resolved_at: string | null
          service: string
          severity: string
          started_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          affected_service?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          postmortem_url?: string | null
          resolved_at?: string | null
          service: string
          severity?: string
          started_at?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          affected_service?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          postmortem_url?: string | null
          resolved_at?: string | null
          service?: string
          severity?: string
          started_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ios_waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      kyc_requests: {
        Row: {
          aadhaar_name: string | null
          aadhaar_number: string | null
          date_of_birth: string | null
          digio_request_id: string | null
          id: string
          status: string | null
          submitted_at: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          aadhaar_name?: string | null
          aadhaar_number?: string | null
          date_of_birth?: string | null
          digio_request_id?: string | null
          id?: string
          status?: string | null
          submitted_at?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          aadhaar_name?: string | null
          aadhaar_number?: string | null
          date_of_birth?: string | null
          digio_request_id?: string | null
          id?: string
          status?: string | null
          submitted_at?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_completions: {
        Row: {
          completed_at: string
          id: string
          lesson_id: string
          score: number
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          lesson_id: string
          score?: number
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          lesson_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_completions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "financial_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      limit_increase_requests: {
        Row: {
          created_at: string
          current_limit: number
          decided_at: string | null
          id: string
          limit_type: string
          parent_id: string
          reason: string | null
          requested_limit: number
          status: string
          teen_id: string
        }
        Insert: {
          created_at?: string
          current_limit: number
          decided_at?: string | null
          id?: string
          limit_type: string
          parent_id: string
          reason?: string | null
          requested_limit: number
          status?: string
          teen_id: string
        }
        Update: {
          created_at?: string
          current_limit?: number
          decided_at?: string | null
          id?: string
          limit_type?: string
          parent_id?: string
          reason?: string | null
          requested_limit?: number
          status?: string
          teen_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          message_type: string
          payment_amount: number | null
          payment_status: string | null
          sender_id: string
          voice_url: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          message_type?: string
          payment_amount?: number | null
          payment_status?: string | null
          sender_id: string
          voice_url?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          message_type?: string
          payment_amount?: number | null
          payment_status?: string | null
          sender_id?: string
          voice_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_read: boolean | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_actions: {
        Row: {
          action_type: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          parent_id: string
          teen_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          parent_id: string
          teen_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          parent_id?: string
          teen_id?: string
        }
        Relationships: []
      }
      parent_teen_links: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          parent_id: string
          pocket_money_amount: number | null
          pocket_money_day: number | null
          pocket_money_frequency: string | null
          teen_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          parent_id: string
          pocket_money_amount?: number | null
          pocket_money_day?: number | null
          pocket_money_frequency?: string | null
          teen_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          parent_id?: string
          pocket_money_amount?: number | null
          pocket_money_day?: number | null
          pocket_money_frequency?: string | null
          teen_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_teen_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_teen_links_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_requests: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          expires_at: string
          id: string
          note: string | null
          paid_transaction_id: string | null
          recipient_id: string
          remind_after_at: string | null
          requester_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          note?: string | null
          paid_transaction_id?: string | null
          recipient_id: string
          remind_after_at?: string | null
          requester_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          note?: string | null
          paid_transaction_id?: string | null
          recipient_id?: string
          remind_after_at?: string | null
          requester_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      pending_payment_approvals: {
        Row: {
          amount: number
          created_at: string
          decided_at: string | null
          decision_note: string | null
          expires_at: string
          favorite_id: string | null
          id: string
          note: string | null
          parent_id: string
          status: string
          teen_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          decided_at?: string | null
          decision_note?: string | null
          expires_at?: string
          favorite_id?: string | null
          id?: string
          note?: string | null
          parent_id: string
          status?: string
          teen_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          decided_at?: string | null
          decision_note?: string | null
          expires_at?: string
          favorite_id?: string | null
          id?: string
          note?: string | null
          parent_id?: string
          status?: string
          teen_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aadhaar_verified: boolean | null
          avatar_url: string | null
          blocked_at: string | null
          blocked_by: string | null
          city: string | null
          created_at: string | null
          full_name: string | null
          haptics_enabled: boolean
          id: string
          is_blocked: boolean
          is_pro: boolean
          kyc_status: string | null
          phone: string | null
          pin_hash: string | null
          pin_set_at: string | null
          role: string | null
          state_code: string | null
          state_source: string
          upi_id: string | null
        }
        Insert: {
          aadhaar_verified?: boolean | null
          avatar_url?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          city?: string | null
          created_at?: string | null
          full_name?: string | null
          haptics_enabled?: boolean
          id: string
          is_blocked?: boolean
          is_pro?: boolean
          kyc_status?: string | null
          phone?: string | null
          pin_hash?: string | null
          pin_set_at?: string | null
          role?: string | null
          state_code?: string | null
          state_source?: string
          upi_id?: string | null
        }
        Update: {
          aadhaar_verified?: boolean | null
          avatar_url?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          city?: string | null
          created_at?: string | null
          full_name?: string | null
          haptics_enabled?: boolean
          id?: string
          is_blocked?: boolean
          is_pro?: boolean
          kyc_status?: string | null
          phone?: string | null
          pin_hash?: string | null
          pin_set_at?: string | null
          role?: string | null
          state_code?: string | null
          state_source?: string
          upi_id?: string | null
        }
        Relationships: []
      }
      quick_pay_favorites: {
        Row: {
          avatar_emoji: string | null
          contact_name: string
          contact_phone: string | null
          contact_upi_id: string | null
          created_at: string | null
          id: string
          last_paid_at: string | null
          user_id: string
        }
        Insert: {
          avatar_emoji?: string | null
          contact_name: string
          contact_phone?: string | null
          contact_upi_id?: string | null
          created_at?: string | null
          id?: string
          last_paid_at?: string | null
          user_id: string
        }
        Update: {
          avatar_emoji?: string | null
          contact_name?: string
          contact_phone?: string | null
          contact_upi_id?: string | null
          created_at?: string | null
          id?: string
          last_paid_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recurring_payments: {
        Row: {
          amount: number
          created_at: string | null
          day_of_month: number | null
          day_of_week: number | null
          favorite_id: string | null
          frequency: string
          id: string
          is_active: boolean | null
          kind: string
          last_run_at: string | null
          last_status: string | null
          next_run_at: string
          note: string | null
          run_count: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          favorite_id?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          kind?: string
          last_run_at?: string | null
          last_status?: string | null
          next_run_at: string
          note?: string | null
          run_count?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          favorite_id?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          kind?: string
          last_run_at?: string | null
          last_status?: string | null
          next_run_at?: string
          note?: string | null
          run_count?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_payments_favorite_id_fkey"
            columns: ["favorite_id"]
            isOneToOne: false
            referencedRelation: "quick_pay_favorites"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string | null
          credited_at: string | null
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_amount: number | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          credited_at?: string | null
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_amount?: number | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          credited_at?: string | null
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          reward_amount?: number | null
          status?: string | null
        }
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          id: string
          redeemed_at: string
          reward_id: string
          user_id: string
        }
        Insert: {
          id?: string
          redeemed_at?: string
          reward_id: string
          user_id: string
        }
        Update: {
          id?: string
          redeemed_at?: string
          reward_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          category: string | null
          coupon_code: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          max_uses: number | null
          min_order_value: number | null
          title: string
          updated_at: string
          used_count: number | null
        }
        Insert: {
          category?: string | null
          coupon_code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          max_uses?: number | null
          min_order_value?: number | null
          title: string
          updated_at?: string
          used_count?: number | null
        }
        Update: {
          category?: string | null
          coupon_code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          max_uses?: number | null
          min_order_value?: number | null
          title?: string
          updated_at?: string
          used_count?: number | null
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          autosave_amount: number
          autosave_enabled: boolean
          autosave_frequency: string
          autosave_last_run_at: string | null
          autosave_next_run_at: string | null
          color: string | null
          created_at: string | null
          current_amount: number | null
          deadline: string | null
          icon: string | null
          id: string
          is_completed: boolean | null
          target_amount: number
          teen_id: string
          title: string
        }
        Insert: {
          autosave_amount?: number
          autosave_enabled?: boolean
          autosave_frequency?: string
          autosave_last_run_at?: string | null
          autosave_next_run_at?: string | null
          color?: string | null
          created_at?: string | null
          current_amount?: number | null
          deadline?: string | null
          icon?: string | null
          id?: string
          is_completed?: boolean | null
          target_amount: number
          teen_id: string
          title: string
        }
        Update: {
          autosave_amount?: number
          autosave_enabled?: boolean
          autosave_frequency?: string
          autosave_last_run_at?: string | null
          autosave_next_run_at?: string | null
          color?: string | null
          created_at?: string | null
          current_amount?: number | null
          deadline?: string | null
          icon?: string | null
          id?: string
          is_completed?: boolean | null
          target_amount?: number
          teen_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_goals_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scratch_cards: {
        Row: {
          created_at: string | null
          id: string
          is_scratched: boolean | null
          reward_type: string | null
          reward_value: number | null
          scratched_at: string | null
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_scratched?: boolean | null
          reward_type?: string | null
          reward_value?: number | null
          scratched_at?: string | null
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_scratched?: boolean | null
          reward_type?: string | null
          reward_value?: number | null
          scratched_at?: string | null
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      spending_limits: {
        Row: {
          category: string | null
          daily_limit: number | null
          id: string
          is_blocked: boolean | null
          set_by_parent_id: string | null
          teen_wallet_id: string
        }
        Insert: {
          category?: string | null
          daily_limit?: number | null
          id?: string
          is_blocked?: boolean | null
          set_by_parent_id?: string | null
          teen_wallet_id: string
        }
        Update: {
          category?: string | null
          daily_limit?: number | null
          id?: string
          is_blocked?: boolean | null
          set_by_parent_id?: string | null
          teen_wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spending_limits_set_by_parent_id_fkey"
            columns: ["set_by_parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spending_limits_teen_wallet_id_fkey"
            columns: ["teen_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          amount_paise: number
          created_at: string
          currency: string
          features: Json
          id: string
          interval: string
          interval_count: number
          is_active: boolean
          is_featured: boolean
          name: string
          razorpay_plan_id: string | null
          sort_order: number
          tagline: string | null
          updated_at: string
        }
        Insert: {
          amount_paise: number
          created_at?: string
          currency?: string
          features?: Json
          id: string
          interval: string
          interval_count?: number
          is_active?: boolean
          is_featured?: boolean
          name: string
          razorpay_plan_id?: string | null
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          amount_paise?: number
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          interval?: string
          interval_count?: number
          is_active?: boolean
          is_featured?: boolean
          name?: string
          razorpay_plan_id?: string | null
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string | null
          description: string
          id: string
          priority: string | null
          resolved_at: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          description: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          description?: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      teen_lookup_log: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          created_at: string | null
          id: string
          is_admin: boolean | null
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          merchant_name: string | null
          merchant_upi_id: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: string | null
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          merchant_name?: string | null
          merchant_upi_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string | null
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          merchant_name?: string | null
          merchant_upi_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string | null
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          current_streak: number | null
          id: string
          last_login_date: string | null
          longest_streak: number | null
          streak_coins: number | null
          total_logins: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_streak?: number | null
          id?: string
          last_login_date?: string | null
          longest_streak?: number | null
          streak_coins?: number | null
          total_logins?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_streak?: number | null
          id?: string
          last_login_date?: string | null
          longest_streak?: number | null
          streak_coins?: number | null
          total_logins?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          metadata: Json
          plan_id: string
          razorpay_customer_id: string | null
          razorpay_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          plan_id: string
          razorpay_customer_id?: string | null
          razorpay_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          plan_id?: string
          razorpay_customer_id?: string | null
          razorpay_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number | null
          card_atm_enabled: boolean
          card_contactless_enabled: boolean
          card_expiry_month: number | null
          card_expiry_year: number | null
          card_holder_name: string | null
          card_international_enabled: boolean
          card_issued_at: string | null
          card_number: string | null
          card_online_enabled: boolean
          created_at: string | null
          daily_limit: number | null
          id: string
          is_frozen: boolean | null
          monthly_limit: number | null
          spent_this_month: number | null
          spent_today: number | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          card_atm_enabled?: boolean
          card_contactless_enabled?: boolean
          card_expiry_month?: number | null
          card_expiry_year?: number | null
          card_holder_name?: string | null
          card_international_enabled?: boolean
          card_issued_at?: string | null
          card_number?: string | null
          card_online_enabled?: boolean
          created_at?: string | null
          daily_limit?: number | null
          id?: string
          is_frozen?: boolean | null
          monthly_limit?: number | null
          spent_this_month?: number | null
          spent_today?: number | null
          user_id: string
        }
        Update: {
          balance?: number | null
          card_atm_enabled?: boolean
          card_contactless_enabled?: boolean
          card_expiry_month?: number | null
          card_expiry_year?: number | null
          card_holder_name?: string | null
          card_international_enabled?: boolean
          card_issued_at?: string | null
          card_number?: string | null
          card_online_enabled?: boolean
          created_at?: string | null
          daily_limit?: number | null
          id?: string
          is_frozen?: boolean | null
          monthly_limit?: number | null
          spent_this_month?: number | null
          spent_today?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      zenzo_points: {
        Row: {
          created_at: string
          description: string | null
          id: string
          points: number
          transaction_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          transaction_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          transaction_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zenzo_points_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      infer_state_from_phone: { Args: { _phone: string }; Returns: string }
      is_conversation_member: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_user_blocked: { Args: { _user_id: string }; Returns: boolean }
      lookup_teen_by_phone: {
        Args: { _phone: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
        }[]
      }
      resolve_unknown_states: {
        Args: never
        Returns: {
          resolved: number
          scanned: number
        }[]
      }
      scan_transaction_anomalies: {
        Args: { _lookback_minutes?: number }
        Returns: {
          flagged_count: number
          scanned_count: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

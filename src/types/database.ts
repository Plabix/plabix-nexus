/**
 * Hand-authored equivalent of `supabase gen types typescript`, kept in sync
 * with supabase/migrations/*.sql. Regenerate with the Supabase CLI against a
 * live project once one exists, and this file becomes a drop-in replacement.
 */

export type MemberRole = "owner" | "admin" | "member";
export type DocumentStatus = "pending" | "processing" | "ready" | "failed";
export type MessageRole = "user" | "assistant";
export type SupportedFileType = "pdf" | "docx" | "txt" | "md";

export interface Citation {
  documentId: string;
  documentTitle: string;
  chunkId: string;
  chunkIndex: number;
  snippet: string;
}

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          organization_id: string;
          full_name: string | null;
          avatar_url: string | null;
          role: MemberRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: MemberRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          organization_id: string;
          uploaded_by: string;
          title: string;
          file_name: string;
          file_type: SupportedFileType;
          file_size_bytes: number;
          storage_path: string;
          status: DocumentStatus;
          error_message: string | null;
          chunk_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          uploaded_by: string;
          title: string;
          file_name: string;
          file_type: SupportedFileType;
          file_size_bytes: number;
          storage_path: string;
          status?: DocumentStatus;
          error_message?: string | null;
          chunk_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
        Relationships: [];
      };
      document_chunks: {
        Row: {
          id: string;
          document_id: string;
          organization_id: string;
          chunk_index: number;
          content: string;
          token_count: number;
          embedding: number[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          organization_id: string;
          chunk_index: number;
          content: string;
          token_count?: number;
          embedding?: number[] | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["document_chunks"]["Insert"]>;
        Relationships: [];
      };
      chat_sessions: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["chat_sessions"]["Insert"]>;
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          session_id: string;
          organization_id: string;
          role: MessageRole;
          content: string;
          citations: Citation[];
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          organization_id: string;
          role: MessageRole;
          content: string;
          citations?: Citation[];
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["chat_messages"]["Insert"]>;
        Relationships: [];
      };
      api_keys: {
        Row: {
          id: string;
          organization_id: string;
          created_by: string;
          name: string;
          key_prefix: string;
          key_hash: string;
          last_used_at: string | null;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          created_by: string;
          name: string;
          key_prefix: string;
          key_hash: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["api_keys"]["Insert"]>;
        Relationships: [];
      };
      rate_limit_events: {
        Row: {
          id: number;
          organization_id: string;
          user_id: string | null;
          route: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          organization_id: string;
          user_id?: string | null;
          route: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["rate_limit_events"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      match_document_chunks: {
        Args: {
          query_embedding: number[];
          match_organization_id: string;
          match_count?: number;
          match_document_ids?: string[] | null;
        };
        Returns: {
          id: string;
          document_id: string;
          chunk_index: number;
          content: string;
          similarity: number;
        }[];
      };
      check_rate_limit: {
        Args: {
          p_organization_id: string;
          p_user_id: string;
          p_route: string;
          p_max_events: number;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
      current_organization_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      is_org_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
  };
}

export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
export type DocumentChunk = Database["public"]["Tables"]["document_chunks"]["Row"];
export type ChatSession = Database["public"]["Tables"]["chat_sessions"]["Row"];
export type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];
export type ApiKey = Database["public"]["Tables"]["api_keys"]["Row"];

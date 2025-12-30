export type GenerationStatus = 'concluido' | 'erro' | 'processando'

export interface Generation {
  id: string
  user_id: string
  image_url?: string | null
  image_base64?: string | null
  title?: string | null
  description?: string | null
  product_name?: string | null
  features?: string | null
  category?: string | null
  status: GenerationStatus
  created_at: string
  updated_at: string
}

export interface GenerationInsert {
  user_id: string
  image_url?: string | null
  image_base64?: string | null
  title?: string | null
  description?: string | null
  product_name?: string | null
  features?: string | null
  category?: string | null
  status?: GenerationStatus
}

export interface Profile {
  id: string
  email: string
  name: string | null
  is_admin: boolean
  is_banned: boolean
  created_at: string
  updated_at: string
}

export interface ProfileWithStats extends Profile {
  total_generations?: number
}

export interface GenerationWithUser extends Generation {
  profiles?: {
    email: string
    name: string | null
  }
}


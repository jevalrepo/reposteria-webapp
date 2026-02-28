import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export type UserProfile = {
  id: string
  rol: 'cliente' | 'administrador' | 'personal'
  nombre_completo: string | null
  url_avatar: string | null
}

export type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signInWithGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

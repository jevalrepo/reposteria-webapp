import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export type UserProfile = {
  id: string
  rol: 'cliente' | 'administrador' | 'personal' | 'moderador'
  nombre_completo: string | null
  telefono: string | null
  url_avatar: string | null
}

export type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  profileLoaded: boolean
  loading: boolean
  refreshProfile: () => Promise<void>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signInWithGitHub: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

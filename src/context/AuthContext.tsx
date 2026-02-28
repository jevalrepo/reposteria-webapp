import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { AuthContext } from './auth-context'
import type { UserProfile } from './auth-context'
import { supabase } from '../lib/supabaseClient'

function readString(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function getAuthFullName(user: User) {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
  const fullName = readString(metadata.full_name) ?? readString(metadata.name)
  if (fullName) return fullName

  const givenName = readString(metadata.given_name)
  const familyName = readString(metadata.family_name)
  const composedName = [givenName, familyName].filter(Boolean).join(' ').trim()
  return composedName.length > 0 ? composedName : null
}

function getAuthAvatar(user: User) {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
  return readString(metadata.avatar_url) ?? readString(metadata.picture)
}

function getOAuthCodeFromUrl() {
  const searchParams = new URLSearchParams(window.location.search)
  const searchCode = searchParams.get('code')
  if (searchCode) return searchCode

  const hash = window.location.hash
  const queryStart = hash.indexOf('?')
  if (queryStart === -1) return null

  const hashParams = new URLSearchParams(hash.slice(queryStart + 1))
  return hashParams.get('code')
}

function getOAuthTokensFromUrl() {
  const searchParams = new URLSearchParams(window.location.search)
  const searchAccessToken = searchParams.get('access_token')
  const searchRefreshToken = searchParams.get('refresh_token')
  if (searchAccessToken && searchRefreshToken) {
    return { accessToken: searchAccessToken, refreshToken: searchRefreshToken }
  }

  const hash = window.location.hash
  const tokenHashStart = hash.indexOf('#access_token=')
  if (tokenHashStart !== -1) {
    const hashParams = new URLSearchParams(hash.slice(tokenHashStart + 1))
    const hashAccessToken = hashParams.get('access_token')
    const hashRefreshToken = hashParams.get('refresh_token')
    if (hashAccessToken && hashRefreshToken) {
      return { accessToken: hashAccessToken, refreshToken: hashRefreshToken }
    }
  }

  const queryStart = hash.indexOf('?')
  if (queryStart !== -1) {
    const hashParams = new URLSearchParams(hash.slice(queryStart + 1))
    const hashAccessToken = hashParams.get('access_token')
    const hashRefreshToken = hashParams.get('refresh_token')
    if (hashAccessToken && hashRefreshToken) {
      return { accessToken: hashAccessToken, refreshToken: hashRefreshToken }
    }
  }

  return null
}

function cleanOAuthParamsFromUrl() {
  const oauthParams = [
    'code',
    'state',
    'error',
    'error_code',
    'error_description',
    'access_token',
    'refresh_token',
    'expires_in',
    'expires_at',
    'provider_token',
    'token_type',
  ]

  const currentUrl = new URL(window.location.href)
  oauthParams.forEach((param) => currentUrl.searchParams.delete(param))

  const hash = currentUrl.hash
  const queryStart = hash.indexOf('?')
  if (queryStart !== -1) {
    const hashPath = hash.slice(0, queryStart)
    const hashParams = new URLSearchParams(hash.slice(queryStart + 1))
    oauthParams.forEach((param) => hashParams.delete(param))
    const nextHashQuery = hashParams.toString()
    currentUrl.hash = nextHashQuery ? `${hashPath}?${nextHashQuery}` : hashPath
  }

  window.history.replaceState({}, '', currentUrl.toString())
}

function wasCodeAlreadyProcessed(code: string) {
  return sessionStorage.getItem('sb_oauth_processed_code') === code
}

function markCodeAsProcessed(code: string) {
  sessionStorage.setItem('sb_oauth_processed_code', code)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function bootstrap() {
      const oauthCode = getOAuthCodeFromUrl()
      if (oauthCode && !wasCodeAlreadyProcessed(oauthCode)) {
        try {
          await supabase.auth.exchangeCodeForSession(oauthCode)
          markCodeAsProcessed(oauthCode)
        } catch {
          // Continue bootstrap; session may already be present from a prior callback run.
        } finally {
          cleanOAuthParamsFromUrl()
        }
      }

      const oauthTokens = getOAuthTokensFromUrl()
      if (oauthTokens) {
        try {
          await supabase.auth.setSession({
            access_token: oauthTokens.accessToken,
            refresh_token: oauthTokens.refreshToken,
          })
        } catch {
          // Ignore token parsing errors and continue with persisted session retrieval.
        } finally {
          cleanOAuthParamsFromUrl()
        }
      }

      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    }

    bootstrap().catch(() => {
      if (mounted) setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
      setUser(currentSession?.user ?? null)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadProfile() {
      if (!user) {
        setProfile(null)
        return
      }

      const profileSeed: { id: string; correo_electronico?: string; nombre_completo?: string; url_avatar?: string } = {
        id: user.id,
      }

      if (user.email) profileSeed.correo_electronico = user.email
      const authFullName = getAuthFullName(user)
      if (authFullName) profileSeed.nombre_completo = authFullName
      const authAvatar = getAuthAvatar(user)
      if (authAvatar) profileSeed.url_avatar = authAvatar

      await supabase.from('perfiles').upsert(profileSeed, { onConflict: 'id' })

      const { data, error } = await supabase
        .from('perfiles')
        .select('id,rol,nombre_completo,url_avatar')
        .eq('id', user.id)
        .single()

      if (!mounted) return
      if (error) {
        setProfile(null)
        return
      }

      setProfile(data as UserProfile)
    }

    loadProfile().catch(() => {
      if (mounted) setProfile(null)
    })

    return () => {
      mounted = false
    }
  }, [user])

  async function signInWithGoogle() {
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    })

    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

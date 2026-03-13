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

function getAuthAvatar(user: User) {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
  return readString(metadata.avatar_url) ?? readString(metadata.picture)
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
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(currentUser: User) {
    const { error: ensureProfileError } = await supabase.rpc('ensure_my_profile')
    if (ensureProfileError && ensureProfileError.code !== '42883') {
      // eslint-disable-next-line no-console
      console.warn('No se pudo asegurar perfil via RPC.', ensureProfileError)
    }

    const profileSeed: { correo_electronico?: string; url_avatar?: string; nombre_completo?: string } = {}

    if (currentUser.email) profileSeed.correo_electronico = currentUser.email
    const authAvatar = getAuthAvatar(currentUser)
    if (authAvatar) profileSeed.url_avatar = authAvatar
    const authFullName = getAuthFullName(currentUser)
    if (authFullName) profileSeed.nombre_completo = authFullName

    const { data: updatedRows, error: updateError } = await supabase
      .from('perfiles')
      .update(profileSeed)
      .eq('id', currentUser.id)
      .select('id')
      .limit(1)

    if (updateError) {
      // eslint-disable-next-line no-console
      console.warn('No se pudo actualizar seed de perfil.', updateError)
    }

    if (!updatedRows || updatedRows.length === 0) {
      const { error: insertError } = await supabase
        .from('perfiles')
        .insert({ id: currentUser.id, ...profileSeed })

      if (insertError && insertError.code !== '23505') {
        // eslint-disable-next-line no-console
        console.warn('No se pudo crear perfil al iniciar sesion.', insertError)
      }
    }

    const { data, error } = await supabase
      .from('perfiles')
      .select('id,rol,nombre_completo,telefono,url_avatar')
      .eq('id', currentUser.id)
      .maybeSingle()

    if (error) {
      // eslint-disable-next-line no-console
      console.warn('No se pudo leer perfil despues de login.', error)
      return null
    }
    if (!data) return null
    return data as UserProfile
  }

  async function refreshProfile() {
    if (!user) {
      setProfile(null)
      setProfileLoaded(true)
      return
    }

    setProfileLoaded(false)
    const nextProfile = await fetchProfile(user)
    setProfile(nextProfile)
    setProfileLoaded(true)
  }

  useEffect(() => {
    let mounted = true

        async function bootstrap() {
      let shouldCleanOAuthParams = false
      const oauthCode = getOAuthCodeFromUrl()
      if (oauthCode && !wasCodeAlreadyProcessed(oauthCode)) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(oauthCode)
          if (!error) {
            markCodeAsProcessed(oauthCode)
            shouldCleanOAuthParams = true
          }
        } catch {
          // Network error. Keep OAuth params so this flow can retry.
        }
      }

      const oauthTokens = getOAuthTokensFromUrl()
      if (oauthTokens) {
        try {
          await supabase.auth.setSession({
            access_token: oauthTokens.accessToken,
            refresh_token: oauthTokens.refreshToken,
          })
          shouldCleanOAuthParams = true
        } catch {
          // Keep OAuth params so this flow can retry.
        }
      }

      if (shouldCleanOAuthParams || (oauthCode && wasCodeAlreadyProcessed(oauthCode))) {
        cleanOAuthParamsFromUrl()
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
        setProfileLoaded(true)
        return
      }

      setProfileLoaded(false)
      const nextProfile = await fetchProfile(user)
      if (!mounted) return
      setProfile(nextProfile)
      setProfileLoaded(true)
    }

    loadProfile().catch(() => {
      if (mounted) {
        setProfile(null)
        setProfileLoaded(true)
      }
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

  async function signInWithGitHub() {
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo,
        scopes: 'read:user user:email',
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
        profileLoaded,
        loading,
        refreshProfile,
        signInWithGoogle,
        signInWithGitHub,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}


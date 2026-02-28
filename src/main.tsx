import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { supabase } from './lib/supabaseClient'
import './index.css'

async function bootstrapOAuthSession() {
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

  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  if (code) {
    try {
      await supabase.auth.exchangeCodeForSession(code)
    } catch {
      // AuthContext will retry by reading persisted session.
    }
  }

  const hash = window.location.hash
  const tokenHashStart = hash.indexOf('#access_token=')
  if (tokenHashStart !== -1) {
    const hashParams = new URLSearchParams(hash.slice(tokenHashStart + 1))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    if (accessToken && refreshToken) {
      try {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
      } catch {
        // Ignore and continue bootstrap.
      }
    }
  }

  oauthParams.forEach((param) => url.searchParams.delete(param))
  const hashQueryStart = url.hash.indexOf('?')
  if (hashQueryStart !== -1) {
    const hashPath = url.hash.slice(0, hashQueryStart)
    const hashParams = new URLSearchParams(url.hash.slice(hashQueryStart + 1))
    oauthParams.forEach((param) => hashParams.delete(param))
    const nextHashQuery = hashParams.toString()
    url.hash = nextHashQuery ? `${hashPath}?${nextHashQuery}` : hashPath
  }
  window.history.replaceState({}, '', url.toString())
}

void bootstrapOAuthSession().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <HashRouter>
        <AuthProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </AuthProvider>
      </HashRouter>
    </React.StrictMode>,
  )
})

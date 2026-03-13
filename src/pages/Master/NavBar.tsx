import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { useCart } from '../../context/CartContext'

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'text-teal-700' : 'text-slate-600 hover:text-teal-700'

export default function NavBar() {
  const [open, setOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [supportModalOpen, setSupportModalOpen] = useState(false)
  const [supportName, setSupportName] = useState('')
  const [supportEmail, setSupportEmail] = useState('')
  const [supportMessage, setSupportMessage] = useState('')
  const [loginStatus, setLoginStatus] = useState('')

  const cartBoxRef = useRef<HTMLDivElement | null>(null)
  const userBoxRef = useRef<HTMLDivElement | null>(null)

  const { items, totalItems, totalAmount, removeItem } = useCart()
  const { user, profile, loading, profileLoaded, signInWithGoogle, signInWithGitHub, signOut } = useAuth()


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cartBoxRef.current && !cartBoxRef.current.contains(event.target as Node)) {
        setCartOpen(false)
      }
      if (userBoxRef.current && !userBoxRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setLoginModalOpen(false)
        setSupportModalOpen(false)
        setCartOpen(false)
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  function handleSupportSubmit(event: FormEvent) {
    event.preventDefault()
    const subject = encodeURIComponent('Soporte DulceNube')
    const body = encodeURIComponent(
      `Nombre: ${supportName}\nEmail: ${supportEmail}\n\nMensaje:\n${supportMessage}`,
    )
    window.location.href = `mailto:soporte@dulcenube.com?subject=${subject}&body=${body}`
  }

  async function handleGoogleSignIn() {
    setLoginStatus('')
    const { error } = await signInWithGoogle()
    if (error) {
      setLoginStatus(error)
      return
    }
  }

  async function handleGitHubSignIn() {
    setLoginStatus('')
    const { error } = await signInWithGitHub()
    if (error) {
      setLoginStatus(error)
      return
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-teal-100 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6" aria-label="Principal">
          <NavLink to="/" className="text-xl font-black tracking-tight text-teal-700">
            DulceNube
          </NavLink>

          <ul className="hidden items-center gap-6 text-sm font-medium md:flex">
            <li>
              <NavLink to="/" className={navItemClass} end>
                Inicio
              </NavLink>
            </li>
            <li>
              <NavLink to="/categorias" className={navItemClass}>
                Productos
              </NavLink>
            </li>
          </ul>

          <div className="hidden items-center gap-3 md:flex">
            <div className="relative" ref={cartBoxRef}>
              <button
                onClick={() => setCartOpen((current) => !current)}
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-white transition hover:bg-teal-700"
                aria-label="Abrir carrito"
                aria-expanded={cartOpen}
              >
                <CartIcon className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-teal-700">
                    {totalItems}
                  </span>
                )}
              </button>

              {cartOpen && (
                <div className="absolute right-0 top-14 z-50 w-80 rounded-2xl border border-teal-100 bg-white p-4 shadow-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Carrito</h3>
                    <span className="text-xs font-semibold text-teal-700">{totalItems} prod.</span>
                  </div>

                  {items.length === 0 ? (
                    <p className="rounded-xl bg-teal-50 p-3 text-xs text-slate-600">Tu carrito esta vacio.</p>
                  ) : (
                    <ul className="max-h-64 space-y-2 overflow-auto pr-1">
                      {items.map((item) => (
                        <li key={item.id} className="flex items-center gap-2 rounded-xl border border-teal-100 p-2">
                          <img src={item.image} alt={item.name} className="h-12 w-12 rounded-lg object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-slate-900">{item.name}</p>
                            <p className="text-[11px] text-slate-500">x{item.quantity}</p>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="rounded-md px-2 py-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-50"
                          >
                            Quitar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-3 border-t border-teal-100 pt-3">
                    <p className="mb-3 flex items-center justify-between text-sm font-bold text-slate-900">
                      <span>Total</span>
                      <span>${totalAmount.toLocaleString('es-MX')}</span>
                    </p>
                    <Link
                      to="/carrito"
                      onClick={() => setCartOpen(false)}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
                    >
                      Ir al carrito
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={userBoxRef}>
              <button
                onClick={() => setUserMenuOpen((current) => !current)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-teal-200 bg-white text-teal-700 transition hover:bg-teal-50"
                aria-label="Abrir menu de usuario"
                aria-expanded={userMenuOpen}
              >
                <UserIcon className="h-5 w-5" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-14 z-50 w-64 rounded-2xl border border-teal-100 bg-white p-2 shadow-xl">
                  {loading || (user && !profileLoaded) ? (
                    <div className="px-3 py-2 text-xs text-slate-500">Cargando sesion...</div>
                  ) : !user ? (
                    <ul className="space-y-1 text-sm">
                      <li>
                        <button
                          onClick={() => {
                            setLoginModalOpen(true)
                            setUserMenuOpen(false)
                          }}
                          className="block w-full rounded-lg px-3 py-2 text-left font-medium text-slate-700 hover:bg-teal-50"
                        >
                          Iniciar sesion
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => {
                            setSupportModalOpen(true)
                            setUserMenuOpen(false)
                          }}
                          className="block w-full rounded-lg px-3 py-2 text-left font-medium text-slate-700 hover:bg-teal-50"
                        >
                          Contacto / Soporte
                        </button>
                      </li>
                    </ul>
                  ) : (
                    <>
                      <div className="px-3 py-2 text-xs text-slate-500">{profile?.nombre_completo ?? user.email ?? 'Usuario'}</div>
                      <ul className="space-y-1 text-sm">
                        <li>
                          <Link
                            to="/mi-cuenta"
                            onClick={() => setUserMenuOpen(false)}
                            className="block w-full rounded-lg px-3 py-2 text-left font-medium text-slate-700 hover:bg-teal-50"
                          >
                            Mi cuenta
                          </Link>
                        </li>
                        <li>
                          <Link
                            to="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="block w-full rounded-lg px-3 py-2 text-left font-medium text-teal-700 hover:bg-teal-50"
                          >
                            Panel de administración
                          </Link>
                        </li>
                      </ul>
                      <hr className="my-2 border-teal-100" />
                      <button
                        onClick={() => {
                          signOut().finally(() => setUserMenuOpen(false))
                        }}
                        className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-teal-700 hover:bg-teal-50"
                      >
                        Cerrar sesion
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setOpen((current) => !current)}
            className="inline-flex rounded-lg border border-teal-100 p-2 text-slate-700 md:hidden"
            aria-label="Abrir menu"
            aria-expanded={open}
          >
            <MenuIcon className="h-5 w-5" />
          </button>
        </nav>

        {open && (
          <div className="border-t border-teal-100 px-4 pb-4 pt-2 md:hidden">
            <ul className="space-y-2 text-sm font-medium text-slate-700">
              <li>
                <NavLink to="/" end onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2 hover:bg-teal-50">
                  Inicio
                </NavLink>
              </li>
              <li>
                <NavLink to="/categorias" onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2 hover:bg-teal-50">
                  Productos
                </NavLink>
              </li>
              <li>
                <NavLink to="/carrito" onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2 hover:bg-teal-50">
                  Carrito ({totalItems})
                </NavLink>
              </li>
              {loading || (user && !profileLoaded) ? (
                <li className="rounded-lg px-2 py-2 text-slate-500">Cargando sesion...</li>
              ) : !user ? (
                <li>
                  <button
                    onClick={() => {
                      setLoginModalOpen(true)
                      setOpen(false)
                    }}
                    className="block w-full rounded-lg px-2 py-2 text-left hover:bg-teal-50"
                  >
                    Iniciar sesion
                  </button>
                </li>
              ) : (
                <>
                  <li>
                    <NavLink to="/mi-cuenta" onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2 hover:bg-teal-50">
                      Mi cuenta
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/admin" onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2 hover:bg-teal-50">
                      Admin
                    </NavLink>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        signOut().finally(() => setOpen(false))
                      }}
                      className="block w-full rounded-lg px-2 py-2 text-left hover:bg-teal-50"
                    >
                      Cerrar sesion
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>
        )}
      </header>

      {loginModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Iniciar sesion</h3>
              <button onClick={() => setLoginModalOpen(false)} aria-label="Cerrar" className="text-slate-500 hover:text-slate-700">âœ•</button>
            </div>
            <p className="mb-4 text-sm text-slate-600">Elige un proveedor para iniciar sesion.</p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  handleGoogleSignIn().catch(() => setLoginStatus('No se pudo iniciar sesion con Google.'))
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <GoogleIcon className="h-4 w-4" />
                Continuar con Google
              </button>
              <button
                onClick={() => {
                  handleGitHubSignIn().catch(() => setLoginStatus('No se pudo iniciar sesion con GitHub.'))
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <GitHubIcon className="h-4 w-4" />
                Continuar con GitHub
              </button>
            </div>
            {loginStatus && <p className="mt-3 text-xs text-teal-700">{loginStatus}</p>}
          </div>
        </div>
      )}

      {supportModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Contacto / Soporte</h3>
              <button onClick={() => setSupportModalOpen(false)} aria-label="Cerrar" className="text-slate-500 hover:text-slate-700">âœ•</button>
            </div>

            <div className="mb-4 rounded-xl bg-teal-50 p-3 text-sm text-slate-700">
              <p>Email: <a href="mailto:soporte@dulcenube.com" className="font-semibold text-teal-700">soporte@dulcenube.com</a></p>
              <p className="mt-1">WhatsApp: <a href="https://wa.me/525512345678" target="_blank" rel="noreferrer" className="font-semibold text-teal-700">Abrir chat directo</a></p>
            </div>

            <form onSubmit={handleSupportSubmit} className="space-y-3">
              <input
                value={supportName}
                onChange={(event) => setSupportName(event.target.value)}
                required
                placeholder="Tu nombre"
                className="w-full rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
              />
              <input
                value={supportEmail}
                onChange={(event) => setSupportEmail(event.target.value)}
                type="email"
                required
                placeholder="Tu email"
                className="w-full rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
              />
              <textarea
                value={supportMessage}
                onChange={(event) => setSupportMessage(event.target.value)}
                required
                rows={4}
                placeholder="Escribe tu mensaje"
                className="w-full rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
              />
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              >
                Enviar email
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function MenuIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path strokeWidth="2" strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function CartIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 .001 4.001A2 2 0 0 0 17 18ZM3 4h2l3.6 7.59L7.25 14A2 2 0 0 0 9 17h9a1 1 0 1 0 0-2H9.42l1.1-2h6.96a2 2 0 0 0 1.84-1.23L21 6H6.21l-.94-2H3Z" />
    </svg>
  )
}

function UserIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-2.76-3.58-5-8-5Z" />
    </svg>
  )
}

function GitHubIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </svg>
  )
}

function GoogleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.6 2.8-4.1 2.8-7 0-.7-.1-1.5-.2-2.2H12Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.5 0 4.6-.8 6.1-2.2L15 17.4c-.9.6-2 .9-3 .9-2.3 0-4.2-1.5-4.9-3.6l-3.2 2.5A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M7.1 14.7A6 6 0 0 1 6.8 13c0-.6.1-1.2.3-1.7L3.9 8.8A10 10 0 0 0 2.8 13c0 1.6.4 3.2 1.1 4.6l3.2-2.5Z"
      />
      <path
        fill="#4285F4"
        d="M12 7.7c1.4 0 2.6.5 3.6 1.4l2.7-2.7C16.6 4.8 14.5 4 12 4a10 10 0 0 0-8.1 4.8l3.2 2.5c.7-2.1 2.6-3.6 4.9-3.6Z"
      />
    </svg>
  )
}






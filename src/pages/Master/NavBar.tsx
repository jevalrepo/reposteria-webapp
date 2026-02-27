import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'text-rose-700' : 'text-slate-600 hover:text-rose-700'

export default function NavBar() {
  const [open, setOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [supportModalOpen, setSupportModalOpen] = useState(false)
  const [supportName, setSupportName] = useState('')
  const [supportEmail, setSupportEmail] = useState('')
  const [supportMessage, setSupportMessage] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginStatus, setLoginStatus] = useState('')

  const cartBoxRef = useRef<HTMLDivElement | null>(null)
  const userBoxRef = useRef<HTMLDivElement | null>(null)

  const { items, totalItems, totalAmount, removeItem } = useCart()
  const { user, profile, signInWithMagicLink, signOut } = useAuth()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cartBoxRef.current && !cartBoxRef.current.contains(event.target as Node)) {
        setCartOpen(false)
      }
      if (userBoxRef.current && !userBoxRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSupportSubmit(event: FormEvent) {
    event.preventDefault()
    const subject = encodeURIComponent('Soporte DulceNube')
    const body = encodeURIComponent(
      `Nombre: ${supportName}\nEmail: ${supportEmail}\n\nMensaje:\n${supportMessage}`,
    )
    window.location.href = `mailto:soporte@dulcenube.com?subject=${subject}&body=${body}`
  }

  async function handleMagicLinkSignIn(event: FormEvent) {
    event.preventDefault()
    setLoginStatus('')
    const email = loginEmail.trim()
    if (!email) {
      setLoginStatus('Ingresa un email valido.')
      return
    }

    const { error } = await signInWithMagicLink(email)
    if (error) {
      setLoginStatus(error)
      return
    }

    setLoginStatus('Te enviamos un Magic Link por correo. Revisa tu bandeja.')
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-rose-100 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6" aria-label="Principal">
          <NavLink to="/" className="text-xl font-black tracking-tight text-rose-700">
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
                Categorias
              </NavLink>
            </li>
          </ul>

          <div className="hidden items-center gap-3 md:flex">
            <div className="relative" ref={cartBoxRef}>
              <button
                onClick={() => setCartOpen((current) => !current)}
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl bg-rose-600 text-white transition hover:bg-rose-700"
                aria-label="Abrir carrito"
                aria-expanded={cartOpen}
              >
                <CartIcon className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-rose-700">
                    {totalItems}
                  </span>
                )}
              </button>

              {cartOpen && (
                <div className="absolute right-0 top-14 z-50 w-80 rounded-2xl border border-rose-100 bg-white p-4 shadow-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Carrito</h3>
                    <span className="text-xs font-semibold text-rose-700">{totalItems} prod.</span>
                  </div>

                  {items.length === 0 ? (
                    <p className="rounded-xl bg-rose-50 p-3 text-xs text-slate-600">Tu carrito esta vacio.</p>
                  ) : (
                    <ul className="max-h-64 space-y-2 overflow-auto pr-1">
                      {items.map((item) => (
                        <li key={item.id} className="flex items-center gap-2 rounded-xl border border-rose-100 p-2">
                          <img src={item.image} alt={item.name} className="h-12 w-12 rounded-lg object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-slate-900">{item.name}</p>
                            <p className="text-[11px] text-slate-500">x{item.quantity}</p>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="rounded-md px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                          >
                            Quitar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-3 border-t border-rose-100 pt-3">
                    <p className="mb-3 flex items-center justify-between text-sm font-bold text-slate-900">
                      <span>Total</span>
                      <span>${totalAmount.toLocaleString('es-MX')}</span>
                    </p>
                    <Link
                      to="/carrito"
                      onClick={() => setCartOpen(false)}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800"
                    >
                      Ir a pagar
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={userBoxRef}>
              <button
                onClick={() => setUserMenuOpen((current) => !current)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-700 transition hover:bg-rose-50"
                aria-label="Abrir menu de usuario"
                aria-expanded={userMenuOpen}
              >
                <UserIcon className="h-5 w-5" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-14 z-50 w-64 rounded-2xl border border-rose-100 bg-white p-2 shadow-xl">
                  {!user ? (
                    <ul className="space-y-1 text-sm">
                      <li>
                        <button
                          onClick={() => {
                            setLoginModalOpen(true)
                            setUserMenuOpen(false)
                          }}
                          className="block w-full rounded-lg px-3 py-2 text-left font-medium text-slate-700 hover:bg-rose-50"
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
                          className="block w-full rounded-lg px-3 py-2 text-left font-medium text-slate-700 hover:bg-rose-50"
                        >
                          Contacto / Soporte
                        </button>
                      </li>
                    </ul>
                  ) : (
                    <>
                      <div className="px-3 py-2 text-xs text-slate-500">{profile?.full_name ?? user.email ?? 'Usuario'}</div>
                      <ul className="space-y-1 text-sm">
                        <li>
                          <Link
                            to="/mi-cuenta"
                            onClick={() => setUserMenuOpen(false)}
                            className="block w-full rounded-lg px-3 py-2 text-left font-medium text-slate-700 hover:bg-rose-50"
                          >
                            Mi cuenta
                          </Link>
                        </li>
                      </ul>
                      <hr className="my-2 border-rose-100" />
                      <button
                        onClick={() => {
                          signOut().finally(() => setUserMenuOpen(false))
                        }}
                        className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-700 hover:bg-rose-50"
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
            className="inline-flex rounded-lg border border-rose-100 p-2 text-slate-700 md:hidden"
            aria-label="Abrir menu"
            aria-expanded={open}
          >
            <MenuIcon className="h-5 w-5" />
          </button>
        </nav>

        {open && (
          <div className="border-t border-rose-100 px-4 pb-4 pt-2 md:hidden">
            <ul className="space-y-2 text-sm font-medium text-slate-700">
              <li>
                <NavLink to="/" end onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2 hover:bg-rose-50">
                  Inicio
                </NavLink>
              </li>
              <li>
                <NavLink to="/categorias" onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2 hover:bg-rose-50">
                  Categorias
                </NavLink>
              </li>
              <li>
                <NavLink to="/carrito" onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2 hover:bg-rose-50">
                  Carrito ({totalItems})
                </NavLink>
              </li>
              {!user ? (
                <li>
                  <button
                    onClick={() => {
                      setLoginModalOpen(true)
                      setOpen(false)
                    }}
                    className="block w-full rounded-lg px-2 py-2 text-left hover:bg-rose-50"
                  >
                    Iniciar sesion
                  </button>
                </li>
              ) : (
                <li>
                  <button
                    onClick={() => {
                      signOut().finally(() => setOpen(false))
                    }}
                    className="block w-full rounded-lg px-2 py-2 text-left hover:bg-rose-50"
                  >
                    Cerrar sesion
                  </button>
                </li>
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
              <button onClick={() => setLoginModalOpen(false)} className="text-slate-500 hover:text-slate-700">X</button>
            </div>
            <p className="mb-4 text-sm text-slate-600">Ingresa tu email y te enviaremos un Magic Link.</p>
            <form onSubmit={handleMagicLinkSignIn} className="space-y-3">
              <input
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                type="email"
                required
                placeholder="tu@email.com"
                className="w-full rounded-xl border border-rose-100 px-3 py-2 text-sm outline-none ring-rose-300 focus:ring"
              />
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
              >
                Enviar Magic Link
              </button>
            </form>
            {loginStatus && <p className="mt-3 text-xs text-rose-700">{loginStatus}</p>}
          </div>
        </div>
      )}

      {supportModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Contacto / Soporte</h3>
              <button onClick={() => setSupportModalOpen(false)} className="text-slate-500 hover:text-slate-700">X</button>
            </div>

            <div className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-slate-700">
              <p>Email: <a href="mailto:soporte@dulcenube.com" className="font-semibold text-rose-700">soporte@dulcenube.com</a></p>
              <p className="mt-1">WhatsApp: <a href="https://wa.me/525512345678" target="_blank" rel="noreferrer" className="font-semibold text-rose-700">Abrir chat directo</a></p>
            </div>

            <form onSubmit={handleSupportSubmit} className="space-y-3">
              <input
                value={supportName}
                onChange={(event) => setSupportName(event.target.value)}
                required
                placeholder="Tu nombre"
                className="w-full rounded-xl border border-rose-100 px-3 py-2 text-sm outline-none ring-rose-300 focus:ring"
              />
              <input
                value={supportEmail}
                onChange={(event) => setSupportEmail(event.target.value)}
                type="email"
                required
                placeholder="Tu email"
                className="w-full rounded-xl border border-rose-100 px-3 py-2 text-sm outline-none ring-rose-300 focus:ring"
              />
              <textarea
                value={supportMessage}
                onChange={(event) => setSupportMessage(event.target.value)}
                required
                rows={4}
                placeholder="Escribe tu mensaje"
                className="w-full rounded-xl border border-rose-100 px-3 py-2 text-sm outline-none ring-rose-300 focus:ring"
              />
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
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

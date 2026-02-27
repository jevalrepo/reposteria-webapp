import { useState } from 'react'

export default function TopNav() {
  const [active, setActive] = useState('Dashboard')
  const [open, setOpen] = useState(false)
  const menus = ['Categorías', 'Ofertas', 'Novedades', 'Nosotros', 'Ayuda']

  return (
    <div className="w-full bg-slate-100 py-3">
      <div className="mx-auto max-w-screen-2xl rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* ¡IMPORTANTE!: nav relativo para anclar el dropdown móvil */}

        <nav className="relative flex items-center justify-between px-4 py-3 md:px-6 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <a href="#" className="group inline-flex items-center gap-2" aria-label="Inicio">
              <LeafIcon className="h-7 w-7 text-emerald-600 transition-transform group-hover:-rotate-6" />
              <span className="text-lg font-semibold tracking-tight text-emerald-600">
                VerdeVivo
              </span>
            </a>
          </div>

          {/* Menú centrado (desktop) */}
          <ul className="hidden md:flex md:justify-self-center items-center gap-8">
            {menus.map((label) => (
              <li key={label} className="relative">
                <button
                  onClick={() => setActive(label)}
                  className={`text-base font-medium transition-colors ${
                    active === label ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {label}
                </button>
                {active === label && (
                  <span className="absolute -bottom-3 left-0 h-[3px] w-full rounded-full bg-indigo-500" />
                )}
              </li>
            ))}
          </ul>

          {/* Acciones derecha (desktop) */}
          <div className="hidden md:flex justify-self-end items-center gap-3">
            <a
              href="#carrito"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <CartIcon className="h-4 w-4 text-slate-600" />
              Carrito
            </a>
            <button
              className="ml-1 inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ring-1 ring-slate-200"
              aria-label="Cuenta"
              title="Cuenta"
            >
              <img
                src="https://i.pravatar.cc/100?img=12"
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            </button>
          </div>

          {/* Botón mobile (alineado a la derecha en el banner) */}
          <div className="ml-auto flex items-center gap-2 md:hidden">
            <button
              onClick={() => setOpen((v) => !v)}
              className="md:hidden inline-flex items-center rounded-md p-2 text-slate-700 ring-1 ring-slate-200"
              aria-expanded={open}
              aria-label="Abrir menú"
            >
              <BurgerIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Panel mobile dentro del banner (dropdown anclado) */}
          {open && (
            <>
              {/* Backdrop para cerrar al pulsar fuera */}
              <button
                className="fixed inset-0 z-40 md:hidden"
                aria-label="Cerrar menú"
                onClick={() => setOpen(false)}
              />
              <div
                className="absolute right-3 top-3 z-50 w-64 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-lg md:hidden"
                role="menu"
                aria-label="Menú móvil"
              >
                <ul className="grid gap-1">
                  {menus.map((m) => (
                    <li key={m}>
                      <a
                        href="#"
                        onClick={() => {
                          setActive(m)
                          setOpen(false)
                        }}
                        className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
                          active === m
                            ? 'bg-slate-100 text-slate-900'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                        role="menuitem"
                      >
                        {m}
                      </a>
                    </li>
                  ))}
                </ul>

                <div className="mt-2 flex gap-2">
                  <a
                    href="#carrito"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm"
                  >
                    <CartIcon className="h-4 w-4 text-slate-600" />
                    Carrito
                  </a>
                  <button className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full ring-1 ring-slate-200">
                    <img
                      src="https://i.pravatar.cc/100?img=12"
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  </button>
                </div>
              </div>
            </>
          )}
        </nav>
      </div>
    </div>
  )
}

/* ========= Iconos ========= */
function LeafIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 3c-5.5.4-9.1 2.2-11.6 4.7C6 11 5.3 15 6.5 17.8c.2.5.8.6 1.2.3 2.3-1.7 4.4-3 7-3.6-1.2 1.5-2.3 2.7-4.3 4.2-.5.4-.3 1.2.3 1.3C16.9 21.9 22 18.5 22 10.5V4a1 1 0 0 0-1-1Z" />
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
function BurgerIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      stroke="currentColor"
      fill="none"
      aria-hidden="true"
    >
      <path strokeWidth="2" strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

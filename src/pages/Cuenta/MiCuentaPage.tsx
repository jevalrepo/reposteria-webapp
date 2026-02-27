import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function MiCuentaPage() {
  const { user, profile } = useAuth()

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 md:px-6">
        <div className="rounded-2xl border border-rose-100 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-slate-900">Mi cuenta</h1>
          <p className="mt-3 text-sm text-slate-600">Necesitas iniciar sesion para ver esta seccion.</p>
          <Link to="/" className="mt-5 inline-flex rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white">
            Volver al inicio
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 md:px-6">
      <div className="mb-8 rounded-3xl border border-rose-100 bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Mi cuenta</h1>
        <p className="mt-2 text-sm text-slate-600">
          {profile?.full_name ?? user.email ?? 'Usuario'}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Mi cuenta</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>Mi perfil</li>
            <li>Mis direcciones</li>
            <li>Metodos de pago</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Mis pedidos</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>Pedidos actuales</li>
            <li>Historial de pedidos</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm md:col-span-2">
          <h2 className="text-lg font-bold text-slate-900">Cupones / Puntos</h2>
          <p className="mt-3 text-sm text-slate-700">Proximamente podras ver y canjear tus beneficios aqui.</p>
        </section>
      </div>
    </main>
  )
}

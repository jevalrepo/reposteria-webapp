import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCatalog } from '../../hooks/useCatalog'
import FrontImage from '../Home/FrontImage'

const whatsappMessage = encodeURIComponent('Hola, quiero hacer un pedido en DulceNube')
const whatsappUrl = `https://wa.me/525512345678?text=${whatsappMessage}`

function formatPrice(amount: number, locale: string, currency: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function InicioPage() {
  const { catalog, loading } = useCatalog()

  const featuredProducts = useMemo(() => {
    if (!catalog) return []
    return catalog.products.filter((product) => product.featured).slice(0, 4)
  }, [catalog])

  const seasonProducts = useMemo(() => {
    if (!catalog) return []
    return catalog.products
      .filter((product) => product.categoryId === 'cat-temporada' || product.subcategoryId === 'sub-ediciones-limitadas')
      .slice(0, 4)
  }, [catalog])

  return (
    <main>
      <FrontImage onCtaClick={() => window.open(whatsappUrl, '_blank')} />

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <div className="mb-6 flex items-end justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Productos estrella</h2>
          <a href={whatsappUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-rose-700 hover:text-rose-800">
            Ordenar ahora
          </a>
        </div>

        {loading || !catalog ? (
          <p className="text-sm text-slate-600">Cargando productos...</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <article key={product.id} className="overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-sm">
                <img src={product.images[0]} alt={product.name} className="h-44 w-full object-cover" />
                <div className="p-4">
                  <h3 className="font-semibold">{product.name}</h3>
                  <p className="mt-2 text-lg font-bold text-rose-700">
                    {formatPrice(product.price, catalog.store.locale, catalog.store.currency)}
                  </p>
                  <Link to={`/producto/${product.id}`} className="mt-3 inline-flex text-sm font-semibold text-rose-700 hover:text-rose-800">
                    Ver detalle
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 md:px-6">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Temporada y edicion limitada</h2>
        {loading || !catalog ? (
          <p className="mt-4 text-sm text-slate-600">Cargando temporada...</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {seasonProducts.map((product) => (
              <article key={product.id} className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-rose-700">{product.name}</p>
                <p className="mt-2 text-xs text-slate-500">Entrega en {product.prepHours} hrs</p>
                <Link to={`/producto/${product.id}`} className="mt-3 inline-flex text-xs font-semibold text-rose-700 hover:text-rose-800">
                  Ver detalle
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 md:px-6">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Testimonios</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <blockquote className="rounded-2xl border border-rose-100 bg-white p-5 text-sm text-slate-700 shadow-sm">
            "Pedi para un cumpleanos y llego perfecto, sabor increible."<br />
            <span className="mt-2 block font-semibold text-slate-900">- Andrea R.</span>
          </blockquote>
          <blockquote className="rounded-2xl border border-rose-100 bg-white p-5 text-sm text-slate-700 shadow-sm">
            "El pastel de boda quedo exactamente como lo queriamos."<br />
            <span className="mt-2 block font-semibold text-slate-900">- Mario y Luisa</span>
          </blockquote>
          <blockquote className="rounded-2xl border border-rose-100 bg-white p-5 text-sm text-slate-700 shadow-sm">
            "Rapidos para responder por WhatsApp y todo super fresco."<br />
            <span className="mt-2 block font-semibold text-slate-900">- Carla M.</span>
          </blockquote>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-100/60 p-6 text-center">
          <h2 className="text-2xl font-bold text-rose-800">Listo para pedir?</h2>
          <p className="mt-2 text-sm text-rose-900/80">Atencion rapida y pedido directo por WhatsApp.</p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex rounded-2xl bg-rose-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-rose-800"
          >
            Ir a WhatsApp / Pedido
          </a>
        </div>
      </section>
    </main>
  )
}

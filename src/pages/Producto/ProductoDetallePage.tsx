import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useCatalog } from '../../hooks/useCatalog'

function formatPrice(amount: number, locale: string, currency: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function ProductoDetallePage() {
  const { id } = useParams()
  const { catalog, loading } = useCatalog()
  const { addItem } = useCart()

  const [quantity, setQuantity] = useState(1)
  const [dedication, setDedication] = useState('')

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <p className="text-sm text-slate-600">Cargando detalle del producto...</p>
      </main>
    )
  }

  if (!catalog) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <p className="text-sm text-slate-600">No se pudo cargar el catalogo.</p>
      </main>
    )
  }

  const product = catalog.products.find((item) => item.id === id)

  if (!product) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <h1 className="text-2xl font-black text-slate-900">Producto no encontrado</h1>
        <p className="mt-2 text-sm text-slate-600">El producto que buscas no existe o fue removido.</p>
        <Link to="/categorias" className="mt-5 inline-flex rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white">
          Volver a categorias
        </Link>
      </main>
    )
  }

  const category = catalog.categories.find((entry) => entry.id === product.categoryId)
  const subcategory = category?.subcategories.find((entry) => entry.id === product.subcategoryId)

  const relatedProducts = catalog.products
    .filter((item) => item.categoryId === product.categoryId && item.id !== product.id)
    .slice(0, 4)

  const unitPrice = product.price
  const totalPrice = unitPrice * quantity

  const dedicationText = dedication.trim() ? `Dedicatoria: ${dedication.trim()}` : 'Dedicatoria: sin dedicatoria'
  const whatsappText = encodeURIComponent(
    [
      'Hola, quiero hacer este pedido:',
      `Producto: ${product.name}`,
      `SKU: ${product.sku}`,
      `Cantidad: ${quantity}`,
      dedicationText,
      `Total estimado: ${formatPrice(totalPrice, catalog.store.locale, catalog.store.currency)}`,
    ].join('\n'),
  )
  const whatsappUrl = `https://wa.me/525512345678?text=${whatsappText}`

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      image: product.images[0],
      unitPrice: product.price,
      quantity,
      dedication,
    })
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <Link to="/categorias" className="text-sm font-semibold text-rose-700 hover:text-rose-800">
        ← Volver a categorias
      </Link>

      <section className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm">
          <img src={product.images[0]} alt={product.name} className="h-[420px] w-full object-cover" />
        </div>

        <article className="rounded-3xl border border-rose-100 bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
            {category?.emoji} {category?.name} · {subcategory?.name}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">{product.name}</h1>
          <p className="mt-3 text-sm text-slate-600">{product.description}</p>

          <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1">SKU: {product.sku}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">Porciones: {product.portions}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">Entrega: {product.prepHours} hrs</span>
            {product.dietary.map((diet) => (
              <span key={diet} className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                {diet}
              </span>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">Personaliza tu pedido</h2>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cantidad</p>
              <div className="mt-2 inline-flex items-center rounded-xl border border-rose-100 bg-white">
                <button
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  className="px-3 py-2 text-sm font-bold text-slate-700 hover:bg-rose-50"
                >
                  -
                </button>
                <span className="min-w-10 px-2 text-center text-sm font-semibold text-slate-900">{quantity}</span>
                <button
                  onClick={() => setQuantity((current) => Math.min(20, current + 1))}
                  className="px-3 py-2 text-sm font-bold text-slate-700 hover:bg-rose-50"
                >
                  +
                </button>
              </div>
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dedicatoria (opcional)</span>
              <textarea
                value={dedication}
                onChange={(event) => setDedication(event.target.value.slice(0, 120))}
                rows={3}
                placeholder="Ejemplo: Feliz cumple, Maria"
                className="mt-2 w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm outline-none ring-rose-300 transition focus:ring"
              />
              <span className="mt-1 block text-right text-[11px] text-slate-500">{dedication.length}/120</span>
            </label>
          </div>

          <div className="mt-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Precio unitario</p>
              <p className="text-xl font-black text-slate-900">
                {formatPrice(unitPrice, catalog.store.locale, catalog.store.currency)}
              </p>
              <p className="text-xs text-slate-500">Total: {formatPrice(totalPrice, catalog.store.locale, catalog.store.currency)}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800"
            >
              Pedir por WhatsApp
            </a>
            <button
              onClick={handleAddToCart}
              className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
            >
              Agregar al carrito
            </button>
          </div>
        </article>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Tambien te puede interesar</h2>

        {relatedProducts.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No hay productos relacionados disponibles.</p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-sm">
                <img src={item.images[0]} alt={item.name} className="h-36 w-full object-cover" />
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-slate-900">{item.name}</h3>
                  <p className="mt-2 text-sm font-bold text-rose-700">
                    {formatPrice(item.price, catalog.store.locale, catalog.store.currency)}
                  </p>
                  <Link to={`/producto/${item.id}`} className="mt-3 inline-flex text-xs font-semibold text-rose-700 hover:text-rose-800">
                    Ver detalle
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

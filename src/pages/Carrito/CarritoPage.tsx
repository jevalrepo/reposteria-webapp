import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { supabase } from '../../lib/supabaseClient'
import { useCatalog } from '../../hooks/useCatalog'

function formatPrice(amount: number, locale: string, currency: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function CarritoPage() {
  const { catalog } = useCatalog()
  const { user } = useAuth()
  const { items, totalAmount, totalItems, removeItem, setItemQuantity, clearCart } = useCart()

  const locale = catalog?.store.locale ?? 'es-MX'
  const currency = catalog?.store.currency ?? 'MXN'

  const whatsappText = encodeURIComponent(
    [
      'Hola, quiero confirmar este pedido:',
      ...items.map(
        (item, index) =>
          `${index + 1}. ${item.name} x${item.quantity} - ${formatPrice(item.unitPrice * item.quantity, locale, currency)}${
            item.dedication ? ` (Dedicatoria: ${item.dedication})` : ''
          }`,
      ),
      `Total: ${formatPrice(totalAmount, locale, currency)}`,
    ].join('\n'),
  )

  const whatsappUrl = `https://wa.me/525512345678?text=${whatsappText}`

  async function handleCreateOrder() {
    if (!user) {
      alert('Inicia sesion desde el icono de usuario (Magic Link por email) para crear tu pedido.')
      return
    }

    if (items.length === 0) return

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        status: 'pending',
        total_amount: totalAmount,
      })
      .select('id')
      .single()

    if (orderError || !order) {
      alert('No se pudo crear el pedido en Supabase.')
      return
    }

    const rows = items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.name,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      dedication: item.dedication ?? null,
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(rows)

    if (itemsError) {
      alert('El pedido se creo, pero fallo al guardar los items.')
      return
    }

    clearCart()
    alert(`Pedido creado con exito. ID: ${order.id}`)
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Carrito de compras</h1>
        <span className="rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-700">
          {totalItems} productos
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-rose-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-600">Tu carrito esta vacio.</p>
          <Link to="/categorias" className="mt-4 inline-flex rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white">
            Explorar productos
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="space-y-4">
            {items.map((item) => (
              <article key={item.id} className="grid gap-4 rounded-2xl border border-rose-100 bg-white p-4 shadow-sm sm:grid-cols-[110px_1fr]">
                <img src={item.image} alt={item.name} className="h-28 w-full rounded-xl object-cover" />
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="font-semibold text-slate-900">{item.name}</h2>
                    <button onClick={() => removeItem(item.id)} className="text-xs font-semibold text-rose-700 hover:text-rose-800">
                      Eliminar
                    </button>
                  </div>

                  {item.dedication && (
                    <p className="mt-1 text-xs text-slate-500">Dedicatoria: {item.dedication}</p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center rounded-xl border border-rose-100 bg-white">
                      <button
                        onClick={() => setItemQuantity(item.id, item.quantity - 1)}
                        className="px-3 py-2 text-sm font-bold text-slate-700 hover:bg-rose-50"
                      >
                        -
                      </button>
                      <span className="min-w-10 px-2 text-center text-sm font-semibold text-slate-900">{item.quantity}</span>
                      <button
                        onClick={() => setItemQuantity(item.id, item.quantity + 1)}
                        className="px-3 py-2 text-sm font-bold text-slate-700 hover:bg-rose-50"
                      >
                        +
                      </button>
                    </div>

                    <p className="text-lg font-black text-rose-700">
                      {formatPrice(item.unitPrice * item.quantity, locale, currency)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <aside className="h-fit rounded-3xl border border-rose-100 bg-white p-5 shadow-sm lg:sticky lg:top-24">
            <h2 className="text-lg font-bold text-slate-900">Resumen</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p className="flex items-center justify-between">
                <span>Productos</span>
                <span>{totalItems}</span>
              </p>
              <p className="flex items-center justify-between text-base font-black text-slate-900">
                <span>Total</span>
                <span>{formatPrice(totalAmount, locale, currency)}</span>
              </p>
            </div>

            <button
              onClick={handleCreateOrder}
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800"
            >
              {user ? 'Crear pedido en Supabase' : 'Entrar con Google para pedir'}
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
            >
              Finalizar por WhatsApp
            </a>

            <button
              onClick={clearCart}
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
            >
              Vaciar carrito
            </button>
          </aside>
        </div>
      )}
    </main>
  )
}

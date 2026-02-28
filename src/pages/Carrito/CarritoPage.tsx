import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
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

function sanitizeNombreInput(value: string) {
  return value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g, '').replace(/\s{2,}/g, ' ')
}

function sanitizeTelefonoInput(value: string) {
  return value.replace(/\D/g, '').slice(0, 10)
}

function isCorreoValido(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
}

export default function CarritoPage() {
  const { catalog } = useCatalog()
  const { user } = useAuth()
  const { items, totalAmount, totalItems, removeItem, setItemQuantity, clearCart } = useCart()

  const [tipoEntrega, setTipoEntrega] = useState<'recoger_en_tienda' | 'envio_a_domicilio'>('recoger_en_tienda')
  const [direccionEnvio, setDireccionEnvio] = useState('')
  const [nombreInvitado, setNombreInvitado] = useState('')
  const [telefonoInvitado, setTelefonoInvitado] = useState('')
  const [correoInvitado, setCorreoInvitado] = useState('')
  const [direccionesUsuario, setDireccionesUsuario] = useState<Array<{ id: string; etiqueta: string; calle_numero: string; ciudad: string; estado: string; codigo_postal: string; es_predeterminada: boolean }>>([])
  const [direccionesCargando, setDireccionesCargando] = useState(false)
  const [direccionSeleccionadaId, setDireccionSeleccionadaId] = useState<string>('manual')

  const locale = catalog?.store.locale ?? 'es-MX'
  const currency = catalog?.store.currency ?? 'MXN'
  const usaDireccionGuardada = user && tipoEntrega === 'envio_a_domicilio' && direccionSeleccionadaId !== 'manual'

  useEffect(() => {
    if (!user) return
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
    const fullName =
      (typeof metadata.full_name === 'string' && metadata.full_name.trim()) ||
      (typeof metadata.name === 'string' && metadata.name.trim()) ||
      ''
    if (!nombreInvitado.trim() && fullName) {
      setNombreInvitado(sanitizeNombreInput(fullName))
    }
    if (!correoInvitado.trim() && user.email) {
      setCorreoInvitado(user.email)
    }
  }, [correoInvitado, nombreInvitado, user])

  useEffect(() => {
    if (!user) {
      setDireccionesUsuario([])
      setDireccionSeleccionadaId('manual')
      return
    }

    const loadDirecciones = async () => {
      setDireccionesCargando(true)
      const { data } = await supabase
        .from('direcciones_clientes')
        .select('id,etiqueta,calle_numero,ciudad,estado,codigo_postal,es_predeterminada')
        .eq('usuario_id', user.id)
        .order('es_predeterminada', { ascending: false })
        .order('creado_en', { ascending: false })

      const rows = (data ?? []) as Array<{
        id: string
        etiqueta: string
        calle_numero: string
        ciudad: string
        estado: string
        codigo_postal: string
        es_predeterminada: boolean
      }>

      setDireccionesUsuario(rows)
      if (rows.length > 0) {
        setDireccionSeleccionadaId(rows[0].id)
      } else {
        setDireccionSeleccionadaId('manual')
      }
      setDireccionesCargando(false)
    }

    void loadDirecciones()
  }, [user])

  const direccionGuardadaTexto = useMemo(() => {
    if (!user || direccionSeleccionadaId === 'manual') return null
    const selected = direccionesUsuario.find((item) => item.id === direccionSeleccionadaId)
    if (!selected) return null
    return `${selected.calle_numero}, ${selected.ciudad}, ${selected.estado}, ${selected.codigo_postal}`
  }, [direccionSeleccionadaId, direccionesUsuario, user])

  function validarCamposObligatorios() {
    if (!nombreInvitado.trim()) return 'Ingresa el nombre completo.'
    if (sanitizeNombreInput(nombreInvitado).trim().length < 2) return 'El nombre solo debe contener letras.'
    if (!telefonoInvitado.trim()) return 'Ingresa el telefono.'
    if (telefonoInvitado.trim().length !== 10) return 'El telefono debe tener exactamente 10 digitos.'
    if (!correoInvitado.trim()) return 'Ingresa el correo.'
    if (!isCorreoValido(correoInvitado.trim())) return 'Ingresa un correo valido.'
    if (tipoEntrega === 'envio_a_domicilio' && !usaDireccionGuardada && direccionEnvio.trim().length === 0) {
      return 'Si eliges A domicilio debes ingresar una direccion de entrega.'
    }
    return null
  }

  const whatsappText = encodeURIComponent(
    [
      'Hola, quiero confirmar este pedido:',
      ...items.map(
        (item, index) =>
          `${index + 1}. ${item.name} x${item.quantity} - ${formatPrice(item.unitPrice * item.quantity, locale, currency)}${
            item.dedication ? ` (Dedicatoria: ${item.dedication})` : ''
          }`,
      ),
      `Tipo de entrega: ${tipoEntrega === 'envio_a_domicilio' ? 'A domicilio' : 'Recoger en tienda'}`,
      ...(tipoEntrega === 'envio_a_domicilio' && usaDireccionGuardada && direccionGuardadaTexto ? [`Direccion: ${direccionGuardadaTexto}`] : []),
      ...(tipoEntrega === 'envio_a_domicilio' && !usaDireccionGuardada && direccionEnvio.trim().length > 0
        ? [`Direccion: ${direccionEnvio.trim()}`]
        : []),
      ...(nombreInvitado.trim().length > 0 ? [`Nombre: ${nombreInvitado.trim()}`] : []),
      ...(telefonoInvitado.trim().length > 0 ? [`Telefono: ${telefonoInvitado.trim()}`] : []),
      ...(correoInvitado.trim().length > 0 ? [`Correo: ${correoInvitado.trim()}`] : []),
      `Total: ${formatPrice(totalAmount, locale, currency)}`,
    ].join('\n'),
  )

  const whatsappUrl = `https://wa.me/525512345678?text=${whatsappText}`

  function handleFinalizeWhatsApp() {
    if (items.length === 0) return
    const error = validarCamposObligatorios()
    if (error) {
      alert(error)
      return
    }
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
  }

  async function handleCreateOrder() {
    if (items.length === 0) return
    const errorCampos = validarCamposObligatorios()
    if (errorCampos) {
      alert(errorCampos)
      return
    }

    const orderId = crypto.randomUUID()

    const payloadPedido: {
      id: string
      usuario_id?: string
      nombre_invitado?: string
      telefono_invitado?: string
      correo_invitado?: string
      estado: string
      tipo_entrega: 'recoger_en_tienda' | 'envio_a_domicilio'
      direccion_cliente_id: string | null
      direccion_envio_texto: string | null
      subtotal: number
      costo_envio: number
      total: number
    } = {
      id: orderId,
      estado: 'pendiente',
      tipo_entrega: tipoEntrega,
      direccion_cliente_id: usaDireccionGuardada ? direccionSeleccionadaId : null,
      direccion_envio_texto: tipoEntrega === 'envio_a_domicilio' && !usaDireccionGuardada ? direccionEnvio.trim() : null,
      subtotal: totalAmount,
      costo_envio: 0,
      total: totalAmount,
    }

    if (user) {
      payloadPedido.usuario_id = user.id
    }
    payloadPedido.nombre_invitado = nombreInvitado.trim()
    payloadPedido.telefono_invitado = telefonoInvitado.trim()
    payloadPedido.correo_invitado = correoInvitado.trim()

    const { error: orderError } = await supabase
      .from('pedidos')
      .insert(payloadPedido)

    if (orderError) {
      const reason = orderError ? `${orderError.code ?? ''} ${orderError.message}`.trim() : 'Sin detalle de error.'
      alert(`No se pudo crear el pedido en Supabase.\n${reason}`)
      return
    }

    const rows = items.map((item) => ({
      pedido_id: orderId,
      producto_id: item.productId,
      nombre_producto: item.name,
      precio_unitario: item.unitPrice,
      cantidad: item.quantity,
      dedicatoria: item.dedication ?? null,
    }))

    const { error: itemsError } = await supabase.from('detalle_pedidos').insert(rows)

    if (itemsError) {
      const reason = `${itemsError.code ?? ''} ${itemsError.message}`.trim()
      alert(`El pedido se creo, pero fallo al guardar los items.\n${reason}`)
      return
    }

    setTipoEntrega('recoger_en_tienda')
    setDireccionEnvio('')
    setNombreInvitado('')
    setTelefonoInvitado('')
    setCorreoInvitado('')
    clearCart()
    alert(`Pedido creado con exito. ID: ${orderId}`)
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
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Tipo de entrega</label>
                <select
                  value={tipoEntrega}
                  onChange={(event) => {
                    const next = event.target.value as 'recoger_en_tienda' | 'envio_a_domicilio'
                    setTipoEntrega(next)
                    if (next !== 'envio_a_domicilio') {
                      setDireccionEnvio('')
                    }
                  }}
                  className="w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-rose-300 focus:ring"
                >
                  <option value="envio_a_domicilio">A domicilio</option>
                  <option value="recoger_en_tienda">Recoger en tienda</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Nombre</label>
                <input
                  value={nombreInvitado}
                  onChange={(event) => setNombreInvitado(sanitizeNombreInput(event.target.value))}
                  placeholder="Tu nombre completo"
                  autoComplete="name"
                  inputMode="text"
                  pattern="[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+"
                  className="w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-rose-300 focus:ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Telefono</label>
                <input
                  value={telefonoInvitado}
                  onChange={(event) => setTelefonoInvitado(sanitizeTelefonoInput(event.target.value))}
                  placeholder="10 digitos"
                  inputMode="numeric"
                  maxLength={10}
                  pattern="\d{10}"
                  className="w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-rose-300 focus:ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Correo</label>
                <input
                  value={correoInvitado}
                  onChange={(event) => setCorreoInvitado(event.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder="tu@email.com"
                  className="w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-rose-300 focus:ring"
                />
              </div>
              {tipoEntrega === 'envio_a_domicilio' && (
                <>
                  {user && (
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Direccion guardada</label>
                      <select
                        value={direccionSeleccionadaId}
                        onChange={(event) => setDireccionSeleccionadaId(event.target.value)}
                        disabled={direccionesCargando}
                        className="w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-rose-300 focus:ring"
                      >
                        {direccionesUsuario.map((dir) => (
                          <option key={dir.id} value={dir.id}>
                            {dir.etiqueta} - {dir.calle_numero}
                          </option>
                        ))}
                        <option value="manual">Escribir otra direccion</option>
                      </select>
                    </div>
                  )}
                  {(!user || direccionSeleccionadaId === 'manual' || direccionesUsuario.length === 0) && (
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Direccion de entrega</label>
                      <textarea
                        value={direccionEnvio}
                        onChange={(event) => setDireccionEnvio(event.target.value)}
                        rows={3}
                        placeholder="Calle, numero, colonia, ciudad, estado y codigo postal"
                        className="w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-rose-300 focus:ring"
                      />
                    </div>
                  )}
                </>
              )}
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
              {user ? 'Crear pedido en Supabase' : 'Crear pedido como invitado'}
            </button>

            <button
              onClick={handleFinalizeWhatsApp}
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
            >
              Finalizar por WhatsApp
            </button>

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


import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { useCart } from '../../context/CartContext'
import { supabase } from '../../lib/supabaseClient'
import { useCatalog } from '../../hooks/useCatalog'
import { formatPrice } from '../../utils/format'
import { sanitizeTelefonoInput } from '../../utils/phone'
import { buildWhatsAppUrl } from '../../utils/whatsapp'
import { SHIPPING_COST } from '../../utils/constants'
import { useToast } from '../../components/Toast/ToastProvider'

function sanitizeNombreInput(value: string) {
  return value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g, '').replace(/\s{2,}/g, ' ')
}

function isCorreoValido(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
}

export default function CarritoPage() {
  const { catalog } = useCatalog()
  const { user, profile, refreshProfile } = useAuth()
  const { items, totalAmount, totalItems, removeItem, setItemQuantity, clearCart } = useCart()
  const { addToast } = useToast()

  const [tipoEntrega, setTipoEntrega] = useState<'recoger_en_tienda' | 'envio_a_domicilio'>('recoger_en_tienda')
  const [direccionEnvio, setDireccionEnvio] = useState('')
  const [nombreInvitado, setNombreInvitado] = useState('')
  const [telefonoInvitado, setTelefonoInvitado] = useState('')
  const [correoInvitado, setCorreoInvitado] = useState('')
  const [checkoutSection, setCheckoutSection] = useState<1 | 2>(1)
  const [codigoDescuento, setCodigoDescuento] = useState('')
  const [telefonoPerfil, setTelefonoPerfil] = useState<string | null>(null)
  const [direccionesUsuario, setDireccionesUsuario] = useState<Array<{ id: string; etiqueta: string; calle_numero: string; ciudad: string; estado: string; codigo_postal: string; es_predeterminada: boolean }>>([])
  const [direccionesCargando, setDireccionesCargando] = useState(false)
  const [direccionSeleccionadaId, setDireccionSeleccionadaId] = useState<string>('manual')

  const locale = catalog?.store.locale ?? 'es-MX'
  const currency = catalog?.store.currency ?? 'MXN'
  const telefonoPerfilNormalizado = (telefonoPerfil ?? '').trim()
  const mostrarApartadoTusDatos = !user || telefonoPerfilNormalizado.length === 0
  const usaDireccionGuardada = user && tipoEntrega === 'envio_a_domicilio' && direccionSeleccionadaId !== 'manual'
  const subtotal = totalAmount
  const gastosEnvio = tipoEntrega === 'envio_a_domicilio' ? SHIPPING_COST : 0
  const descuento = 0
  const totalConAjustes = Math.max(0, subtotal + gastosEnvio - descuento)
  const nombrePedido = !user ? nombreInvitado.trim() : profile?.nombre_completo?.trim() ?? ''
  const telefonoPedido = mostrarApartadoTusDatos ? telefonoInvitado.trim() : telefonoPerfilNormalizado
  const correoPedido = !user ? correoInvitado.trim() : user?.email?.trim() ?? ''

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
      setTelefonoPerfil(null)
      return
    }

    const phoneFromProfile = profile?.telefono?.trim() ?? ''
    if (phoneFromProfile) {
      setTelefonoPerfil(phoneFromProfile)
      return
    }

    const loadTelefonoPerfil = async () => {
      const { data } = await supabase.from('perfiles').select('telefono').eq('id', user.id).single()
      const telefono = (data?.telefono as string | null) ?? null
      setTelefonoPerfil(telefono)
    }

    void loadTelefonoPerfil()
  }, [profile?.telefono, user])

  useEffect(() => {
    if (!mostrarApartadoTusDatos && checkoutSection === 2) {
      setCheckoutSection(1)
    }
  }, [checkoutSection, mostrarApartadoTusDatos])

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
    if (!user && !nombreInvitado.trim()) return 'Ingresa el nombre completo.'
    if (!user && sanitizeNombreInput(nombreInvitado).trim().length < 2) return 'El nombre solo debe contener letras.'
    if (mostrarApartadoTusDatos && !telefonoInvitado.trim()) return 'Ingresa el telefono.'
    if (mostrarApartadoTusDatos && telefonoInvitado.trim().length !== 10) return 'El telefono debe tener exactamente 10 digitos.'
    if (!mostrarApartadoTusDatos && telefonoPerfilNormalizado.length !== 10) return 'No se encontro un telefono valido en tu perfil.'
    if (!user && !correoInvitado.trim()) return 'Ingresa el correo.'
    if (!user && !isCorreoValido(correoInvitado.trim())) return 'Ingresa un correo valido.'
    if (tipoEntrega === 'envio_a_domicilio' && !usaDireccionGuardada && direccionEnvio.trim().length === 0) {
      return 'Si eliges A domicilio debes ingresar una direccion de entrega.'
    }
    return null
  }

  const canShowSubmitButtons = useMemo(() => {
    if (!user && sanitizeNombreInput(nombreInvitado).trim().length < 2) return false
    if (mostrarApartadoTusDatos && telefonoInvitado.trim().length !== 10) return false
    if (!mostrarApartadoTusDatos && telefonoPerfilNormalizado.length !== 10) return false
    if (!user && !isCorreoValido(correoInvitado.trim())) return false
    if (tipoEntrega === 'envio_a_domicilio' && !usaDireccionGuardada && direccionEnvio.trim().length === 0) {
      return false
    }
    return true
  }, [correoInvitado, direccionEnvio, mostrarApartadoTusDatos, nombreInvitado, telefonoInvitado, telefonoPerfilNormalizado, tipoEntrega, usaDireccionGuardada, user])

  const whatsappText = [
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
      ...(nombrePedido.length > 0 ? [`Nombre: ${nombrePedido}`] : []),
      ...(telefonoPedido.length > 0 ? [`Telefono: ${telefonoPedido}`] : []),
      ...(correoPedido.length > 0 ? [`Correo: ${correoPedido}`] : []),
      `Subtotal: ${formatPrice(subtotal, locale, currency)}`,
      `Gastos de envio: ${formatPrice(gastosEnvio, locale, currency)}`,
      `Descuento: -${formatPrice(descuento, locale, currency)}`,
      `Total: ${formatPrice(totalConAjustes, locale, currency)}`,
    ].join('\n')

  const whatsappUrl = buildWhatsAppUrl(whatsappText)

  function handleFinalizeWhatsApp() {
    if (items.length === 0) return
    const error = validarCamposObligatorios()
    if (error) {
      addToast(error, 'error')
      return
    }
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
  }

  async function guardarTelefonoPerfilSiCorresponde() {
    if (!user) return

    const telefonoNuevo = sanitizeTelefonoInput(telefonoInvitado).trim()
    if (telefonoNuevo.length !== 10) return
    if (telefonoPerfilNormalizado.length === 10) return

    const { data: updatedRow, error: updateError } = await supabase
      .from('perfiles')
      .update({ telefono: telefonoNuevo })
      .eq('id', user.id)
      .select('id,telefono')
      .maybeSingle()

    if (!updateError && updatedRow?.telefono === telefonoNuevo) {
      setTelefonoPerfil(telefonoNuevo)
      await refreshProfile()
      return
    }

    const { data: upsertRow, error: upsertError } = await supabase
      .from('perfiles')
      .upsert({ id: user.id, telefono: telefonoNuevo }, { onConflict: 'id' })
      .select('id,telefono')
      .maybeSingle()

    if (!upsertError && upsertRow?.telefono === telefonoNuevo) {
      setTelefonoPerfil(telefonoNuevo)
      await refreshProfile()
      return
    }

    const reason = `${upsertError?.code ?? updateError?.code ?? ''} ${upsertError?.message ?? updateError?.message ?? ''}`.trim()
    addToast(`Pedido creado, pero no se pudo guardar el telefono. ${reason || 'Sin detalle.'}`, 'info')
  }

  async function handleCreateOrder() {
    if (items.length === 0) return
    const errorCampos = validarCamposObligatorios()
    if (errorCampos) {
      addToast(errorCampos, 'error')
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
      subtotal,
      costo_envio: gastosEnvio,
      total: totalConAjustes,
    }

    if (user) {
      payloadPedido.usuario_id = user.id
    }
    payloadPedido.nombre_invitado = nombrePedido
    payloadPedido.telefono_invitado = telefonoPedido
    payloadPedido.correo_invitado = correoPedido

    const { error: orderError } = await supabase
      .from('pedidos')
      .insert(payloadPedido)

    if (orderError) {
      const reason = orderError ? `${orderError.code ?? ''} ${orderError.message}`.trim() : 'Sin detalle de error.'
      addToast(`No se pudo crear el pedido. ${reason}`, 'error')
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
      addToast(`Pedido creado, pero fallo al guardar los productos. ${reason}`, 'error')
      return
    }

    await guardarTelefonoPerfilSiCorresponde()

    setTipoEntrega('recoger_en_tienda')
    setCheckoutSection(1)
    setDireccionEnvio('')
    setNombreInvitado('')
    setTelefonoInvitado('')
    setCorreoInvitado('')
    setCodigoDescuento('')
    clearCart()
    addToast('Pedido creado con exito.', 'success')
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Carrito de compras</h1>
        <span className="rounded-full bg-teal-100 px-3 py-1 text-sm font-semibold text-teal-700">
          {totalItems} productos
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-teal-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-600">Tu carrito esta vacio.</p>
          <Link to="/categorias" className="mt-4 inline-flex rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white">
            Explorar productos
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="space-y-4">
            {items.map((item) => (
              <article key={item.id} className="grid gap-4 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm sm:grid-cols-[110px_1fr]">
                <img src={item.image} alt={item.name} className="h-28 w-full rounded-xl object-cover" />
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="font-semibold text-slate-900">{item.name}</h2>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="rounded-lg bg-teal-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-teal-700"
                    >
                      Eliminar
                    </button>
                  </div>

                  {item.dedication && (
                    <p className="mt-1 text-xs text-slate-500">Dedicatoria: {item.dedication}</p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center rounded-xl border border-teal-100 bg-white">
                      <button
                        onClick={() => setItemQuantity(item.id, item.quantity - 1)}
                        className="px-3 py-2 text-sm font-bold text-slate-700 hover:bg-teal-50"
                      >
                        -
                      </button>
                      <span className="min-w-10 px-2 text-center text-sm font-semibold text-slate-900">{item.quantity}</span>
                      <button
                        onClick={() => setItemQuantity(item.id, item.quantity + 1)}
                        className="px-3 py-2 text-sm font-bold text-slate-700 hover:bg-teal-50"
                      >
                        +
                      </button>
                    </div>

                    <p className="text-lg font-black text-teal-700">
                      {formatPrice(item.unitPrice * item.quantity, locale, currency)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <aside className="h-fit rounded-3xl border border-teal-100 bg-white p-5 shadow-sm lg:sticky lg:top-24">
            <h2 className="text-lg font-bold text-slate-900">{checkoutSection === 2 && mostrarApartadoTusDatos ? 'Tus datos' : 'Entrega'}</h2>
            <div className="mt-4 space-y-4 text-sm text-slate-600">
              {checkoutSection === 1 || !mostrarApartadoTusDatos ? (
                <section className="space-y-2">
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
                      className="w-full rounded-xl border border-teal-100 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none ring-teal-300 focus:ring"
                    >
                      <option value="envio_a_domicilio">A domicilio</option>
                      <option value="recoger_en_tienda">Recoger en tienda</option>
                    </select>
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
                            className="w-full rounded-xl border border-teal-100 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none ring-teal-300 focus:ring"
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
                            className="w-full rounded-xl border border-teal-100 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none ring-teal-300 focus:ring"
                          />
                        </div>
                      )}
                    </>
                  )}
                  {mostrarApartadoTusDatos && (
                    <button
                      onClick={() => setCheckoutSection(2)}
                      className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
                    >
                      Continuar
                    </button>
                  )}
                </section>
              ) : (
                <section className="space-y-2">
                  {!user && (
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Nombre</label>
                      <input
                        value={nombreInvitado}
                        onChange={(event) => setNombreInvitado(sanitizeNombreInput(event.target.value))}
                        placeholder="Tu nombre completo"
                        autoComplete="name"
                        inputMode="text"
                        pattern="[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+"
                        className="w-full rounded-xl border border-teal-100 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none ring-teal-300 focus:ring"
                      />
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Telefono</label>
                    <input
                      value={telefonoInvitado}
                      onChange={(event) => setTelefonoInvitado(sanitizeTelefonoInput(event.target.value))}
                      placeholder="10 digitos"
                      inputMode="numeric"
                      maxLength={10}
                      pattern="\d{10}"
                      className="w-full rounded-xl border border-teal-100 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none ring-teal-300 focus:ring"
                    />
                  </div>
                  {!user && (
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Correo</label>
                      <input
                        value={correoInvitado}
                        onChange={(event) => setCorreoInvitado(event.target.value)}
                        type="email"
                        autoComplete="email"
                        placeholder="tu@email.com"
                        className="w-full rounded-xl border border-teal-100 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none ring-teal-300 focus:ring"
                      />
                    </div>
                  )}
                  <button
                    onClick={() => setCheckoutSection(1)}
                    className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
                  >
                    Volver a entrega
                  </button>
                </section>
              )}

              <section className="space-y-2 border-t border-teal-100 pt-3">
                <h3 className="text-lg font-bold text-slate-900">Resúmen</h3>
                <p className="flex items-center justify-between">
                  <span>Productos</span>
                  <span>{totalItems}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal, locale, currency)}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>Gastos de envio</span>
                  <span>{formatPrice(gastosEnvio, locale, currency)}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>Descuento</span>
                  <span>-{formatPrice(descuento, locale, currency)}</span>
                </p>
                <p className="flex items-center justify-between text-base font-black text-slate-900">
                  <span>Total</span>
                  <span>{formatPrice(totalConAjustes, locale, currency)}</span>
                </p>
                <div className="my-1 h-px w-full bg-teal-100" />
                <div className="flex items-center gap-2">
                  <input
                    value={codigoDescuento}
                    onChange={(event) => setCodigoDescuento(event.target.value.toUpperCase())}
                    type="text"
                    placeholder="Codigo de descuento"
                    className="w-full rounded-xl border border-teal-100 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none ring-teal-300 focus:ring"
                  />
                  <button
                    type="button"
                    className="rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
                  >
                    Aplicar
                  </button>
                </div>

                {canShowSubmitButtons && (
                  <>
                    <button
                      onClick={handleCreateOrder}
                      className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
                    >
                      Crear pedido
                    </button>

                    <button
                      onClick={handleFinalizeWhatsApp}
                      className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
                    >
                      Crear pedido WhatsApp
                    </button>
                  </>
                )}

                <button
                  onClick={clearCart}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
                >
                  Vaciar carrito
                </button>
              </section>
            </div>
          </aside>
        </div>
      )}
    </main>
  )
}









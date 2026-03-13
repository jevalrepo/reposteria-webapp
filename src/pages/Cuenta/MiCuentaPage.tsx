import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { supabase } from '../../lib/supabaseClient'
import { sanitizeTelefonoInput } from '../../utils/phone'
import { useToast } from '../../components/Toast/ToastProvider'

type OrderItem = {
  id: string
  nombre_producto: string
  cantidad: number
  precio_unitario: number
  dedicatoria: string | null
}

type OrderSummary = {
  id: string
  folio: string | null
  estado: string
  tipo_entrega: string
  direccion_cliente_id: string | null
  direccion_envio_texto: string | null
  notas: string | null
  subtotal: number | null
  costo_envio: number | null
  total: number
  creado_en: string
  detalle_pedidos: OrderItem[]
  direccion_cliente: Address | null
}

type Address = {
  id: string
  etiqueta: string
  nombre_recibe: string
  telefono: string | null
  calle_numero: string
  interior_referencia: string | null
  ciudad: string
  estado: string
  codigo_postal: string
  notas_entrega: string | null
  es_predeterminada: boolean
  creado_en: string
}

type AddressForm = {
  etiqueta: string
  nombre_recibe: string
  telefono: string
  calle_numero: string
  interior_referencia: string
  ciudad: string
  estado: string
  codigo_postal: string
  notas_entrega: string
  es_predeterminada: boolean
}

const emptyAddressForm: AddressForm = {
  etiqueta: 'Casa',
  nombre_recibe: '',
  telefono: '',
  calle_numero: '',
  interior_referencia: '',
  ciudad: '',
  estado: '',
  codigo_postal: '',
  notas_entrega: '',
  es_predeterminada: false,
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatTipoEntrega(value: string) {
  if (value === 'envio_a_domicilio') return 'A domicilio'
  if (value === 'envio_domicilio') return 'A domicilio'
  if (value === 'recoger_en_tienda') return 'Recoger en tienda'
  return value
}

function statusColorClass(estado: string) {
  switch (estado) {
    case 'confirmado':
    case 'listo_para_entrega':
    case 'en_camino':
    case 'entregado':
      return 'text-green-600'
    case 'en_preparacion':
    case 'pendiente':
      return 'text-amber-500'
    case 'cancelado':
      return 'text-red-600'
    default:
      return 'text-slate-700'
  }
}

function construirDireccionCompleta(address: Address | null, fallback: string | null) {
  if (address) {
    const linea1 = [address.calle_numero, address.interior_referencia].filter(Boolean).join(', ')
    const linea2 = [address.ciudad, address.estado, address.codigo_postal].filter(Boolean).join(', ')
    return [linea1, linea2].filter(Boolean).join(' | ')
  }
  return fallback ?? 'No especificada'
}

function readString(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function getAvatarDesdeAuth(user: { user_metadata?: Record<string, unknown> }) {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
  return readString(metadata.avatar_url) ?? readString(metadata.picture)
}

export default function MiCuentaPage() {
  const { user, profile, profileLoaded } = useAuth()
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState<'perfil' | 'direcciones' | 'pedidos'>('perfil')
  const [profileName, setProfileName] = useState('')
  const [profilePhone, setProfilePhone] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileStatus, setProfileStatus] = useState('')

  const [pedidos, setOrders] = useState<OrderSummary[]>([])
  const [pedidosLoading, setOrdersLoading] = useState(false)
  const [pedidosError, setOrdersError] = useState('')
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<OrderSummary | null>(null)
  const [cancelandoPedidoId, setCancelandoPedidoId] = useState<string | null>(null)

  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressesLoading, setAddressesLoading] = useState(false)
  const [addressesError, setAddressesError] = useState('')
  const [addressForm, setAddressForm] = useState<AddressForm>(emptyAddressForm)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [savingAddress, setSavingAddress] = useState(false)
  const [addressStatus, setAddressStatus] = useState('')

  const avatarDesdeAuth = useMemo(() => (user ? getAvatarDesdeAuth(user) : null), [user])
  const avatarPerfil = profile?.url_avatar ?? avatarDesdeAuth

  const userDisplayName = useMemo(
    () => {
      if (!profileLoaded) return ''
      return profileName.trim() || profile?.nombre_completo || user?.email || 'Usuario'
    },
    [profile?.nombre_completo, profileLoaded, profileName, user?.email],
  )
  const avatarInitials = useMemo(() => {
    const base = userDisplayName.trim()
    if (base.length === 0) return '--'
    return base.slice(0, 2).toUpperCase()
  }, [userDisplayName])

  useEffect(() => {
    if (!user) return
    if (!profileLoaded) return

    setProfileName(profile?.nombre_completo ?? '')
    setProfilePhone(profile?.telefono ?? '')
  }, [profile?.nombre_completo, profile?.telefono, profileLoaded, user])

  useEffect(() => {
    if (!user) return

    const loadOrders = async () => {
      setOrdersLoading(true)
      setOrdersError('')

      const { data, error } = await supabase
        .from('pedidos')
        .select(
          'id,folio,estado,tipo_entrega,direccion_cliente_id,direccion_envio_texto,notas,subtotal,costo_envio,total,creado_en,detalle_pedidos(id,nombre_producto,cantidad,precio_unitario,dedicatoria),direccion_cliente:direcciones_clientes!pedidos_direccion_cliente_id_fkey(id,etiqueta,nombre_recibe,telefono,calle_numero,interior_referencia,ciudad,estado,codigo_postal,notas_entrega,es_predeterminada,creado_en)',
        )
        .eq('usuario_id', user.id)
        .order('creado_en', { ascending: false })

      if (error) {
        setOrdersError('No se pudieron cargar tus pedidos.')
        setOrders([])
        setOrdersLoading(false)
        return
      }

      const normalizedOrders = ((data ?? []) as (OrderSummary & { direccion_cliente: Address[] | null })[]).map((order) => ({
        ...order,
        direccion_cliente: Array.isArray(order.direccion_cliente) ? (order.direccion_cliente[0] ?? null) : null,
      }))
      setOrders(normalizedOrders)
      setOrdersLoading(false)
    }

    const loadAddresses = async () => {
      setAddressesLoading(true)
      setAddressesError('')

      const { data, error } = await supabase
        .from('direcciones_clientes')
        .select('id,etiqueta,nombre_recibe,telefono,calle_numero,interior_referencia,ciudad,estado,codigo_postal,notas_entrega,es_predeterminada,creado_en')
        .eq('usuario_id', user.id)
        .order('es_predeterminada', { ascending: false })
        .order('creado_en', { ascending: false })

      if (error) {
        if (error.code === '42P01') {
          setAddressesError(
            'Falta la tabla direcciones_clientes. Ejecuta el script SQL que te comparti para habilitar direcciones.',
          )
        } else {
          const reason = `${error.code ?? ''} ${error.message}`.trim()
          setAddressesError(`No se pudieron cargar tus direcciones. ${reason}`)
        }
        setAddresses([])
        setAddressesLoading(false)
        return
      }

      setAddresses((data ?? []) as Address[])
      setAddressesLoading(false)
    }

    void Promise.all([loadOrders(), loadAddresses()])
  }, [user])

  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault()
    if (!user) return

    setSavingProfile(true)
    setProfileStatus('')

    const fullName = profileName.trim()
    const phoneRaw = profilePhone.trim()
    const phoneValue = sanitizeTelefonoInput(phoneRaw)

    if (phoneRaw.length > 0 && phoneValue.length !== 10) {
      setSavingProfile(false)
      setProfileStatus('El telefono debe tener 10 digitos numericos.')
      return
    }

    const payloadPerfil = {
      correo_electronico: user.email ?? null,
      nombre_completo: fullName.length > 0 ? fullName : null,
      telefono: phoneRaw.length > 0 ? phoneValue : null,
    }

    const { data: updatedRows, error: updateError } = await supabase
      .from('perfiles')
      .update(payloadPerfil)
      .eq('id', user.id)
      .select('id')
      .limit(1)

    let error = updateError
    if (!error && (!updatedRows || updatedRows.length === 0)) {
      const { error: insertError } = await supabase
        .from('perfiles')
        .insert({ id: user.id, ...payloadPerfil })
      error = insertError
    }

    setSavingProfile(false)
    if (error) {
      if (error.code === '42703') {
        setProfileStatus('No existe la columna telefono en perfiles. Ejecuta el script SQL de migracion.')
        return
      }
      if (error.code === '23514') {
        setProfileStatus('Telefono invalido. Debe ser null o 10 digitos numericos.')
        return
      }
      if (error.code === '42501') {
        setProfileStatus('Sin permisos para actualizar el perfil (RLS/politicas).')
        return
      }
      const reason = `${error.code ?? ''} ${error.message}`.trim()
      setProfileStatus(`No se pudo guardar el perfil. ${reason}`)
      return
    }

    setProfileStatus('Perfil actualizado.')
  }

  function startAddressEdit(address: Address) {
    setEditingAddressId(address.id)
    setAddressStatus('')
    setAddressForm({
      etiqueta: address.etiqueta,
      nombre_recibe: address.nombre_recibe,
      telefono: address.telefono ?? '',
      calle_numero: address.calle_numero,
      interior_referencia: address.interior_referencia ?? '',
      ciudad: address.ciudad,
      estado: address.estado,
      codigo_postal: address.codigo_postal,
      notas_entrega: address.notas_entrega ?? '',
      es_predeterminada: address.es_predeterminada,
    })
  }

  function resetAddressForm() {
    setEditingAddressId(null)
    setAddressForm(emptyAddressForm)
    setAddressStatus('')
  }

  async function handleSaveAddress(event: FormEvent) {
    event.preventDefault()
    if (!user) return

    setSavingAddress(true)
    setAddressStatus('')

    if (addressForm.es_predeterminada) {
      await supabase.from('direcciones_clientes').update({ es_predeterminada: false }).eq('usuario_id', user.id)
    }

    const payload = {
      usuario_id: user.id,
      etiqueta: addressForm.etiqueta.trim(),
      nombre_recibe: addressForm.nombre_recibe.trim(),
      telefono: addressForm.telefono.trim() || null,
      calle_numero: addressForm.calle_numero.trim(),
      interior_referencia: addressForm.interior_referencia.trim() || null,
      ciudad: addressForm.ciudad.trim(),
      estado: addressForm.estado.trim(),
      codigo_postal: addressForm.codigo_postal.trim(),
      notas_entrega: addressForm.notas_entrega.trim() || null,
      es_predeterminada: addressForm.es_predeterminada,
    }

    const query = editingAddressId
      ? supabase.from('direcciones_clientes').update(payload).eq('id', editingAddressId).eq('usuario_id', user.id)
      : supabase.from('direcciones_clientes').insert(payload)

    const { error } = await query

    if (error) {
      if (error.code === '42P01') {
        setAddressStatus('No existe la tabla direcciones_clientes. Ejecuta el script SQL.')
      } else {
        const reason = `${error.code ?? ''} ${error.message}`.trim()
        setAddressStatus(`No se pudo guardar la direccion. ${reason}`)
      }
      setSavingAddress(false)
      return
    }

    const { data: refreshed } = await supabase
      .from('direcciones_clientes')
      .select('id,etiqueta,nombre_recibe,telefono,calle_numero,interior_referencia,ciudad,estado,codigo_postal,notas_entrega,es_predeterminada,creado_en')
      .eq('usuario_id', user.id)
      .order('es_predeterminada', { ascending: false })
      .order('creado_en', { ascending: false })

    setAddresses((refreshed ?? []) as Address[])
    resetAddressForm()
    setAddressStatus('Direccion guardada.')
    setSavingAddress(false)
  }

  async function handleDeleteAddress(addressId: string) {
    if (!user) return

    const { error } = await supabase.from('direcciones_clientes').delete().eq('id', addressId).eq('usuario_id', user.id)
    if (error) {
      const reason = `${error.code ?? ''} ${error.message}`.trim()
      setAddressStatus(`No se pudo eliminar la direccion. ${reason}`)
      return
    }

    setAddresses((current) => current.filter((item) => item.id !== addressId))
    if (editingAddressId === addressId) {
      resetAddressForm()
    }
  }

  async function handleCancelOrder(orderId: string) {
    if (!user) return
    const confirmed = window.confirm('Quieres cancelar este pedido?')
    if (!confirmed) return

    setCancelandoPedidoId(orderId)
    setOrdersError('')

    const { error } = await supabase
      .from('pedidos')
      .update({ estado: 'cancelado' })
      .eq('id', orderId)
      .eq('usuario_id', user.id)
      .eq('estado', 'pendiente')

    if (error) {
      const reason = `${error.code ?? ''} ${error.message}`.trim()
      setOrdersError(`No se pudo cancelar el pedido. ${reason}`)
      setCancelandoPedidoId(null)
      return
    }

    setOrders((current) =>
      current.map((order) => (order.id === orderId ? { ...order, estado: 'cancelado' } : order)),
    )
    setPedidoSeleccionado((current) => (current && current.id === orderId ? { ...current, estado: 'cancelado' } : current))
    setCancelandoPedidoId(null)
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 md:px-6">
        <div className="rounded-2xl border border-teal-100 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-slate-900">Mi cuenta</h1>
          <p className="mt-3 text-sm text-slate-600">Necesitas iniciar sesion para ver esta seccion.</p>
          <Link to="/" className="mt-5 inline-flex rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white">
            Volver al inicio
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-12">
      <div className="mb-6 rounded-3xl border border-teal-100 bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Mi cuenta</h1>
        <p className="mt-2 min-h-[20px] text-sm text-slate-600">{profileLoaded ? userDisplayName : ''}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-2xl border border-teal-100 bg-white p-3 shadow-sm">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Apartados</p>
          <nav role="tablist" aria-label="Secciones de mi cuenta" className="space-y-1">
            <button
              role="tab"
              aria-selected={activeTab === 'perfil'}
              onClick={() => setActiveTab('perfil')}
              className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                activeTab === 'perfil' ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-teal-50'
              }`}
            >
              Mi perfil
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'direcciones'}
              onClick={() => setActiveTab('direcciones')}
              className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                activeTab === 'direcciones' ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-teal-50'
              }`}
            >
              Mis direcciones
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'pedidos'}
              onClick={() => setActiveTab('pedidos')}
              className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                activeTab === 'pedidos' ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-teal-50'
              }`}
            >
              Mis pedidos
            </button>
          </nav>
        </aside>

        <section className="space-y-6">
          {activeTab === 'perfil' && (
            <section className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Mi perfil</h2>
              <form onSubmit={handleSaveProfile} className="mt-4 space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-teal-100 bg-teal-50/40 p-3">
                  {avatarPerfil ? (
                    <img src={avatarPerfil} alt="Avatar del usuario" className="h-14 w-14 rounded-full object-cover" />
                  ) : (
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-teal-200 text-sm font-bold text-teal-700">
                      {avatarInitials}
                    </div>
                  )}
                  <div>
                    <p className="min-h-[20px] text-sm font-semibold text-slate-900">{profileLoaded ? userDisplayName : ''}</p>
                    <p className="text-xs text-slate-500">Avatar de Google</p>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Email</label>
                  <input
                    value={user.email ?? ''}
                    disabled
                    className="w-full rounded-xl border border-teal-100 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Nombre completo</label>
                  <input
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    placeholder="Tu nombre completo"
                    className="w-full rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Telefono</label>
                  <input
                    value={profilePhone}
                    onChange={(event) => setProfilePhone(sanitizeTelefonoInput(event.target.value))}
                    placeholder="10 digitos"
                    inputMode="numeric"
                    maxLength={10}
                    pattern="\d{10}"
                    className="w-full rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                >
                  {savingProfile ? 'Guardando...' : 'Guardar perfil'}
                </button>
                {profileStatus && <p role="status" className="text-xs text-slate-600">{profileStatus}</p>}
              </form>
            </section>
          )}

          {activeTab === 'direcciones' && (
            <section className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Mis direcciones</h2>
              <form onSubmit={handleSaveAddress} className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  value={addressForm.etiqueta}
                  onChange={(event) => setAddressForm((estado) => ({ ...estado, etiqueta: event.target.value }))}
                  placeholder="Etiqueta (Casa, Oficina)"
                  className="rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
                />
                <input
                  value={addressForm.nombre_recibe}
                  onChange={(event) => setAddressForm((estado) => ({ ...estado, nombre_recibe: event.target.value }))}
                  placeholder="Nombre de quien recibe"
                  required
                  className="rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
                />
                <input
                  value={addressForm.telefono}
                  onChange={(event) => setAddressForm((estado) => ({ ...estado, telefono: event.target.value }))}
                  placeholder="Telefono"
                  className="rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
                />
                <input
                  value={addressForm.codigo_postal}
                  onChange={(event) => setAddressForm((estado) => ({ ...estado, codigo_postal: event.target.value }))}
                  placeholder="Codigo postal"
                  required
                  className="rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
                />
                <input
                  value={addressForm.calle_numero}
                  onChange={(event) => setAddressForm((estado) => ({ ...estado, calle_numero: event.target.value }))}
                  placeholder="Calle y numero"
                  required
                  className="sm:col-span-2 rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
                />
                <input
                  value={addressForm.interior_referencia}
                  onChange={(event) => setAddressForm((estado) => ({ ...estado, interior_referencia: event.target.value }))}
                  placeholder="Interior, referencia (opcional)"
                  className="sm:col-span-2 rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
                />
                <input
                  value={addressForm.ciudad}
                  onChange={(event) => setAddressForm((estado) => ({ ...estado, ciudad: event.target.value }))}
                  placeholder="Ciudad"
                  required
                  className="rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
                />
                <input
                  value={addressForm.estado}
                  onChange={(event) => setAddressForm((estado) => ({ ...estado, estado: event.target.value }))}
                  placeholder="Estado"
                  required
                  className="rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
                />
                <textarea
                  value={addressForm.notas_entrega}
                  onChange={(event) => setAddressForm((estado) => ({ ...estado, notas_entrega: event.target.value }))}
                  rows={2}
                  placeholder="Notas de entrega (opcional)"
                  className="sm:col-span-2 rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
                />
                <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={addressForm.es_predeterminada}
                    onChange={(event) => setAddressForm((estado) => ({ ...estado, es_predeterminada: event.target.checked }))}
                  />
                  Marcar como direccion predeterminada
                </label>
                <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    disabled={savingAddress}
                    className="inline-flex rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                  >
                    {savingAddress ? 'Guardando...' : editingAddressId ? 'Actualizar direccion' : 'Guardar direccion'}
                  </button>
                  {editingAddressId && (
                    <button
                      type="button"
                      onClick={resetAddressForm}
                      className="inline-flex rounded-xl border border-teal-200 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
                    >
                      Cancelar edicion
                    </button>
                  )}
                </div>
                {addressStatus && <p role="status" className="sm:col-span-2 text-xs text-slate-600">{addressStatus}</p>}
                {addressesError && <p className="sm:col-span-2 text-xs text-teal-700">{addressesError}</p>}
              </form>

              <div className="mt-5 space-y-3">
                {addressesLoading ? (
                  <p className="text-sm text-slate-500">Cargando direcciones...</p>
                ) : addresses.length === 0 ? (
                  <p className="text-sm text-slate-500">Aun no has guardado direcciones.</p>
                ) : (
                  addresses.map((address) => (
                    <article key={address.id} className="rounded-xl border border-teal-100 bg-teal-50/40 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-900">
                          {address.etiqueta} {address.es_predeterminada ? '(Predeterminada)' : ''}
                        </p>
                        <div className="space-x-2 text-xs">
                          <button
                            onClick={() => startAddressEdit(address)}
                            className="font-semibold text-teal-700 hover:text-teal-800"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              void handleDeleteAddress(address.id)
                            }}
                            className="font-semibold text-teal-700 hover:text-teal-800"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-slate-700">
                        {address.nombre_recibe} {address.telefono ? `- ${address.telefono}` : ''}
                      </p>
                      <p className="text-sm text-slate-700">
                        {address.calle_numero}
                        {address.interior_referencia ? `, ${address.interior_referencia}` : ''}
                      </p>
                      <p className="text-sm text-slate-700">
                        {address.ciudad}, {address.estado}, {address.codigo_postal}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </section>
          )}

          {activeTab === 'pedidos' && (
            <section className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Mis pedidos</h2>
              {pedidosError && <p className="mt-3 text-sm text-teal-700">{pedidosError}</p>}
              {pedidosLoading ? (
                <p className="mt-3 text-sm text-slate-500">Cargando pedidos...</p>
              ) : pedidos.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">Aun no tienes pedidos.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {pedidos.map((order) => (
                    <article key={order.id} className="rounded-xl border border-teal-100 bg-teal-50/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-slate-900">Pedido #{order.folio ?? order.id.slice(0, 8)}</p>
                          <p className="text-xs text-slate-500">{formatDate(order.creado_en)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-wide text-slate-500">Estado</p>
                          <p className={`text-sm font-semibold ${statusColorClass(order.estado)}`}>{order.estado}</p>
                        </div>
                      </div>
                      <ul className="mt-3 space-y-1 text-sm text-slate-700">
                        {order.detalle_pedidos?.map((item) => (
                          <li key={item.id} className="flex justify-between gap-2">
                            <span>
                              {item.nombre_producto} x{item.cantidad}
                            </span>
                            <span>{formatMoney(item.precio_unitario * item.cantidad)}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 text-right text-sm font-bold text-slate-900">Total: {formatMoney(order.total)}</p>
                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        {order.estado === 'pendiente' && (
                          <button
                            type="button"
                            onClick={() => {
                              void handleCancelOrder(order.id)
                            }}
                            disabled={cancelandoPedidoId === order.id}
                            className="inline-flex rounded-xl border border-teal-200 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-60"
                          >
                            {cancelandoPedidoId === order.id ? 'Cancelando...' : 'Cancelar pedido'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setPedidoSeleccionado(order)}
                          className="inline-flex rounded-xl border border-teal-200 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
                        >
                          Ver detalle
                        </button>
                        {order.estado !== 'cancelado' && (
                          <button
                            type="button"
                            onClick={() => addToast('Proximamente podras pagar desde aqui.', 'info')}
                            className="inline-flex rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                          >
                            Pagar
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </section>
      </div>

      {pedidoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6">
          {(() => {
            const direccionSeleccionada =
              pedidoSeleccionado.direccion_cliente ??
              addresses.find((address) => address.id === pedidoSeleccionado.direccion_cliente_id) ??
              null
            return (
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-teal-100 bg-white p-5 shadow-xl">
            <button
              type="button"
              onClick={() => setPedidoSeleccionado(null)}
              aria-label="Cerrar detalle"
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border border-teal-200 text-sm font-bold text-teal-700 hover:bg-teal-50"
            >
              X
            </button>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Pedido #{pedidoSeleccionado.folio ?? pedidoSeleccionado.id.slice(0, 8)}
                </h3>
                <p className="mt-1 text-xs text-slate-500">{formatDate(pedidoSeleccionado.creado_en)}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Estado</p>
                <p className={`text-sm font-semibold ${statusColorClass(pedidoSeleccionado.estado)}`}>
                  {pedidoSeleccionado.estado}
                </p>
              </div>
              <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Tipo de entrega</p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatTipoEntrega(pedidoSeleccionado.tipo_entrega)}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-teal-100 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Direccion de entrega</p>
              <p className="mt-1 text-sm text-slate-900">
                {construirDireccionCompleta(direccionSeleccionada, pedidoSeleccionado.direccion_envio_texto)}
              </p>
              {direccionSeleccionada?.nombre_recibe && (
                <p className="mt-1 text-sm text-slate-700">
                  Recibe: {direccionSeleccionada.nombre_recibe}
                  {direccionSeleccionada.telefono
                    ? ` (${direccionSeleccionada.telefono})`
                    : ''}
                </p>
              )}
              {(pedidoSeleccionado.notas || direccionSeleccionada?.notas_entrega) && (
                <p className="mt-2 text-sm text-slate-700">
                  Referencia:{' '}
                  {pedidoSeleccionado.notas ??
                    direccionSeleccionada?.notas_entrega ??
                    'Sin referencia'}
                </p>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-teal-100 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Productos</p>
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {pedidoSeleccionado.detalle_pedidos?.map((item) => (
                  <li key={item.id} className="rounded-lg border border-teal-100 bg-teal-50/30 p-2">
                    <div className="flex justify-between gap-2">
                      <span>
                        {item.nombre_producto} x{item.cantidad}
                      </span>
                      <span>{formatMoney(item.precio_unitario * item.cantidad)}</span>
                    </div>
                    {item.dedicatoria && <p className="mt-1 text-xs text-slate-500">Dedicatoria: {item.dedicatoria}</p>}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 space-y-1 text-sm">
              <p className="flex justify-between text-slate-700">
                <span>Subtotal</span>
                <span>{formatMoney(pedidoSeleccionado.subtotal ?? pedidoSeleccionado.total)}</span>
              </p>
              <p className="flex justify-between text-slate-700">
                <span>Envio</span>
                <span>{formatMoney(pedidoSeleccionado.costo_envio ?? 0)}</span>
              </p>
              <p className="flex justify-between font-bold text-slate-900">
                <span>Total</span>
                <span>{formatMoney(pedidoSeleccionado.total)}</span>
              </p>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {pedidoSeleccionado.estado === 'pendiente' && (
                <button
                  type="button"
                  onClick={() => {
                    void handleCancelOrder(pedidoSeleccionado.id)
                  }}
                  disabled={cancelandoPedidoId === pedidoSeleccionado.id}
                  className="inline-flex rounded-xl border border-teal-200 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-60"
                >
                  {cancelandoPedidoId === pedidoSeleccionado.id ? 'Cancelando...' : 'Cancelar pedido'}
                </button>
              )}
              {pedidoSeleccionado.estado !== 'cancelado' && (
                <button
                  type="button"
                  onClick={() => addToast('Proximamente podras pagar este pedido.', 'info')}
                  className="inline-flex rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  Pagar
                </button>
              )}
            </div>
          </div>
            )
          })()}
        </div>
      )}
    </main>
  )
}



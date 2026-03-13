import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../components/Toast/ToastProvider'
import { formatPrice } from '../../utils/format'
import { supabase } from '../../lib/supabaseClient'
import {
  fetchAllUsers,
  fetchAllOrders,
  updateUserProfile,
  deleteUser,
  updateOrderStatus,
  deleteOrder,
  fetchAllProducts,
  fetchCategoriesForAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
} from '../../services/adminService'
import type { AdminUser, AdminOrder, AdminProduct, AdminCategory } from '../../services/adminService'

const ORDER_STATUSES = [
  'pendiente',
  'confirmado',
  'en_preparacion',
  'listo_para_entrega',
  'en_camino',
  'entregado',
  'cancelado',
] as const

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  listo_para_entrega: 'Listo para entrega',
  en_camino: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

const STATUS_COLOR: Record<string, string> = {
  pendiente: 'text-amber-600',
  confirmado: 'text-teal-600',
  en_preparacion: 'text-blue-600',
  listo_para_entrega: 'text-indigo-600',
  en_camino: 'text-purple-600',
  entregado: 'text-green-700',
  cancelado: 'text-red-600',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatMoney(amount: number) {
  return formatPrice(amount, 'es-MX', 'MXN')
}

function normalizeRoleValue(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .trim()
    .toLowerCase()
}

function clientLabel(order: AdminOrder): string {
  const perfil = order.perfiles
  if (perfil?.nombre_completo) return perfil.nombre_completo
  if (perfil?.correo_electronico) return perfil.correo_electronico
  if (order.nombre_invitado) return order.nombre_invitado
  if (order.correo_invitado) return order.correo_invitado
  return 'Invitado'
}

// ── Edit User Modal ───────────────────────────────────────────────────────

type EditUserModalProps = {
  user: AdminUser
  onClose: () => void
  onSaved: (updated: Partial<AdminUser>) => void
}

function EditUserModal({ user, onClose, onSaved }: EditUserModalProps) {
  const { addToast } = useToast()
  const [nombre, setNombre] = useState(user.nombre_completo ?? '')
  const [telefono, setTelefono] = useState(user.telefono ?? '')
  const [rol, setRol] = useState(user.rol)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const fields = {
        nombre_completo: nombre.trim() || null,
        telefono: telefono.trim() || null,
        rol,
      }
      await updateUserProfile(user.id, fields)
      onSaved(fields)
      addToast('Usuario actualizado correctamente.', 'success')
      onClose()
    } catch {
      addToast('No se pudo actualizar el usuario.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Editar usuario</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-slate-500 hover:text-slate-700"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 text-xs text-slate-500">{user.correo_electronico ?? user.id}</p>
        <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
              Nombre completo
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre completo"
              className="w-full rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
              Teléfono
            </label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="10 dígitos"
              inputMode="numeric"
              className="w-full rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
              Rol
            </label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value as AdminUser['rol'])}
              className="w-full rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
            >
              <option value="cliente">cliente</option>
              <option value="moderador">moderador</option>
              <option value="administrador">administrador</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex rounded-xl border border-teal-200 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Order Detail Modal ────────────────────────────────────────────────────

type OrderDetailModalProps = {
  order: AdminOrder
  onClose: () => void
  onStatusChange: (orderId: string, estado: string) => void
  onDelete: (orderId: string) => void
}

function OrderDetailModal({ order, onClose, onStatusChange, onDelete }: OrderDetailModalProps) {
  const { addToast } = useToast()
  const [currentStatus, setCurrentStatus] = useState(order.estado)
  const [savingStatus, setSavingStatus] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  async function handleStatusChange(estado: string) {
    setCurrentStatus(estado)
    setSavingStatus(true)
    try {
      await updateOrderStatus(order.id, estado)
      onStatusChange(order.id, estado)
      addToast('Estado actualizado.', 'success')
    } catch {
      setCurrentStatus(order.estado)
      addToast('No se pudo actualizar el estado.', 'error')
    } finally {
      setSavingStatus(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteOrder(order.id)
      onDelete(order.id)
      addToast('Pedido eliminado.', 'success')
      onClose()
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'Sin detalle'
      addToast(`No se pudo eliminar el pedido. ${reason}`, 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-teal-100 bg-white p-5 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar detalle"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border border-teal-200 text-sm font-bold text-teal-700 hover:bg-teal-50"
        >
          ✕
        </button>

        <h3 className="text-xl font-black text-slate-900">
          Pedido #{order.folio ?? order.id.slice(0, 8)}
        </h3>
        <p className="mt-1 text-xs text-slate-500">{formatDate(order.creado_en)}</p>
        <p className="mt-1 text-sm text-slate-600">
          Cliente: <span className="font-semibold">{clientLabel(order)}</span>
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold uppercase text-slate-500">Estado:</label>
          <select
            value={currentStatus}
            disabled={savingStatus}
            onChange={(e) => { void handleStatusChange(e.target.value) }}
            className="rounded-xl border border-teal-100 px-3 py-1.5 text-sm outline-none ring-teal-300 focus:ring disabled:opacity-60"
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div className="mt-4 rounded-xl border border-teal-100 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Productos</p>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {order.detalle_pedidos.map((item) => (
              <li key={item.id} className="rounded-lg border border-teal-100 bg-teal-50/30 p-2">
                <div className="flex justify-between gap-2">
                  <span>{item.nombre_producto} x{item.cantidad}</span>
                  <span>{formatMoney(item.precio_unitario * item.cantidad)}</span>
                </div>
                {item.dedicatoria && (
                  <p className="mt-1 text-xs text-slate-500">Dedicatoria: {item.dedicatoria}</p>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-2 text-center">
            <p className="text-xs text-slate-500">Subtotal</p>
            <p className="font-semibold text-slate-900">{formatMoney(order.subtotal)}</p>
          </div>
          <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-2 text-center">
            <p className="text-xs text-slate-500">Envío</p>
            <p className="font-semibold text-slate-900">{formatMoney(order.costo_envio)}</p>
          </div>
          <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-2 text-center">
            <p className="text-xs text-slate-500">Total</p>
            <p className="font-bold text-teal-700">{formatMoney(order.total)}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {confirmDelete ? (
            <>
              <p className="w-full text-right text-xs text-slate-600">¿Confirmar eliminación?</p>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="inline-flex rounded-xl border border-teal-200 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => { void handleDelete() }}
                className="inline-flex rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? 'Eliminando...' : 'Confirmar'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Eliminar pedido
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Orders Section ────────────────────────────────────────────────────────

type OrdersSectionProps = {
  orders: AdminOrder[]
  loading: boolean
  error: string
  onStatusChange: (orderId: string, estado: string) => void
  onDelete: (orderId: string) => void
}

function OrdersSection({ orders, loading, error, onStatusChange, onDelete }: OrdersSectionProps) {
  const { addToast } = useToast()
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)

  const filtered = statusFilter
    ? orders.filter((o) => o.estado === statusFilter)
    : orders

  async function handleInlineStatusChange(orderId: string, estado: string) {
    setUpdatingStatusId(orderId)
    try {
      await updateOrderStatus(orderId, estado)
      onStatusChange(orderId, estado)
      addToast('Estado actualizado.', 'success')
    } catch {
      addToast('No se pudo actualizar el estado.', 'error')
    } finally {
      setUpdatingStatusId(null)
    }
  }

  async function handleDelete(orderId: string) {
    setDeletingId(orderId)
    try {
      await deleteOrder(orderId)
      onDelete(orderId)
      addToast('Pedido eliminado.', 'success')
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'Sin detalle'
      addToast(`No se pudo eliminar el pedido. ${reason}`, 'error')
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  if (loading) return <p className="mt-4 text-sm text-slate-500">Cargando pedidos...</p>
  if (error) return <p className="mt-4 text-sm text-red-600">{error}</p>

  return (
    <section className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">Pedidos ({orders.length})</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-teal-100 px-3 py-1.5 text-sm outline-none ring-teal-300 focus:ring"
        >
          <option value="">Todos los estados</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500">No hay pedidos{statusFilter ? ` con estado "${STATUS_LABELS[statusFilter]}"` : ''}.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <article key={order.id} className="rounded-xl border border-teal-100 bg-teal-50/30 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    #{order.folio ?? order.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-slate-500">{formatDate(order.creado_en)}</p>
                  <p className="mt-0.5 text-xs text-slate-600">{clientLabel(order)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={order.estado}
                    disabled={updatingStatusId === order.id}
                    onChange={(e) => { void handleInlineStatusChange(order.id, e.target.value) }}
                    className={`rounded-xl border border-teal-100 px-2 py-1 text-xs font-semibold outline-none ring-teal-300 focus:ring disabled:opacity-60 ${STATUS_COLOR[order.estado] ?? 'text-slate-700'}`}
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <span className="text-sm font-semibold text-teal-700">{formatMoney(order.total)}</span>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap justify-end gap-2">
                {confirmDeleteId === order.id ? (
                  <>
                    <span className="self-center text-xs text-slate-600">¿Eliminar este pedido?</span>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="inline-flex rounded-xl border border-teal-200 px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                    >
                      No
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === order.id}
                      onClick={() => { void handleDelete(order.id) }}
                      className="inline-flex rounded-xl bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {deletingId === order.id ? 'Eliminando...' : 'Sí, eliminar'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="inline-flex rounded-xl border border-teal-200 px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                    >
                      Ver detalle
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(order.id)}
                      className="inline-flex rounded-xl border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={(id, estado) => {
            onStatusChange(id, estado)
            setSelectedOrder((prev) => prev ? { ...prev, estado } : null)
          }}
          onDelete={(id) => {
            onDelete(id)
            setSelectedOrder(null)
          }}
        />
      )}
    </section>
  )
}

// ── Users Section ─────────────────────────────────────────────────────────

type UsersSectionProps = {
  users: AdminUser[]
  loading: boolean
  error: string
  currentUserId: string
  onUpdated: (userId: string, fields: Partial<AdminUser>) => void
  onDeleted: (userId: string) => void
}

function UsersSection({ users, loading, error, currentUserId, onUpdated, onDeleted }: UsersSectionProps) {
  const { addToast } = useToast()
  const [search, setSearch] = useState('')
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = search.trim()
    ? users.filter((u) => {
        const q = search.toLowerCase()
        return (
          u.nombre_completo?.toLowerCase().includes(q) ||
          u.correo_electronico?.toLowerCase().includes(q)
        )
      })
    : users

  async function handleDeleteUser(userId: string) {
    setDeletingId(userId)
    try {
      await deleteUser(userId)
      onDeleted(userId)
      addToast('Usuario eliminado.', 'success')
    } catch {
      addToast('No se pudo eliminar el usuario.', 'error')
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  if (loading) return <p className="mt-4 text-sm text-slate-500">Cargando usuarios...</p>
  if (error) return <p className="mt-4 text-sm text-red-600">{error}</p>

  return (
    <section className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">Usuarios ({users.length})</h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="w-full rounded-xl border border-teal-100 px-3 py-1.5 text-sm outline-none ring-teal-300 focus:ring sm:w-64"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500">
          {search ? 'Sin resultados para tu búsqueda.' : 'No hay usuarios registrados.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => (
            <article key={u.id} className="rounded-xl border border-teal-100 bg-teal-50/30 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  {u.url_avatar ? (
                    <img
                      src={u.url_avatar}
                      alt=""
                      aria-hidden="true"
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-teal-200 text-xs font-bold text-teal-700">
                      {(u.nombre_completo ?? u.correo_electronico ?? '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {u.nombre_completo ?? <span className="italic text-slate-400">Sin nombre</span>}
                    </p>
                    <p className="text-xs text-slate-500">{u.correo_electronico}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    u.rol === 'administrador' ? 'bg-teal-100 text-teal-800' :
                    u.rol === 'moderador' ? 'bg-indigo-100 text-indigo-800' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {u.rol}
                  </span>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap justify-end gap-2">
                {confirmDeleteId === u.id ? (
                  <>
                    <span className="self-center text-xs text-slate-600">¿Eliminar este usuario?</span>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="inline-flex rounded-xl border border-teal-200 px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                    >
                      No
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === u.id}
                      onClick={() => { void handleDeleteUser(u.id) }}
                      className="inline-flex rounded-xl bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {deletingId === u.id ? 'Eliminando...' : 'Sí, eliminar'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditingUser(u)}
                      className="inline-flex rounded-xl border border-teal-200 px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                    >
                      Editar
                    </button>
                    {u.id !== currentUserId && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(u.id)}
                        className="inline-flex rounded-xl border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    )}
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={(fields) => {
            onUpdated(editingUser.id, fields)
            setEditingUser(null)
          }}
        />
      )}
    </section>
  )
}

// ── Product Modal ─────────────────────────────────────────────────────────

type ProductModalProps = {
  product: AdminProduct | null
  categories: AdminCategory[]
  onClose: () => void
  onSaved: (product: AdminProduct) => void
}

function ProductModal({ product, categories, onClose, onSaved }: ProductModalProps) {
  const { addToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [nombre, setNombre] = useState(product?.nombre ?? '')
  const [sku, setSku] = useState(product?.sku ?? '')
  const [categoriaId, setCategoriaId] = useState(product?.categoria_id ?? '')
  const [subcategoriaId, setSubcategoriaId] = useState(product?.subcategoria_id ?? '')
  const [descripcion, setDescripcion] = useState(product?.descripcion ?? '')
  const [precio, setPrecio] = useState(product ? String(product.precio) : '')
  const [porciones, setPorciones] = useState(product?.porciones ?? '')
  const [horasPrep, setHorasPrep] = useState(product ? String(product.horas_preparacion) : '0')
  const [disponible, setDisponible] = useState(product?.disponible ?? true)
  const [destacado, setDestacado] = useState(product?.destacado ?? false)
  const [activo, setActivo] = useState(product?.activo ?? true)
  const [etiquetas, setEtiquetas] = useState((product?.etiquetas ?? []).join(', '))
  const [dietas, setDietas] = useState((product?.dietas ?? []).join(', '))

  const [existingUrls, setExistingUrls] = useState<string[]>(product?.imagenes ?? [])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const subcatsDisponibles = categories.find((c) => c.id === categoriaId)?.subcategorias ?? []

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    const previews = pendingPreviews
    return () => { previews.forEach((u) => URL.revokeObjectURL(u)) }
  }, [pendingPreviews])

  function handleCategoriaChange(id: string) {
    setCategoriaId(id)
    const subs = categories.find((c) => c.id === id)?.subcategorias ?? []
    if (!subs.find((s) => s.id === subcategoriaId)) setSubcategoriaId('')
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    const maxNew = 5 - existingUrls.length - pendingFiles.length
    const toAdd = files.slice(0, maxNew)
    const newPreviews = toAdd.map((f) => URL.createObjectURL(f))
    setPendingFiles((prev) => [...prev, ...toAdd])
    setPendingPreviews((prev) => [...prev, ...newPreviews])
    e.target.value = ''
  }

  function removeExisting(idx: number) {
    setExistingUrls((prev) => prev.filter((_, i) => i !== idx))
  }

  function removePending(idx: number) {
    URL.revokeObjectURL(pendingPreviews[idx])
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx))
    setPendingPreviews((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !sku.trim() || !categoriaId || !subcategoriaId || !descripcion.trim() || !precio) {
      addToast('Completa todos los campos requeridos (*).', 'error')
      return
    }
    setSaving(true)
    try {
      const newUrls = await Promise.all(pendingFiles.map((f) => uploadProductImage(f)))
      const fields: Omit<AdminProduct, 'id'> = {
        nombre: nombre.trim(),
        sku: sku.trim(),
        categoria_id: categoriaId,
        subcategoria_id: subcategoriaId,
        descripcion: descripcion.trim(),
        precio: parseFloat(precio),
        imagenes: [...existingUrls, ...newUrls],
        porciones: porciones.trim(),
        horas_preparacion: parseInt(horasPrep, 10) || 0,
        disponible,
        destacado,
        activo,
        etiquetas: etiquetas.split(',').map((t) => t.trim()).filter(Boolean),
        dietas: dietas.split(',').map((t) => t.trim()).filter(Boolean),
      }
      let saved: AdminProduct
      if (product) {
        await updateProduct(product.id, fields)
        saved = { id: product.id, ...fields }
      } else {
        saved = await createProduct(fields)
      }
      onSaved(saved)
      addToast(product ? 'Producto actualizado.' : 'Producto creado.', 'success')
      onClose()
    } catch {
      addToast('No se pudo guardar el producto.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const totalImages = existingUrls.length + pendingFiles.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-teal-100 bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border border-teal-200 text-sm font-bold text-teal-700 hover:bg-teal-50"
        >
          ✕
        </button>
        <h3 className="text-xl font-black text-slate-900">
          {product ? 'Editar producto' : 'Nuevo producto'}
        </h3>

        <form onSubmit={(e) => { void handleSubmit(e) }} className="mt-5 space-y-4">
          {/* Nombre */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Pastel de chocolate"
              className="w-full rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
            />
          </div>

          {/* SKU y Precio */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                SKU <span className="text-red-500">*</span>
              </label>
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Ej: PAST-CHOC-01"
                className="w-full rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                Precio (MXN) <span className="text-red-500">*</span>
              </label>
              <input
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                placeholder="450.00"
                className="w-full rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
              />
            </div>
          </div>

          {/* Categoría y Subcategoría */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                value={categoriaId}
                onChange={(e) => handleCategoriaChange(e.target.value)}
                className="w-full rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
              >
                <option value="">Seleccionar...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                Subcategoría <span className="text-red-500">*</span>
              </label>
              <select
                value={subcategoriaId}
                onChange={(e) => setSubcategoriaId(e.target.value)}
                disabled={subcatsDisponibles.length === 0}
                className="w-full rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring disabled:opacity-50"
              >
                <option value="">Seleccionar...</option>
                {subcatsDisponibles.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Porciones y Horas de preparación */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                Porciones
              </label>
              <input
                value={porciones}
                onChange={(e) => setPorciones(e.target.value)}
                placeholder="Ej: 8-10 personas"
                className="w-full rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                Horas de preparación
              </label>
              <input
                value={horasPrep}
                onChange={(e) => setHorasPrep(e.target.value)}
                type="number"
                min="0"
                placeholder="24"
                className="w-full rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
              Descripción <span className="text-red-500">*</span>
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Describe el producto..."
              className="w-full rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
            />
          </div>

          {/* Etiquetas */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
              Etiquetas{' '}
              <span className="font-normal normal-case text-slate-400">(separadas por coma)</span>
            </label>
            <input
              value={etiquetas}
              onChange={(e) => setEtiquetas(e.target.value)}
              placeholder="Ej: Cumpleaños, Aniversario"
              className="w-full rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
            />
          </div>

          {/* Dietas */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
              Opciones dietéticas{' '}
              <span className="font-normal normal-case text-slate-400">(separadas por coma)</span>
            </label>
            <input
              value={dietas}
              onChange={(e) => setDietas(e.target.value)}
              placeholder="Ej: Sin gluten, Vegano"
              className="w-full rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
            />
          </div>

          {/* Imágenes */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase text-slate-500">
              Imágenes ({totalImages}/5)
            </label>
            <div className="flex flex-wrap gap-2">
              {existingUrls.map((url, idx) => (
                <div key={`ex-${idx}`} className="relative">
                  <img
                    src={url}
                    alt=""
                    aria-hidden="true"
                    className="h-16 w-16 rounded-xl border border-teal-100 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeExisting(idx)}
                    aria-label="Quitar imagen"
                    className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-red-600 text-xs font-bold text-white hover:bg-red-700"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {pendingPreviews.map((preview, idx) => (
                <div key={`pend-${idx}`} className="relative">
                  <img
                    src={preview}
                    alt=""
                    aria-hidden="true"
                    className="h-16 w-16 rounded-xl border-2 border-teal-300 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePending(idx)}
                    aria-label="Quitar imagen"
                    className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-red-600 text-xs font-bold text-white hover:bg-red-700"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {totalImages < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="grid h-16 w-16 place-items-center rounded-xl border-2 border-dashed border-teal-200 text-xs font-semibold text-teal-600 hover:border-teal-400 hover:bg-teal-50"
                >
                  + Subir
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileChange}
            />
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap gap-5 rounded-xl border border-teal-100 bg-teal-50/30 p-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={disponible}
                onChange={(e) => setDisponible(e.target.checked)}
                className="h-4 w-4 rounded accent-teal-600"
              />
              Disponible (en stock)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="h-4 w-4 rounded accent-teal-600"
              />
              Activo (visible en catálogo)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={destacado}
                onChange={(e) => setDestacado(e.target.checked)}
                className="h-4 w-4 rounded accent-teal-600"
              />
              Destacado
            </label>
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex rounded-xl border border-teal-200 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex rounded-xl bg-teal-700 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {saving
                ? product ? 'Guardando...' : 'Creando...'
                : product ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Productos Section ─────────────────────────────────────────────────────

type ProductosSectionProps = {
  products: AdminProduct[]
  categories: AdminCategory[]
  loading: boolean
  error: string
  onCreated: (p: AdminProduct) => void
  onUpdated: (id: string, p: AdminProduct) => void
  onDeleted: (id: string) => void
}

function ProductosSection({ products, categories, loading, error, onCreated, onUpdated, onDeleted }: ProductosSectionProps) {
  const { addToast } = useToast()
  const [search, setSearch] = useState('')
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null)
  const [creatingProduct, setCreatingProduct] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const categoryName = (catId: string) =>
    categories.find((c) => c.id === catId)?.nombre ?? catId

  const filtered = search.trim()
    ? products.filter(
        (p) =>
          p.nombre.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase()),
      )
    : products

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deleteProduct(id)
      onDeleted(id)
      addToast('Producto eliminado.', 'success')
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : 'Sin detalle'
      addToast(`No se pudo eliminar el producto. ${reason}`, 'error')
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  function statusBadge(p: AdminProduct) {
    if (!p.activo)
      return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">Inactivo</span>
    if (!p.disponible)
      return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Sin stock</span>
    return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Activo</span>
  }

  if (loading) return <p className="mt-4 text-sm text-slate-500">Cargando productos...</p>
  if (error) return <p className="mt-4 text-sm text-red-600">{error}</p>

  return (
    <section className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">Productos ({products.length})</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o SKU..."
            className="w-full rounded-xl border border-teal-100 px-3 py-1.5 text-sm outline-none ring-teal-300 focus:ring sm:w-56"
          />
          <button
            type="button"
            onClick={() => setCreatingProduct(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-800"
          >
            + Nuevo producto
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500">
          {search ? 'Sin resultados para tu búsqueda.' : 'No hay productos. Crea el primero.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <article key={p.id} className="rounded-xl border border-teal-100 bg-teal-50/30 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {p.imagenes[0] ? (
                    <img
                      src={p.imagenes[0]}
                      alt=""
                      aria-hidden="true"
                      className="h-12 w-12 rounded-xl border border-teal-100 object-cover"
                    />
                  ) : (
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-teal-100 text-xl">
                      🎂
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{p.nombre}</p>
                    <p className="text-xs text-slate-500">
                      SKU: {p.sku} · {categoryName(p.categoria_id)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold text-teal-700">{formatMoney(p.precio)}</span>
                  {statusBadge(p)}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap justify-end gap-2">
                {confirmDeleteId === p.id ? (
                  <>
                    <span className="self-center text-xs text-slate-600">¿Eliminar este producto?</span>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="inline-flex rounded-xl border border-teal-200 px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                    >
                      No
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === p.id}
                      onClick={() => { void handleDelete(p.id) }}
                      className="inline-flex rounded-xl bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {deletingId === p.id ? 'Eliminando...' : 'Sí, eliminar'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditingProduct(p)}
                      className="inline-flex rounded-xl border border-teal-200 px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(p.id)}
                      className="inline-flex rounded-xl border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {(creatingProduct || editingProduct) && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          onClose={() => { setCreatingProduct(false); setEditingProduct(null) }}
          onSaved={(saved) => {
            if (editingProduct) onUpdated(saved.id, saved)
            else onCreated(saved)
            setCreatingProduct(false)
            setEditingProduct(null)
          }}
        />
      )}
    </section>
  )
}

// ── AdminPage ─────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, profile, profileLoaded } = useAuth()
  const [roleFromDb, setRoleFromDb] = useState<string | null>(null)
  const [roleResolved, setRoleResolved] = useState(false)
  const normalizedRole = normalizeRoleValue(profile?.rol)
  const normalizedRoleFromDb = normalizeRoleValue(roleFromDb)
  const isAdmin = normalizedRole.includes('admin') || normalizedRoleFromDb.includes('admin')
  const isModerador = normalizedRole === 'moderador' || normalizedRoleFromDb === 'moderador'
  const hasAccess = isAdmin || isModerador
  const canOpenPanel = Boolean(user)

  const [activeTab, setActiveTab] = useState<'pedidos' | 'usuarios' | 'productos'>('usuarios')

  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState('')

  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState('')

  const [products, setProducts] = useState<AdminProduct[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productsError, setProductsError] = useState('')
  const [categories, setCategories] = useState<AdminCategory[]>([])

  useEffect(() => {
    if (!user) {
      setRoleFromDb(null)
      setRoleResolved(true)
      return
    }

    let mounted = true
    setRoleResolved(false)

    const loadRole = async () => {
      const { data } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle()
      if (!mounted) return
      setRoleFromDb((data?.rol as string | undefined) ?? null)
      setRoleResolved(true)
    }

    void loadRole()

    return () => {
      mounted = false
    }
  }, [user])

  useEffect(() => {
    if (!canOpenPanel) return
    let mounted = true
    setOrdersLoading(true)
    setOrdersError('')
    fetchAllOrders()
      .then((data) => { if (mounted) setOrders(data) })
      .catch((error: unknown) => {
        if (!mounted) return
        const reason = error instanceof Error ? error.message : 'Sin detalle'
        setOrdersError(`No se pudieron cargar los pedidos. ${reason}`)
      })
      .finally(() => { if (mounted) setOrdersLoading(false) })
    return () => { mounted = false }
  }, [canOpenPanel])

  useEffect(() => {
    if (!canOpenPanel) return
    let mounted = true
    setUsersLoading(true)
    setUsersError('')
    fetchAllUsers()
      .then((data) => { if (mounted) setUsers(data) })
      .catch((error: unknown) => {
        if (!mounted) return
        const reason = error instanceof Error ? error.message : 'Sin detalle'
        setUsersError(`No se pudieron cargar los usuarios. ${reason}`)
      })
      .finally(() => { if (mounted) setUsersLoading(false) })
    return () => { mounted = false }
  }, [canOpenPanel])

  useEffect(() => {
    if (!canOpenPanel || !isAdmin || activeTab !== 'productos') return
    if (products.length > 0) return
    let mounted = true
    setProductsLoading(true)
    setProductsError('')
    Promise.all([fetchAllProducts(), fetchCategoriesForAdmin()])
      .then(([prods, cats]) => {
        if (!mounted) return
        setProducts(prods)
        setCategories(cats)
      })
      .catch((error: unknown) => {
        if (!mounted) return
        const reason = error instanceof Error ? error.message : 'Sin detalle'
        setProductsError(`No se pudieron cargar los productos. ${reason}`)
      })
      .finally(() => { if (mounted) setProductsLoading(false) })
    return () => { mounted = false }
  }, [canOpenPanel, isAdmin, activeTab, products.length])

  // Loading state before profile is known
  if (!profileLoaded || !roleResolved) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 md:px-6">
        <p className="text-sm text-slate-500">Verificando acceso...</p>
      </main>
    )
  }

  // Access guard
  if (!canOpenPanel) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-12">
      {/* Header */}
      <div className="mb-6 rounded-3xl border border-teal-100 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Panel de administración
          </h1>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${
            isAdmin ? 'bg-teal-100 text-teal-800' : 'bg-indigo-100 text-indigo-800'
          }`}>
            {profile?.rol}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">{user?.email}</p>
      </div>

      {/* Tab nav */}
      <div className="mb-6 rounded-2xl border border-teal-100 bg-white p-3 shadow-sm">
        <nav role="tablist" aria-label="Secciones del panel" className="flex gap-2">
          {(isAdmin || users.length > 0) && (
            <button
              role="tab"
              aria-selected={activeTab === 'usuarios'}
              onClick={() => setActiveTab('usuarios')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'usuarios' ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-teal-50'
              }`}
            >
              Usuarios
            </button>
          )}
          <button
            role="tab"
            aria-selected={activeTab === 'pedidos'}
            onClick={() => setActiveTab('pedidos')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'pedidos' ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-teal-50'
            }`}
          >
            Pedidos
          </button>
          {isAdmin && (
            <button
              role="tab"
              aria-selected={activeTab === 'productos'}
              onClick={() => setActiveTab('productos')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'productos' ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-teal-50'
              }`}
            >
              Productos
            </button>
          )}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'pedidos' && (
        <OrdersSection
          orders={orders}
          loading={ordersLoading}
          error={ordersError}
          onStatusChange={(id, estado) =>
            setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, estado } : o)))
          }
          onDelete={(id) => setOrders((prev) => prev.filter((o) => o.id !== id))}
        />
      )}

      {activeTab === 'usuarios' && (
        <UsersSection
          users={users}
          loading={usersLoading}
          error={usersError}
          currentUserId={user?.id ?? ''}
          onUpdated={(userId, fields) =>
            setUsers((prev) =>
              prev.map((u) => (u.id === userId ? { ...u, ...fields } as AdminUser : u)),
            )
          }
          onDeleted={(userId) => setUsers((prev) => prev.filter((u) => u.id !== userId))}
        />
      )}

      {activeTab === 'productos' && isAdmin && (
        <ProductosSection
          products={products}
          categories={categories}
          loading={productsLoading}
          error={productsError}
          onCreated={(p) => setProducts((prev) => [p, ...prev])}
          onUpdated={(id, p) =>
            setProducts((prev) => prev.map((x) => (x.id === id ? p : x)))
          }
          onDeleted={(id) => setProducts((prev) => prev.filter((x) => x.id !== id))}
        />
      )}
    </main>
  )
}

import { supabase } from '../lib/supabaseClient'

export type AdminUser = {
  id: string
  correo_electronico: string | null
  nombre_completo: string | null
  telefono: string | null
  url_avatar: string | null
  rol: 'cliente' | 'administrador' | 'personal' | 'moderador'
  creado_en: string
}

export type AdminOrderItem = {
  id: string
  nombre_producto: string
  cantidad: number
  precio_unitario: number
  dedicatoria: string | null
}

export type AdminOrder = {
  id: string
  folio: string | null
  usuario_id: string | null
  nombre_invitado: string | null
  telefono_invitado: string | null
  correo_invitado: string | null
  tipo_entrega: string
  estado: string
  subtotal: number
  costo_envio: number
  total: number
  notas: string | null
  creado_en: string
  perfiles: { nombre_completo: string | null; correo_electronico: string | null } | null
  detalle_pedidos: AdminOrderItem[]
}

// ── Usuarios ──────────────────────────────────────────────────────────────

export async function fetchAllUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('id,correo_electronico,nombre_completo,telefono,url_avatar,rol,creado_en')
    .order('creado_en', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as AdminUser[]
}

export async function updateUserProfile(
  userId: string,
  fields: { nombre_completo?: string | null; telefono?: string | null; rol?: string },
): Promise<void> {
  const { error } = await supabase.from('perfiles').update(fields).eq('id', userId)
  if (error) throw new Error(error.message)
}

export async function deleteUser(userId: string): Promise<void> {
  const { error } = await supabase.from('perfiles').delete().eq('id', userId)
  if (error) throw new Error(error.message)
}

// ── Pedidos ───────────────────────────────────────────────────────────────

export async function fetchAllOrders(): Promise<AdminOrder[]> {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*, detalle_pedidos(*)')
    .order('creado_en', { ascending: false })
  if (error) throw new Error(error.message)

  const orders = ((data ?? []) as Omit<AdminOrder, 'perfiles'>[]).map((order) => ({
    ...order,
    perfiles: null,
  }))

  const userIds = Array.from(
    new Set(
      orders
        .map((order) => order.usuario_id)
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    ),
  )

  if (userIds.length === 0) {
    return orders as AdminOrder[]
  }

  const { data: perfilesData, error: perfilesError } = await supabase
    .from('perfiles')
    .select('id,nombre_completo,correo_electronico')
    .in('id', userIds)

  if (perfilesError) throw new Error(perfilesError.message)

  const profileById = new Map(
    (perfilesData ?? []).map((perfil) => [
      perfil.id as string,
      {
        nombre_completo: (perfil.nombre_completo as string | null) ?? null,
        correo_electronico: (perfil.correo_electronico as string | null) ?? null,
      },
    ]),
  )

  return orders.map((order) => ({
    ...order,
    perfiles: order.usuario_id ? (profileById.get(order.usuario_id) ?? null) : null,
  })) as AdminOrder[]
}

export async function updateOrderStatus(orderId: string, estado: string): Promise<void> {
  const { error } = await supabase.from('pedidos').update({ estado }).eq('id', orderId)
  if (error) throw new Error(error.message)
}

export async function deleteOrder(orderId: string): Promise<void> {
  const { error: detailError } = await supabase
    .from('detalle_pedidos')
    .delete()
    .eq('pedido_id', orderId)

  if (detailError) {
    throw new Error(`No se pudo eliminar detalle_pedidos: ${detailError.message}`)
  }

  const { error: orderError } = await supabase
    .from('pedidos')
    .delete()
    .eq('id', orderId)

  if (orderError) {
    throw new Error(`No se pudo eliminar pedidos: ${orderError.message}`)
  }
}

// ── Productos ─────────────────────────────────────────────────────────────

export type AdminProduct = {
  id: string
  sku: string
  nombre: string
  categoria_id: string
  subcategoria_id: string
  descripcion: string
  precio: number
  imagenes: string[]
  porciones: string
  etiquetas: string[]
  dietas: string[]
  destacado: boolean
  disponible: boolean
  activo: boolean
  horas_preparacion: number
}

export type AdminCategory = {
  id: string
  nombre: string
  subcategorias: { id: string; nombre: string }[]
}

export async function fetchCategoriesForAdmin(): Promise<AdminCategory[]> {
  const [{ data: cats, error: catsError }, { data: subs, error: subsError }] = await Promise.all([
    supabase.from('categorias').select('id,nombre').order('nombre', { ascending: true }),
    supabase.from('subcategorias').select('id,categoria_id,nombre').order('nombre', { ascending: true }),
  ])
  if (catsError) throw new Error(catsError.message)
  if (subsError) throw new Error(subsError.message)

  const subsByCat = new Map<string, { id: string; nombre: string }[]>()
  for (const s of subs ?? []) {
    const list = subsByCat.get(s.categoria_id as string) ?? []
    list.push({ id: s.id as string, nombre: s.nombre as string })
    subsByCat.set(s.categoria_id as string, list)
  }

  return (cats ?? []).map((c) => ({
    id: c.id as string,
    nombre: c.nombre as string,
    subcategorias: subsByCat.get(c.id as string) ?? [],
  }))
}

export async function fetchAllProducts(): Promise<AdminProduct[]> {
  const { data, error } = await supabase
    .from('productos')
    .select(
      'id,sku,nombre,categoria_id,subcategoria_id,descripcion,precio,imagenes,porciones,etiquetas,dietas,destacado,disponible,activo,horas_preparacion',
    )
    .order('nombre', { ascending: true })
  if (error) throw new Error(error.message)
  return ((data ?? []) as AdminProduct[]).map((p) => ({
    ...p,
    imagenes: p.imagenes ?? [],
    etiquetas: p.etiquetas ?? [],
    dietas: p.dietas ?? [],
  }))
}

export async function createProduct(
  fields: Omit<AdminProduct, 'id'>,
): Promise<AdminProduct> {
  const { data, error } = await supabase
    .from('productos')
    .insert(fields)
    .select(
      'id,sku,nombre,categoria_id,subcategoria_id,descripcion,precio,imagenes,porciones,etiquetas,dietas,destacado,disponible,activo,horas_preparacion',
    )
    .single()
  if (error) throw new Error(error.message)
  const p = data as AdminProduct
  return {
    ...p,
    imagenes: p.imagenes ?? [],
    etiquetas: p.etiquetas ?? [],
    dietas: p.dietas ?? [],
  }
}

export async function updateProduct(
  id: string,
  fields: Partial<Omit<AdminProduct, 'id'>>,
): Promise<void> {
  const { error } = await supabase.from('productos').update(fields).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('productos').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function uploadProductImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('productos').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw new Error(error.message)
  return supabase.storage.from('productos').getPublicUrl(path).data.publicUrl
}

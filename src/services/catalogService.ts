import type { CatalogData, Category, Product } from '../types/catalog'
import { supabase } from '../lib/supabaseClient'

type CategoryRow = {
  id: string
  nombre: string
  slug: string
  emoji: string | null
  orden: number | null
}

type SubcategoryRow = {
  id: string
  categoria_id: string
  nombre: string
  slug: string
  orden: number | null
}

type ProductRow = {
  id: string
  sku: string
  nombre: string
  categoria_id: string
  subcategoria_id: string
  descripcion: string
  precio: number
  imagenes: string[] | null
  porciones: string
  etiquetas: string[] | null
  dietas: string[] | null
  destacado: boolean
  disponible: boolean
  horas_preparacion: number
}

export async function loadCatalogFromSupabase(): Promise<CatalogData> {
  const [{ data: categoriesData, error: categoriesError }, { data: subcategoriesData, error: subcategoriesError }, { data: productsData, error: productsError }] =
    await Promise.all([
      supabase.from('categorias').select('id,nombre,slug,emoji,orden').order('orden', { ascending: true }).order('nombre', { ascending: true }),
      supabase.from('subcategorias').select('id,categoria_id,nombre,slug,orden').order('orden', { ascending: true }).order('nombre', { ascending: true }),
      supabase
        .from('productos')
        .select('id,sku,nombre,categoria_id,subcategoria_id,descripcion,precio,imagenes,porciones,etiquetas,dietas,destacado,disponible,horas_preparacion')
        .eq('activo', true)
        .order('destacado', { ascending: false })
        .order('nombre', { ascending: true }),
    ])

  if (categoriesError) throw categoriesError
  if (subcategoriesError) throw subcategoriesError
  if (productsError) throw productsError

  const categoriesRows = (categoriesData ?? []) as CategoryRow[]
  const subcategoriesRows = (subcategoriesData ?? []) as SubcategoryRow[]
  const productsRows = (productsData ?? []) as ProductRow[]

  const subByCategory = new Map<string, SubcategoryRow[]>()
  for (const subcategory of subcategoriesRows) {
    const list = subByCategory.get(subcategory.categoria_id) ?? []
    list.push(subcategory)
    subByCategory.set(subcategory.categoria_id, list)
  }

  const categories: Category[] = categoriesRows.map((category) => ({
    id: category.id,
    name: category.nombre,
    slug: category.slug,
    emoji: category.emoji ?? '',
    subcategories: (subByCategory.get(category.id) ?? []).map((subcategory) => ({
      id: subcategory.id,
      name: subcategory.nombre,
      slug: subcategory.slug,
      emoji: category.emoji ?? '',
    })),
  }))

  const products: Product[] = productsRows.map((product) => ({
    id: product.id,
    sku: product.sku,
    name: product.nombre,
    categoryId: product.categoria_id,
    subcategoryId: product.subcategoria_id,
    description: product.descripcion,
    price: product.precio,
    images: product.imagenes ?? [],
    portions: product.porciones,
    tags: product.etiquetas ?? [],
    dietary: product.dietas ?? [],
    featured: product.destacado,
    inStock: product.disponible,
    prepHours: product.horas_preparacion,
  }))

  return {
    store: {
      name: 'DulceNube',
      currency: 'MXN',
      locale: 'es-MX',
    },
    categories,
    products,
  }
}

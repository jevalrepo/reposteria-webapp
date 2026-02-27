import type { CatalogData, Category, Product } from '../types/catalog'
import { supabase } from '../lib/supabaseClient'

type CategoryRow = {
  id: string
  name: string
  slug: string
  emoji: string | null
  sort_order: number | null
}

type SubcategoryRow = {
  id: string
  category_id: string
  name: string
  slug: string
  sort_order: number | null
}

type ProductRow = {
  id: string
  sku: string
  name: string
  category_id: string
  subcategory_id: string
  description: string
  price: number
  images: string[] | null
  portions: string
  tags: string[] | null
  dietary: string[] | null
  featured: boolean
  in_stock: boolean
  prep_hours: number
}

export async function loadCatalogFromSupabase(): Promise<CatalogData> {
  const [{ data: categoriesData, error: categoriesError }, { data: subcategoriesData, error: subcategoriesError }, { data: productsData, error: productsError }] =
    await Promise.all([
      supabase.from('categories').select('id,name,slug,emoji,sort_order').order('sort_order', { ascending: true }).order('name', { ascending: true }),
      supabase.from('subcategories').select('id,category_id,name,slug,sort_order').order('sort_order', { ascending: true }).order('name', { ascending: true }),
      supabase
        .from('products')
        .select('id,sku,name,category_id,subcategory_id,description,price,images,portions,tags,dietary,featured,in_stock,prep_hours')
        .eq('active', true)
        .order('featured', { ascending: false })
        .order('name', { ascending: true }),
    ])

  if (categoriesError) throw categoriesError
  if (subcategoriesError) throw subcategoriesError
  if (productsError) throw productsError

  const categoriesRows = (categoriesData ?? []) as CategoryRow[]
  const subcategoriesRows = (subcategoriesData ?? []) as SubcategoryRow[]
  const productsRows = (productsData ?? []) as ProductRow[]

  const subByCategory = new Map<string, SubcategoryRow[]>()
  for (const subcategory of subcategoriesRows) {
    const list = subByCategory.get(subcategory.category_id) ?? []
    list.push(subcategory)
    subByCategory.set(subcategory.category_id, list)
  }

  const categories: Category[] = categoriesRows.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    emoji: category.emoji ?? '🍰',
    subcategories: (subByCategory.get(category.id) ?? []).map((subcategory) => ({
      id: subcategory.id,
      name: subcategory.name,
      slug: subcategory.slug,
    })),
  }))

  const products: Product[] = productsRows.map((product) => ({
    id: product.id,
    sku: product.sku,
    name: product.name,
    categoryId: product.category_id,
    subcategoryId: product.subcategory_id,
    description: product.description,
    price: product.price,
    images: product.images ?? [],
    portions: product.portions,
    tags: product.tags ?? [],
    dietary: product.dietary ?? [],
    featured: product.featured,
    inStock: product.in_stock,
    prepHours: product.prep_hours,
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

export type Subcategory = {
  id: string
  name: string
  slug: string
  emoji: string
}

export type Category = {
  id: string
  name: string
  slug: string
  emoji: string
  subcategories: Subcategory[]
}

export type Product = {
  id: string
  sku: string
  name: string
  categoryId: string
  subcategoryId: string
  description: string
  price: number
  images: string[]
  portions: string
  tags: string[]
  dietary: string[]
  featured: boolean
  inStock: boolean
  prepHours: number
}

export type CatalogData = {
  store: {
    name: string
    currency: string
    locale: string
  }
  categories: Category[]
  products: Product[]
}


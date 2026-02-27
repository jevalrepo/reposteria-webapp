import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useCatalog } from '../../hooks/useCatalog'

function formatPrice(amount: number, locale: string, currency: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

type SortMode = 'featured' | 'price-asc' | 'price-desc' | 'faster'

export default function CategoriasPage() {
  const { catalog, loading } = useCatalog()
  const { addItem } = useCart()

  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedSubcategory, setSelectedSubcategory] = useState('all')
  const [selectedDietary, setSelectedDietary] = useState('all')
  const [sortBy, setSortBy] = useState<SortMode>('featured')
  const [priceCap, setPriceCap] = useState<number | null>(null)

  const maxPrice = useMemo(() => {
    if (!catalog || catalog.products.length === 0) return 0
    return Math.max(...catalog.products.map((product) => product.price))
  }, [catalog])

  useEffect(() => {
    if (maxPrice > 0 && priceCap === null) setPriceCap(maxPrice)
  }, [maxPrice, priceCap])

  useEffect(() => {
    setSelectedSubcategory('all')
  }, [selectedCategory])

  const categoryById = useMemo(() => {
    if (!catalog) return new Map<string, { name: string; emoji: string }>()
    return new Map(catalog.categories.map((category) => [category.id, { name: category.name, emoji: category.emoji }] as const))
  }, [catalog])

  const subcategoryById = useMemo(() => {
    if (!catalog) return new Map<string, string>()

    const entries = catalog.categories.flatMap((category) =>
      category.subcategories.map((subcategory) => [subcategory.id, subcategory.name] as const),
    )

    return new Map(entries)
  }, [catalog])

  const availableSubcategories = useMemo(() => {
    if (!catalog) return []
    if (selectedCategory === 'all') {
      return catalog.categories.flatMap((category) => category.subcategories)
    }

    const category = catalog.categories.find((entry) => entry.id === selectedCategory)
    return category ? category.subcategories : []
  }, [catalog, selectedCategory])

  const dietaryOptions = useMemo(() => {
    if (!catalog) return []
    return Array.from(new Set(catalog.products.flatMap((product) => product.dietary))).sort()
  }, [catalog])

  const filteredProducts = useMemo(() => {
    if (!catalog) return []

    const normalizedQuery = query.trim().toLowerCase()

    const filtered = catalog.products.filter((product) => {
      if (selectedCategory !== 'all' && product.categoryId !== selectedCategory) return false
      if (selectedSubcategory !== 'all' && product.subcategoryId !== selectedSubcategory) return false
      if (selectedDietary !== 'all' && !product.dietary.includes(selectedDietary)) return false
      if (priceCap !== null && product.price > priceCap) return false

      if (!normalizedQuery) return true

      const searchable = [
        product.name,
        product.description,
        product.sku,
        ...product.tags,
        subcategoryById.get(product.subcategoryId) ?? '',
      ]
        .join(' ')
        .toLowerCase()

      return searchable.includes(normalizedQuery)
    })

    switch (sortBy) {
      case 'price-asc':
        return filtered.sort((a, b) => a.price - b.price)
      case 'price-desc':
        return filtered.sort((a, b) => b.price - a.price)
      case 'faster':
        return filtered.sort((a, b) => a.prepHours - b.prepHours)
      default:
        return filtered.sort((a, b) => Number(b.featured) - Number(a.featured))
    }
  }, [catalog, priceCap, query, selectedCategory, selectedDietary, selectedSubcategory, sortBy, subcategoryById])

  const clearFilters = () => {
    setQuery('')
    setSelectedCategory('all')
    setSelectedSubcategory('all')
    setSelectedDietary('all')
    setSortBy('featured')
    setPriceCap(maxPrice)
  }

  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="mb-8 rounded-3xl border border-rose-200 bg-gradient-to-r from-rose-100 via-amber-50 to-orange-100 p-6 shadow-sm md:p-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-5xl">Categorias</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-700 md:text-base">
            Explora el catalogo por categoria, subcategoria y preferencias. Filtra rapido y encuentra justo lo que quieres ordenar.
          </p>
        </div>

        {loading || !catalog ? (
          <p className="text-sm text-slate-600">Cargando catalogo...</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="h-fit rounded-3xl border border-rose-100 bg-white p-5 shadow-sm lg:sticky lg:top-24">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Filtros</h2>
                <button onClick={clearFilters} className="text-xs font-semibold text-rose-700 hover:text-rose-800">
                  Limpiar
                </button>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Busqueda</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    type="text"
                    placeholder="Pastel, brownie, boda..."
                    className="w-full rounded-xl border border-rose-100 bg-rose-50/40 px-3 py-2 text-sm outline-none ring-rose-300 transition focus:ring"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Categoria</span>
                  <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                    className="w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm outline-none ring-rose-300 transition focus:ring"
                  >
                    <option value="all">Todas</option>
                    {catalog.categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.emoji} {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Subcategoria</span>
                  <select
                    value={selectedSubcategory}
                    onChange={(event) => setSelectedSubcategory(event.target.value)}
                    className="w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm outline-none ring-rose-300 transition focus:ring"
                  >
                    <option value="all">Todas</option>
                    {availableSubcategories.map((subcategory) => (
                      <option key={subcategory.id} value={subcategory.id}>
                        {subcategory.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Dieta</span>
                  <select
                    value={selectedDietary}
                    onChange={(event) => setSelectedDietary(event.target.value)}
                    className="w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm outline-none ring-rose-300 transition focus:ring"
                  >
                    <option value="all">Todas</option>
                    {dietaryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span>Precio maximo</span>
                    <span>{formatPrice(priceCap ?? maxPrice, catalog.store.locale, catalog.store.currency)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={maxPrice}
                    value={priceCap ?? maxPrice}
                    onChange={(event) => setPriceCap(Number(event.target.value))}
                    className="w-full accent-rose-600"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Orden</span>
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as SortMode)}
                    className="w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm outline-none ring-rose-300 transition focus:ring"
                  >
                    <option value="featured">Destacados primero</option>
                    <option value="price-asc">Precio: menor a mayor</option>
                    <option value="price-desc">Precio: mayor a menor</option>
                    <option value="faster">Entrega mas rapida</option>
                  </select>
                </label>
              </div>
            </aside>

            <div>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-700">
                  {filteredProducts.length} resultados de {catalog.products.length} productos
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {selectedCategory !== 'all' && (
                    <span className="rounded-full bg-rose-100 px-3 py-1 font-semibold text-rose-700">Categoria activa</span>
                  )}
                  {selectedSubcategory !== 'all' && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-700">Subcategoria activa</span>
                  )}
                  {selectedDietary !== 'all' && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">Dieta: {selectedDietary}</span>
                  )}
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-rose-200 bg-white p-8 text-center text-sm text-slate-600">
                  No encontramos productos con estos filtros. Prueba limpiarlos o ajustar el precio.
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredProducts.map((product) => {
                    const categoryData = categoryById.get(product.categoryId)
                    return (
                      <article
                        key={product.id}
                        className="group overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                      >
                        <div className="relative">
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="h-52 w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-slate-700">
                            {categoryData?.emoji} {subcategoryById.get(product.subcategoryId)}
                          </div>
                          {product.featured && (
                            <div className="absolute right-3 top-3 rounded-full bg-rose-600 px-2 py-1 text-xs font-bold text-white">
                              Estrella
                            </div>
                          )}
                        </div>

                        <div className="p-4">
                          <h3 className="text-base font-bold text-slate-900">{product.name}</h3>
                          <p className="mt-1 text-sm text-slate-600">{product.description}</p>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span className="rounded-full bg-slate-100 px-2 py-1">{product.portions}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-1">{product.prepHours} hrs</span>
                            {product.dietary.map((diet) => (
                              <span key={diet} className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
                                {diet}
                              </span>
                            ))}
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-2">
                            <p className="text-lg font-black text-rose-700">
                              {formatPrice(product.price, catalog.store.locale, catalog.store.currency)}
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  addItem({
                                    productId: product.id,
                                    name: product.name,
                                    image: product.images[0],
                                    unitPrice: product.price,
                                  })
                                }
                                className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                              >
                                Agregar
                              </button>
                              <Link
                                to={`/producto/${product.id}`}
                                className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
                              >
                                Ver detalle
                              </Link>
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

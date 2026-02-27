import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type CartItem = {
  id: string
  productId: string
  name: string
  image: string
  unitPrice: number
  quantity: number
  dedication?: string
}

type AddCartItemInput = {
  productId: string
  name: string
  image: string
  unitPrice: number
  quantity?: number
  dedication?: string
}

type CartContextValue = {
  items: CartItem[]
  totalItems: number
  totalAmount: number
  addItem: (input: AddCartItemInput) => void
  removeItem: (id: string) => void
  setItemQuantity: (id: string, quantity: number) => void
  clearCart: () => void
}

const CART_STORAGE_KEY = 'dulcenube_cart_v1'

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as CartItem[]
      setItems(Array.isArray(parsed) ? parsed : [])
    } catch {
      setItems([])
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addItem = (input: AddCartItemInput) => {
    const quantity = Math.max(1, input.quantity ?? 1)
    const dedication = input.dedication?.trim() ?? ''
    const cartKey = `${input.productId}::${dedication}`

    setItems((current) => {
      const existing = current.find((entry) => entry.id === cartKey)
      if (existing) {
        return current.map((entry) =>
          entry.id === cartKey
            ? { ...entry, quantity: Math.min(50, entry.quantity + quantity) }
            : entry,
        )
      }

      return [
        ...current,
        {
          id: cartKey,
          productId: input.productId,
          name: input.name,
          image: input.image,
          unitPrice: input.unitPrice,
          quantity,
          dedication: dedication || undefined,
        },
      ]
    })
  }

  const removeItem = (id: string) => {
    setItems((current) => current.filter((entry) => entry.id !== id))
  }

  const setItemQuantity = (id: string, quantity: number) => {
    const safeQuantity = Math.max(1, Math.min(50, quantity))
    setItems((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, quantity: safeQuantity } : entry,
      ),
    )
  }

  const clearCart = () => setItems([])

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  )

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [items],
  )

  const value: CartContextValue = {
    items,
    totalItems,
    totalAmount,
    addItem,
    removeItem,
    setItemQuantity,
    clearCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart debe usarse dentro de CartProvider')
  }
  return ctx
}

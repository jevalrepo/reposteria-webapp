// src/components/HeroBillboard.tsx
// Hero “billboard” sin navbar — Tailwind v4
// Fondo de imagen full-bleed, overlay oscuro, título, texto y CTA centrados.

type Props = {
  imageUrl?: string
  title?: string
  subtitle?: string
  ctaText?: string
  onCtaClick?: () => void
}

export default function HeroBillboard({
  imageUrl = 'https://images.unsplash.com/photo-1519337265831-281ec6cc8514?q=80&w=1920&auto=format&fit=crop',
  title = 'New arrivals are here',
  subtitle = `The new arrivals have, well, newly arrived. Check out the latest options from our
summer small-batch release while they're still in stock.`,
  ctaText = 'Shop New Arrivals',
  onCtaClick,
}: Props) {
  return (
    <section className="relative isolate">
      {/* Imagen de fondo */}
      <img src={imageUrl} alt="" className="h-[56vh] w-full object-cover md:h-[70vh] lg:h-[78vh]" />

      {/* Overlay para legibilidad */}
      <div className="pointer-events-none absolute inset-0 bg-slate-900/55" />

      {/* Contenido centrado */}
      <div className="absolute inset-0 grid place-items-center">
        <div className="mx-auto max-w-3xl px-4 text-center md:max-w-4xl">
          <h1 className="text-balance text-4xl font-extrabold leading-tight tracking-tight text-white md:text-6xl lg:text-7xl">
            {title}
          </h1>

          <p className="mt-4 text-pretty text-base/7 text-white/85 md:mt-6 md:text-lg/8">
            {subtitle}
          </p>

          <div className="mt-8">
            <button
              onClick={onCtaClick}
              className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg ring-1 ring-white/40 transition hover:translate-y-[-1px] hover:shadow-xl active:translate-y-0"
            >
              {ctaText}
            </button>
          </div>
        </div>
      </div>

      {/* Borde suave siguiendo la referencia */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent" />
    </section>
  )
}

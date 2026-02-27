type Props = {
  imageUrl?: string
  title?: string
  subtitle?: string
  ctaText?: string
  onCtaClick?: () => void
}

export default function FrontImage({
  imageUrl = 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?q=80&w=1920&auto=format&fit=crop',
  title = 'Reposteria artesanal para cada momento',
  subtitle = 'Pasteles, cupcakes y galletas hechos al momento con ingredientes frescos y decoracion personalizada.',
  ctaText = 'Ordenar ahora',
  onCtaClick,
}: Props) {
  return (
    <section className="relative isolate overflow-hidden">
      <img src={imageUrl} alt="Mesa con postres" className="h-[60vh] w-full object-cover md:h-[72vh]" />
      <div className="absolute inset-0 bg-gradient-to-r from-rose-900/75 via-rose-900/55 to-amber-800/50" />

      <div className="absolute inset-0 mx-auto grid max-w-6xl place-items-center px-4 md:px-6">
        <div className="max-w-2xl text-left text-white">
          <p className="mb-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest">
            Tienda online
          </p>
          <h1 className="text-4xl font-black leading-tight md:text-6xl">{title}</h1>
          <p className="mt-4 text-base text-rose-50 md:text-lg">{subtitle}</p>
          <button
            onClick={onCtaClick}
            className="mt-8 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-50"
          >
            {ctaText}
          </button>
        </div>
      </div>
    </section>
  )
}

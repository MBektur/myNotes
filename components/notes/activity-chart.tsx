"use client"

import { t } from "@/lib/i18n"

type Point = { weekday: number; count: number; today?: boolean }

/** Bağımlılıksız SVG alan grafiği. RTL: ilk gün sağda; y ekseni yazıları başta. */
export function ActivityChart({ data, peakLabel }: { data: Point[]; peakLabel?: boolean }) {
  const W = 700
  const H = 220
  const top = 14
  const bottom = 6
  const max = Math.max(4, ...data.map((d) => d.count))
  const niceMax = Math.ceil(max / 4) * 4
  const slot = W / data.length
  const pts = data.map((d, i) => ({
    x: W - (i + 0.5) * slot, // aynalanmış: ilk gün sağda
    y: H - bottom - (d.count / niceMax) * (H - top - bottom),
    count: d.count,
  }))
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ")
  const area = `${line} L${pts[pts.length - 1].x},${H - bottom} L${pts[0].x},${H - bottom} Z`
  const peak = pts.reduce((a, b) => (b.count > a.count ? b : a), pts[0])
  const ticks = [0, 1, 2, 3, 4].map((i) => (niceMax / 4) * i)

  return (
    <div className="flex gap-2" dir="rtl">
      <div className="relative h-52 w-7 shrink-0 text-[11px] text-muted-foreground">
        {ticks.map((v) => (
          <span
            key={v}
            className="absolute start-0 -translate-y-1/2"
            style={{ top: `${((H - bottom - (v / niceMax) * (H - top - bottom)) / H) * 100}%` }}
          >
            {v}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-52 w-full" preserveAspectRatio="none" role="img" aria-label={t.dashboard.activity}>
            <defs>
              <linearGradient id="act-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.72 0.14 295)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="oklch(0.72 0.14 295)" stopOpacity="0.04" />
              </linearGradient>
            </defs>
            {ticks.map((v) => {
              const y = H - bottom - (v / niceMax) * (H - top - bottom)
              return <line key={v} x1={0} x2={W} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.1" vectorEffect="non-scaling-stroke" />
            })}
            <path d={area} fill="url(#act-fill)" />
            <path d={line} fill="none" stroke="oklch(0.62 0.17 295)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
          {/* Noqtilar SVG sirtida (ellips bolup qalmasliqi üchün HTML) */}
          {pts.map((p, i) => (
            <span
              key={i}
              className="absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-violet-500 shadow"
              style={{ left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%` }}
            />
          ))}
          {peakLabel && peak.count > 0 && (
            <span
              className="absolute -translate-x-1/2 -translate-y-[170%] whitespace-nowrap rounded-xl bg-violet-100 px-3 py-1 text-xs text-violet-700 shadow-sm dark:bg-violet-900/70 dark:text-violet-100"
              style={{ left: `${Math.min(88, Math.max(12, (peak.x / W) * 100))}%`, top: `${(peak.y / H) * 100}%` }}
            >
              {t.dashboard.great}
            </span>
          )}
        </div>
        <div className="mt-1 flex text-xs text-muted-foreground">
          {data.map((d, i) => (
            <span key={i} className="flex-1 text-center">{t.dashboard.days[d.weekday]}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

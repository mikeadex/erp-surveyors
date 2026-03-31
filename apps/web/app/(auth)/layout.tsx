const authHighlights = [
  { icon: '⚡', title: 'Case execution', text: 'Track intake, fieldwork, review, and billing in one operating flow.' },
  { icon: '📐', title: 'Evidence engine', text: 'Build firm-owned comparable evidence and reuse it across valuations.' },
  { icon: '📋', title: 'Report delivery', text: 'Generate, review, issue, and export compliant valuation reports.' },
  { icon: '🏛️', title: 'Practice aligned', text: 'Designed around Nigerian valuation and ESVARBON-style working discipline.' },
]

const authPanelBackground = `url("data:image/svg+xml,${encodeURIComponent(`
<svg width="1200" height="1600" viewBox="0 0 1200 1600" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="1600" fill="#0F172A"/>
  <g opacity="0.12" stroke="#F8FAFC">
    <path d="M0 220H1200"/>
    <path d="M0 420H1200"/>
    <path d="M0 620H1200"/>
    <path d="M0 820H1200"/>
    <path d="M0 1020H1200"/>
    <path d="M0 1220H1200"/>
    <path d="M0 1420H1200"/>
    <path d="M170 0V1600"/>
    <path d="M410 0V1600"/>
    <path d="M650 0V1600"/>
    <path d="M890 0V1600"/>
  </g>
  <g opacity="0.18" stroke="#86EFAC" stroke-width="2">
    <path d="M86 1192C176 1128 258 1122 350 1080C436 1040 516 966 612 940C694 918 768 934 848 902C934 868 1012 790 1110 760"/>
    <path d="M80 1288C178 1240 252 1218 344 1186C428 1158 520 1092 612 1064C702 1036 780 1044 866 1010C944 980 1032 920 1112 880"/>
  </g>
  <g opacity="0.22" fill="#E2E8F0">
    <rect x="130" y="1060" width="92" height="360" rx="10"/>
    <rect x="252" y="988" width="132" height="432" rx="12"/>
    <rect x="416" y="930" width="96" height="490" rx="12"/>
    <rect x="544" y="860" width="164" height="560" rx="16"/>
    <rect x="742" y="1018" width="120" height="402" rx="12"/>
    <rect x="892" y="942" width="150" height="478" rx="14"/>
  </g>
</svg>
`)}")`

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div
        className="relative hidden flex-1 overflow-hidden lg:flex lg:min-h-screen"
        style={{
          backgroundColor: '#0f172a',
          backgroundImage: `
            radial-gradient(circle at top left, rgba(34, 197, 94, 0.32), transparent 28%),
            radial-gradient(circle at 88% 14%, rgba(14, 165, 233, 0.18), transparent 26%),
            linear-gradient(180deg, rgba(15, 23, 42, 0.5), rgba(15, 23, 42, 0.84)),
            ${authPanelBackground}
          `,
          backgroundSize: 'auto, auto, auto, cover',
          backgroundPosition: 'top left, top right, center, center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/6 via-transparent to-transparent" />
        <div className="absolute inset-y-10 left-10 w-px bg-white/10" />
        <div className="absolute bottom-18 right-14 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative z-10 flex min-h-screen w-full flex-col justify-between px-14 py-12">
          <div className="max-w-xl">
            <div className="mb-14 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/90 shadow-lg shadow-brand-950/30 ring-1 ring-white/15">
                <svg className="h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
              </div>
              <div>
                <span className="block text-sm font-semibold tracking-[0.18em] text-white/70">VALUCORE AFRICA</span>
                <span className="block text-base font-semibold text-white">For Nigerian valuation teams</span>
              </div>
            </div>

            <div className="inline-flex items-center rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-100/90 backdrop-blur-md">
              Built for practice operations
            </div>

            <h2 className="mt-8 max-w-lg text-5xl font-black leading-[1.02] tracking-[-0.04em] text-white">
              Professional valuation software shaped for modern Nigerian practice.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-200/78">
              Run client intake, inspections, evidence, reporting, finance, and branch operations from one connected workflow without losing rigor.
            </p>

            <div className="mt-10 grid max-w-2xl grid-cols-3 gap-4">
              <div className="rounded-3xl border border-white/12 bg-white/8 px-5 py-4 backdrop-blur-md">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-white/55">Coverage</p>
                <p className="mt-3 text-2xl font-black text-white">A-L</p>
                <p className="mt-1 text-sm text-slate-200/72">Core workflow modules live</p>
              </div>
              <div className="rounded-3xl border border-white/12 bg-white/8 px-5 py-4 backdrop-blur-md">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-white/55">Field ready</p>
                <p className="mt-3 text-2xl font-black text-white">Web + Mobile</p>
                <p className="mt-1 text-sm text-slate-200/72">Office and on-site execution</p>
              </div>
              <div className="rounded-3xl border border-white/12 bg-white/8 px-5 py-4 backdrop-blur-md">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-white/55">Output</p>
                <p className="mt-3 text-2xl font-black text-white">PDF</p>
                <p className="mt-1 text-sm text-slate-200/72">Reports and finance lifecycle</p>
              </div>
            </div>
          </div>

          <div className="grid max-w-3xl grid-cols-2 gap-4">
            {authHighlights.map(({ icon, title, text }) => (
              <div key={title} className="rounded-[2rem] border border-white/12 bg-white/8 p-5 backdrop-blur-md">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-lg shadow-inner shadow-white/6 ring-1 ring-white/8">
                    {icon}
                  </div>
                  <div>
                    <p className="text-lg font-bold tracking-[-0.02em] text-white">{title}</p>
                    <p className="mt-1.5 text-sm leading-6 text-slate-200/72">{text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-end justify-between gap-6 border-t border-white/10 pt-6">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-white/50">Operating focus</p>
              <p className="mt-2 text-sm leading-6 text-slate-200/72">
                Intake quality, field evidence, reviewer confidence, finance visibility, and branch control.
              </p>
            </div>
            <p className="shrink-0 text-xs text-slate-400/80">© {new Date().getFullYear()} ValuCore Africa · Made for Nigeria</p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-white px-6 py-12 lg:bg-[linear-gradient(180deg,#ffffff_0%,#f8fbf7_100%)]">
        {/* Mobile-only logo */}
        <div className="flex lg:hidden items-center gap-2 mb-8">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600">
            <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900">ValuCore Africa</span>
        </div>
        {children}
      </div>
    </div>
  )
}

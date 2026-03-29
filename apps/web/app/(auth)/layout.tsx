export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-1 flex-col justify-between bg-slate-900 px-14 py-12">
        {/* Logo */}
        <div>
          <div className="flex items-center gap-2.5 mb-12">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </div>
            <span className="text-white font-semibold text-base tracking-tight">Valuation OS</span>
          </div>

          <h2 className="text-2xl font-bold text-white leading-snug">
            Professional valuation<br />software built for<br />Nigerian practice.
          </h2>
          <p className="mt-4 text-sm text-slate-400 leading-relaxed">
            Manage cases, inspections, comparables, and reports — all in one platform.
          </p>

          <ul className="mt-10 space-y-4">
            {[
              { icon: '⚡', text: 'End-to-end case management' },
              { icon: '📐', text: 'Comparable evidence engine' },
              { icon: '📋', text: 'Automated report generation' },
              { icon: '🏛️', text: 'ESVARBON-compliant workflows' },
            ].map(({ icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-base">{icon}</span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-slate-600">
          © {new Date().getFullYear()} Valuation OS · Made for Nigeria
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col justify-center items-center bg-white px-6 py-12 overflow-y-auto">
        {/* Mobile-only logo */}
        <div className="flex lg:hidden items-center gap-2 mb-8">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600">
            <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900">Valuation OS</span>
        </div>
        {children}
      </div>
    </div>
  )
}

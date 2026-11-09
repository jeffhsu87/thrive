export default function PageHeader({ eyebrow, title, children, actions }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {children && <p className="subtitle">{children}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

/** Labelled number with optional delta and info. */
export function Stat({ label, value, unit, sub, info, children, tone }) {
  return (
    <div className={'stat' + (tone ? ` tone-${tone}` : '')}>
      <span className="stat-label">{label}{info}</span>
      <span className="stat-value">
        {value}
        {unit && <small> {unit}</small>}
      </span>
      {sub && <span className="stat-sub">{sub}</span>}
      {children}
    </div>
  )
}

export function Empty({ title, children, action }) {
  return (
    <div className="empty-state">
      <p className="empty-title">{title}</p>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

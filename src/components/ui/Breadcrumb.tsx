import Link from "next/link";

interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  crumbs: Crumb[];
  backHref?: string;
  backLabel?: string;
}

export function Breadcrumb({ crumbs, backHref, backLabel = "Back" }: BreadcrumbProps) {
  const back = backHref ?? (crumbs.length > 1 ? crumbs[crumbs.length - 2].href : "/");

  return (
    <div className="crumbbar">
      {back && (
        <Link href={back} className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 11 }}>
          ‹ {backLabel}
        </Link>
      )}
      <nav className="crumbs" aria-label="Breadcrumb">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span style={{ color: "var(--line)" }}>/</span>}
            {crumb.href && i < crumbs.length - 1 ? (
              <Link href={crumb.href}>{crumb.label}</Link>
            ) : (
              <span className="current">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
    </div>
  );
}

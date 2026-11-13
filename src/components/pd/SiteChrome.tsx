import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  const nav = [
    { to: "/match", label: "Find space" },
    { to: "/results", label: "Explore" },
    { to: "/viability", label: "Viability Lab" },
    { to: "/owners", label: "List your property" },
  ] as const;
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5">
        <Link to="/" className="flex items-baseline gap-1.5">
          <span className="font-display text-xl font-semibold tracking-tight">PopUp</span>
          <span className="eyebrow !text-primary">Detroit</span>
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto text-sm">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="whitespace-nowrap rounded-md px-3 py-2 text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "!text-foreground font-medium" }}>
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-10 text-sm text-muted-foreground md:flex-row md:justify-between">
        <p className="font-display text-base text-foreground">The next great Detroit business might just need one weekend.</p>
        <div className="flex gap-5">
          <Link to="/admin/import" className="hover:text-foreground">Data import</Link>
          <span>Listings link to their original sources.</span>
        </div>
      </div>
    </footer>
  );
}

const COMPANIES = [
  "Nexora", "Vertex Labs", "Bluepeak", "Northwind", "Cascade Digital", "Orbit Systems", "Solstice Health", "Meridian Group",
];

export function TrustedCompanies() {
  return (
    <section className="border-y border-border bg-secondary/30 py-10">
      <div className="container">
        <p className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Trusted by fast-growing hiring teams
        </p>
        <div className="mt-6 grid grid-cols-2 gap-8 sm:grid-cols-4 lg:grid-cols-8">
          {COMPANIES.map((name) => (
            <div
              key={name}
              className="flex items-center justify-center text-sm font-semibold text-muted-foreground/60 grayscale transition hover:text-foreground hover:grayscale-0"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

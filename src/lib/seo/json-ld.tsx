/**
 * Renders a JSON-LD structured-data block. dangerouslySetInnerHTML is safe
 * here specifically because the payload is always our own serialized data
 * object (never user-supplied HTML) -- this is Next.js's own documented
 * pattern for injecting structured data.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

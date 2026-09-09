/**
 * Renders a JSON-LD block.
 *
 * The payload is serialised with `<` escaped so a product name containing a
 * script tag cannot break out of the element.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}

/** Emit a JSON-LD <script> for SEO/GEO. Server component; data is trusted (our own builders). */
export default function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

import type { ProductMediaAsset } from "@/lib/products";
/** Only approved real footage belongs here. Pending media is explicitly labelled. */
export function ProductMedia({ media }: { media: ProductMediaAsset | null }) {
  if (!media) return <div className="product-media media-pending"><span className="mono">Demonstration</span><p><strong>No approved footage available.</strong>Product media will appear here after source review and owner approval. The label artwork is not gameplay.</p></div>;
  return <figure className="product-media"><video controls playsInline preload="none" poster={media.poster} aria-label={media.caption}><source src={media.src} type="video/mp4"/><track kind="captions" src={media.captionsSrc} srcLang="en" label="English" default/><a href={media.src}>Open the product demonstration</a></video><figcaption>{media.caption}</figcaption></figure>;
}

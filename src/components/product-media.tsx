import type { ProductMediaAsset } from "@/lib/products";

/** Only approved real footage belongs here; absent media reserves no blank space. */
export function ProductMedia({ media }: { media: ProductMediaAsset | null }) {
  if (!media) return null;
  return <figure className="product-media">
    <video controls playsInline preload="none" poster={media.poster} aria-label={media.caption}>
      <source src={media.src} type="video/mp4"/>
      <track kind="captions" src={media.captionsSrc} srcLang="en" label="English" default/>
      <a href={media.src}>Open the product demonstration</a>
    </video>
    <figcaption>{media.caption}</figcaption>
  </figure>;
}

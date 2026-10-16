import Image from "next/image";
/** A studio render of the exact Blender asset, not the supplied concept image. */
export function ArtifactPoster() {
  return <Image className="artifact-poster" src="/images/inkz-rings-poster.webp" alt="" fill sizes="(max-width:767px) 90vw, 50vw" preload/>;
}

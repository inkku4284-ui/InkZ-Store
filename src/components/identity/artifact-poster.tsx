import Image from "next/image";
import poster from "../../../public/images/inkz-rings-poster.webp";
/** A studio render of the exact Blender asset, not the supplied concept image. */
export function ArtifactPoster() {
  return <Image className="artifact-poster" src={poster} alt="" fill sizes="(max-width:767px) 90vw, 50vw" preload/>;
}

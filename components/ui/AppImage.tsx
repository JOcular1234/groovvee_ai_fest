import Image, { type ImageProps } from "next/image";

// Drop-in replacement for next/image for admin-entered image URLs. Remote
// https images are rendered unoptimized (the browser fetches them straight
// from their host) so /_next/image never proxies arbitrary third-party URLs —
// next.config.ts deliberately allows no remotePatterns. Local /public paths
// still go through the optimizer.
export default function AppImage({ alt, unoptimized, ...props }: ImageProps) {
  const remote = typeof props.src === "string" && /^https?:\/\//i.test(props.src);
  return <Image {...props} alt={alt} unoptimized={unoptimized ?? remote} />;
}

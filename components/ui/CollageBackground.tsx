// Tiled groovvee collage + light mute, used as each section's own bright
// background. Parent must be `relative` (usually `relative overflow-hidden`).
export function CollageBackground({
  mute = "bg-white/80",
}: {
  mute?: string;
}) {
  return (
    <>
      <div
        className="absolute inset-0 bg-[url('/groovvee-background.jpeg')] bg-repeat bg-[length:440px] sm:bg-[length:620px] xl:bg-[length:760px]"
        aria-hidden
      />
      <div className={`absolute inset-0 ${mute}`} aria-hidden />
    </>
  );
}

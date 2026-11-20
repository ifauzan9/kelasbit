import Image from "next/image";

export function KelasbitLogo({
  className = "h-10 w-10",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/kelasbit-icon.png"
      alt="Logo KelasBit"
      width={256}
      height={256}
      priority={priority}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}

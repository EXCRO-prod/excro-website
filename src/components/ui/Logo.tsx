import Image from "next/image";

interface LogoProps {
  className?: string;
  priority?: boolean;
}

export function Logo({ className = "h-9 w-auto md:h-10", priority = false }: LogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="EXCRO"
      width={170}
      height={40}
      className={className}
      priority={priority}
    />
  );
}

import { Link } from "wouter";

interface LogoProps {
  variant?: "light" | "dark";
}

// Named export
export function Logo({ variant = "dark" }: LogoProps) {
  return (
    <Link href="/">
      <div className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity">
        {/* Logo Image */}
        <img 
          src="/images/logo.png" 
          alt="Picture Perfect TV Install" 
          className="h-12 w-12 object-contain rounded-full bg-white border-2 border-white shadow-sm"
        />

        {/* Text Logo */}
        <div className="flex flex-col leading-none justify-center">
          {/* Top Line: Picture Perfect */}
          <span className={`font-extrabold text-lg tracking-tight ${variant === 'light' ? 'text-white drop-shadow-md' : 'text-slate-900'}`}>
            Picture Perfect
          </span>
          
          {/* Bottom Line: TV (Red) Installation (Blue) */}
          <div className="text-[11px] font-black tracking-widest uppercase flex gap-1 mt-0.5">
             <span className="text-red-500 drop-shadow-sm">TV</span>
             <span className="text-blue-500 drop-shadow-sm">INSTALL</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Default export
export default Logo;
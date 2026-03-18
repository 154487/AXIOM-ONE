export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-axiom-bg px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <span className="text-white font-bold text-xl tracking-wide">AXIOM ONE</span>
        </div>
        {children}
      </div>
    </div>
  );
}

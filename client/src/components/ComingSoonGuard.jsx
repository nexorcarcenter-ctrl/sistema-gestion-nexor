import { useState, useEffect } from "react";
import User from "@/entities/User";
import { Lock } from "lucide-react";

export default function ComingSoonGuard({ children }) {
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    User.me().then(u => setIsAdmin(u?.role === "admin")).catch(() => setIsAdmin(false));
  }, []);

  if (isAdmin === null) return null;
  if (isAdmin) return children;

  return (
    <div className="relative min-h-[70vh]">
      <div className="blur-sm pointer-events-none select-none opacity-50">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl p-10 text-center max-w-sm mx-4">
          <div className="w-16 h-16 bg-[#0D0D0F] rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Lock className="h-8 w-8 text-[#CCFF00]" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Próximamente</h2>
          <p className="text-slate-500 text-sm">
            Esta sección estará disponible pronto.
          </p>
        </div>
      </div>
    </div>
  );
}

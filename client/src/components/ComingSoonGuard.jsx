import { useState, useEffect } from "react";
import User from "@/entities/User";
import { puede } from "@/permissions";
import { Lock } from "lucide-react";

/**
 * Tapa una sección con el cartel de "Próximamente".
 *
 * Sirve para dos cosas distintas que se ven igual: módulos a medio terminar
 * y módulos terminados que todavía no se le habilitan a todos. Cuál de las
 * dos aplica lo decide el permiso que se le pase.
 */
export default function ComingSoonGuard({ children, permiso = "verModulosEnConstruccion" }) {
  const [habilitado, setHabilitado] = useState(null);

  useEffect(() => {
    User.me()
      .then((u) => setHabilitado(puede(u?.role, permiso)))
      .catch(() => setHabilitado(false));
  }, [permiso]);

  if (habilitado === null) return null;
  if (habilitado) return children;

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

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import User from "@/entities/User";


export default function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await User.login(form.username, form.password);
      window.location.href = "/";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#0D0D0F" }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-8">
          <img src="/nexor-logo.svg" alt="Nexor" className="h-10 w-auto" />
          <p className="text-slate-400 text-xs">Sistema de gestión</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-xl">
          <h2 className="font-semibold text-lg mb-4" style={{ color: "#0D0D0F" }}>
            Iniciar sesión
          </h2>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>
          )}

          <form onSubmit={handle} className="space-y-3">
            <input
              type="text"
              placeholder="Usuario"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white rounded-lg py-2 text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ backgroundColor: "#E8461E" }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = "#c73a15"}
              onMouseOut={e => e.currentTarget.style.backgroundColor = "#E8461E"}
            >
              {loading ? "Cargando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { CashRegister } from "@/entities/CashRegister";

const CashRegisterContext = createContext(null);

export function CashRegisterProvider({ children }) {
  const [openRegister, setOpenRegister] = useState(null);   // caja abierta HOY
  const [prevOpenRegister, setPrevOpenRegister] = useState(null); // caja abierta de dia anterior
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const refresh = useCallback(async () => {
    try {
      const registers = await CashRegister.filter({ status: "open" }, "-opened_at", 10);
      const normalizeDate = (d) => d ? d.split("T")[0] : null;
      setOpenRegister(registers.find(r => normalizeDate(r.date) === today) || null);
      setPrevOpenRegister(registers.find(r => normalizeDate(r.date) !== today) || null);
    } catch {
      // si falla el fetch (ej: no hay token aun) no bloquear
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <CashRegisterContext.Provider value={{ openRegister, prevOpenRegister, loading, refresh }}>
      {children}
    </CashRegisterContext.Provider>
  );
}

export function useCashRegister() {
  return useContext(CashRegisterContext);
}

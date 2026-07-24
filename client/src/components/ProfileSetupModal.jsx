import { useState } from "react";
import User from "@/entities/User";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench } from "lucide-react";

export default function ProfileSetupModal({ onComplete }) {
  const [fullName, setFullName] = useState("");
  const [cargo, setCargo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim() || !cargo) return;
    setLoading(true);
    await User.update({ fullName: fullName.trim(), cargo });
    setLoading(false);
    onComplete();
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <DialogTitle className="text-lg">Bienvenido al sistema</DialogTitle>
          </div>
          <p className="text-sm text-slate-500">Completá tu perfil para continuar.</p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Nombre completo *</Label>
            <Input
              id="fullName"
              placeholder="Ej: Juan Pérez"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cargo">Cargo *</Label>
            <Select value={cargo} onValueChange={setCargo}>
              <SelectTrigger id="cargo">
                <SelectValue placeholder="Seleccioná tu cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mecanico">Mecánico</SelectItem>
                <SelectItem value="recepcionista">Recepcionista</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full bg-orange-600 hover:bg-orange-700"
            onClick={handleSave}
            disabled={!fullName.trim() || !cargo || loading}
          >
            {loading ? "Guardando..." : "Guardar y continuar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
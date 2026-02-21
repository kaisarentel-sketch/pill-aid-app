import { useState, useRef } from "react";
import { Camera, Loader2, Pill, Trash2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Medication {
  id: string;
  name: string;
  active_ingredient: string;
  expiration_date: string;
  quantity: string;
}

interface MedFormData {
  name: string;
  active_ingredient: string;
  expiration_date: string;
  quantity: string;
}

const Index = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [pendingMed, setPendingMed] = useState<MedFormData | null>(null);
  const [formData, setFormData] = useState<MedFormData>({ name: "", active_ingredient: "", expiration_date: "", quantity: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: medications = [], isLoading } = useQuery({
    queryKey: ["medications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Medication[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (med: MedFormData) => {
      const { error } = await supabase.from("medications").insert(med);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      toast.success(`${formData.name} lisatud!`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...med }: { id: string } & MedFormData) => {
      const { error } = await supabase.from("medications").update(med).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      toast.success("Ravim uuendatud!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("medications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["medications"] }),
  });

  const handleCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setIsAnalyzing(true);
    try {
      // Compress image to max 800px and JPEG quality 0.7
      const base64 = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxSize = 800;
          let w = img.width, h = img.height;
          if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else { w = Math.round(w * maxSize / h); h = maxSize; }
          }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });

      const { data, error } = await supabase.functions.invoke("analyze-medication", {
        body: { imageBase64: base64 },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const detected: MedFormData = {
        name: data.name,
        active_ingredient: data.active_ingredient,
        expiration_date: "",
        quantity: "",
      };
      setFormData(detected);
      setPendingMed(detected);
    } catch (err: any) {
      console.error("Analysis error:", err);
      toast.error("Ravimi tuvastamine ebaõnnestus. Proovi uuesti.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openEditDialog = (med: Medication) => {
    setEditingMed(med);
    setFormData({ name: med.name, active_ingredient: med.active_ingredient, expiration_date: med.expiration_date, quantity: med.quantity });
  };

  const handleDialogSave = () => {
    if (!formData.name.trim() || !formData.active_ingredient.trim() || !formData.expiration_date.trim()) {
      toast.error("Kõik väljad peavad olema täidetud");
      return;
    }
    if (editingMed) {
      updateMutation.mutate({ id: editingMed.id, ...formData });
      setEditingMed(null);
    } else if (pendingMed) {
      addMutation.mutate(formData);
      setPendingMed(null);
    }
  };

  const handleManualAdd = () => {
    setFormData({ name: "", active_ingredient: "", expiration_date: "", quantity: "" });
    setPendingMed({ name: "", active_ingredient: "", expiration_date: "", quantity: "" });
  };

  const handleDialogClose = () => {
    setEditingMed(null);
    setPendingMed(null);
  };

  const isDialogOpen = !!editingMed || !!pendingMed;
  const dialogTitle = editingMed ? "Muuda ravimit" : (pendingMed?.name ? "Kinnita tuvastatud ravim" : "Lisa ravim käsitsi");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-4 shadow-sm">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <Pill className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">MedInventar</h1>
            <p className="text-xs text-muted-foreground">Ravimite haldamine</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="flex gap-3">
          <Button
            onClick={handleCapture}
            disabled={isAnalyzing}
            className="flex-1 h-14 text-base font-semibold gap-3 rounded-2xl shadow-md"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                AI analüüsib...
              </>
            ) : (
              <>
                <Camera className="h-5 w-5" />
                Pildista ravimit
              </>
            )}
          </Button>
          <Button
            onClick={handleManualAdd}
            variant="outline"
            className="h-14 px-5 rounded-2xl shadow-sm gap-2 font-semibold"
            size="lg"
          >
            <Plus className="h-5 w-5" />
            Lisa manuaalselt
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex gap-3">
          <div className="flex-1 rounded-2xl bg-card border border-border p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-primary">{medications.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Ravimeid kokku</p>
          </div>
          <div className="flex-1 rounded-2xl bg-card border border-border p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-destructive">
              {medications.filter((m) => {
                const [month, year] = m.expiration_date.split("/").map(Number);
                return new Date(year, month - 1) < new Date();
              }).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Aegunud</p>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-accent/50 hover:bg-accent/50">
                <TableHead className="text-accent-foreground font-semibold text-xs uppercase tracking-wider">Ravimi nimi</TableHead>
                <TableHead className="text-accent-foreground font-semibold text-xs uppercase tracking-wider">Toimeaine</TableHead>
                <TableHead className="text-accent-foreground font-semibold text-xs uppercase tracking-wider text-center">Kogus</TableHead>
                <TableHead className="text-accent-foreground font-semibold text-xs uppercase tracking-wider text-right">Säilib kuni</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Laadin...
                  </TableCell>
                </TableRow>
              ) : medications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    Ravimeid pole veel lisatud
                  </TableCell>
                </TableRow>
              ) : (
                medications.map((med) => {
                  const [month, year] = med.expiration_date.split("/").map(Number);
                  const isExpired = new Date(year, month - 1) < new Date();
                  return (
                    <TableRow key={med.id} className="group">
                      <TableCell className="font-medium text-foreground">{med.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm italic">{med.active_ingredient}</TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">{med.quantity || "–"}</TableCell>
                      <TableCell className={`text-right font-mono text-sm ${isExpired ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                        {med.expiration_date}
                      </TableCell>
                      <TableCell className="w-20 p-1">
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity active:opacity-100">
                          <button
                            onClick={() => openEditDialog(med)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                            aria-label={`Muuda ${med.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(med.id)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            aria-label={`Kustuta ${med.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) handleDialogClose(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="med-name">Ravimi nimi</Label>
              <Input
                id="med-name"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                placeholder="nt Paracetamol"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="med-ingredient">Toimeaine</Label>
              <Input
                id="med-ingredient"
                value={formData.active_ingredient}
                onChange={(e) => setFormData((f) => ({ ...f, active_ingredient: e.target.value }))}
                placeholder="nt Paracetamolum"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="med-expiry">Säilib kuni (KK/AAAA)</Label>
              <Input
                id="med-expiry"
                value={formData.expiration_date}
                onChange={(e) => setFormData((f) => ({ ...f, expiration_date: e.target.value }))}
                placeholder="nt 12/2026"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="med-quantity">Kogus (nt 30 tk, 100 ml)</Label>
              <Input
                id="med-quantity"
                value={formData.quantity}
                onChange={(e) => setFormData((f) => ({ ...f, quantity: e.target.value }))}
                placeholder="nt 30 tk"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>Tühista</Button>
            <Button onClick={handleDialogSave} disabled={addMutation.isPending || updateMutation.isPending}>
              {(addMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingMed ? "Salvesta" : "Lisa ravim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;

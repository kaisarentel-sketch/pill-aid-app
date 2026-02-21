import { useState, useRef } from "react";
import { Camera, Loader2, Pill, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
}


const Index = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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
    mutationFn: async (med: Omit<Medication, "id">) => {
      const { error } = await supabase.from("medications").insert(med);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["medications"] }),
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
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("analyze-medication", {
        body: { imageBase64: base64 },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      addMutation.mutate({
        name: data.name,
        active_ingredient: data.active_ingredient,
        expiration_date: data.expiration_date,
      });
      toast.success(`${data.name} lisatud!`);
    } catch (err: any) {
      console.error("Analysis error:", err);
      toast.error("Ravimi tuvastamine ebaõnnestus. Proovi uuesti.");
    } finally {
      setIsAnalyzing(false);
    }
  };

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
        <Button
          onClick={handleCapture}
          disabled={isAnalyzing}
          className="w-full h-14 text-base font-semibold gap-3 rounded-2xl shadow-md"
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
                <TableHead className="text-accent-foreground font-semibold text-xs uppercase tracking-wider text-right">Säilib kuni</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Laadin...
                  </TableCell>
                </TableRow>
              ) : medications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
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
                      <TableCell className={`text-right font-mono text-sm ${isExpired ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                        {med.expiration_date}
                      </TableCell>
                      <TableCell className="w-12 p-1">
                        <button
                          onClick={() => deleteMutation.mutate(med.id)}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:opacity-100"
                          aria-label={`Kustuta ${med.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
};

export default Index;

import { useState, useRef } from "react";
import { Camera, Loader2, Pill, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Medication {
  id: number;
  name: string;
  activeIngredient: string;
  expirationDate: string;
}

const DUMMY_MEDS: Medication[] = [
  { id: 1, name: "Paracetamol", activeIngredient: "Paracetamolum", expirationDate: "12/2026" },
  { id: 2, name: "Ibuprofeen", activeIngredient: "Ibuprofenum", expirationDate: "03/2027" },
  { id: 3, name: "Amoksitsilliin", activeIngredient: "Amoxicillinum", expirationDate: "08/2025" },
];

const NEW_MED_OPTIONS: Omit<Medication, "id">[] = [
  { name: "Paracetamol", activeIngredient: "Paracetamolum", expirationDate: "12/2026" },
  { name: "Metformiin", activeIngredient: "Metforminum", expirationDate: "06/2027" },
  { name: "Atorvastatiin", activeIngredient: "Atorvastatinum", expirationDate: "01/2028" },
  { name: "Omeprasool", activeIngredient: "Omeprazolum", expirationDate: "09/2026" },
];

const Index = () => {
  const [medications, setMedications] = useState<Medication[]>(DUMMY_MEDS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(DUMMY_MEDS.length + 1);

  const handleCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    e.target.value = "";

    setIsAnalyzing(true);
    setTimeout(() => {
      const randomMed = NEW_MED_OPTIONS[Math.floor(Math.random() * NEW_MED_OPTIONS.length)];
      setMedications((prev) => [
        { ...randomMed, id: nextId.current++ },
        ...prev,
      ]);
      setIsAnalyzing(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
        {/* Capture Button */}
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

        {/* Stats */}
        <div className="flex gap-3">
          <div className="flex-1 rounded-2xl bg-card border border-border p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-primary">{medications.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Ravimeid kokku</p>
          </div>
          <div className="flex-1 rounded-2xl bg-card border border-border p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-destructive">
              {medications.filter((m) => {
                const [month, year] = m.expirationDate.split("/").map(Number);
                return new Date(year, month - 1) < new Date();
              }).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Aegunud</p>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-accent/50 hover:bg-accent/50">
                <TableHead className="text-accent-foreground font-semibold text-xs uppercase tracking-wider">
                  Ravimi nimi
                </TableHead>
                <TableHead className="text-accent-foreground font-semibold text-xs uppercase tracking-wider">
                  Toimeaine
                </TableHead>
                <TableHead className="text-accent-foreground font-semibold text-xs uppercase tracking-wider text-right">
                  Säilib kuni
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {medications.map((med) => {
                const [month, year] = med.expirationDate.split("/").map(Number);
                const isExpired = new Date(year, month - 1) < new Date();
                return (
                  <TableRow key={med.id} className="group">
                    <TableCell className="font-medium text-foreground">
                      {med.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm italic">
                      {med.activeIngredient}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm ${isExpired ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                      {med.expirationDate}
                    </TableCell>
                  </TableRow>
                );
              })}
              {medications.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                    Ravimeid pole veel lisatud
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
};

export default Index;

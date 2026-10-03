import { useState } from "react";
import { ArrowLeft, ArrowRight, UsersRound } from "lucide-react";
import type { Table } from "../types/booking";
import { Button } from "@/components/ui/button";
import { StepFooter } from "./StepFooter";

const ALL = "All";

interface Props {
  tables: Table[];
  selectedTableId?: string;
  onSelect: (table: Table) => void;
  onBack: () => void;
  onNext: () => void;
}

export function TableSelection({ tables, selectedTableId, onSelect, onBack, onNext }: Props) {
  const [zone, setZone] = useState(ALL);

  // Tabs come from the locations in the data, and only show when there is a choice to make.
  const locations = Array.from(
    new Set(
      tables
        .map((table) => table.location)
        .filter((location): location is string => Boolean(location)),
    ),
  ).sort();
  const zones = locations.length > 1 ? [ALL, ...locations] : [];
  const activeZone = zones.includes(zone) ? zone : ALL;
  const visible = activeZone === ALL ? tables : tables.filter((table) => table.location === activeZone);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Choose Your Table</h1>
        <p className="text-sm text-muted-foreground">Select a table that suits your group.</p>
      </div>

      {zones.length > 0 && (
        <div
          role="group"
          aria-label="Seating area"
          className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {zones.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={name === activeZone}
              onClick={() => setZone(name)}
              className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                name === activeZone
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-foreground hover:bg-muted/70"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {tables.length === 0 ? (
        <p role="status" className="rounded-xl bg-muted p-4 text-sm">
          No tables available for that search. Go back and try a different time or party size.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {visible.map((table) => {
            const selected = table.id === selectedTableId;
            return (
              <button
                key={table.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(table)}
                className={`flex flex-col items-center gap-1 rounded-xl border bg-card p-3 text-center transition outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  selected ? "border-primary ring-2 ring-primary/25" : "hover:border-primary/40"
                }`}
              >
                <UsersRound aria-hidden="true" className="size-5 text-primary" />
                <span className="font-semibold">{table.tableNumber}</span>
                <span className="text-xs text-muted-foreground">{table.capacity} seats</span>
                {table.location && (
                  <span className="text-xs text-muted-foreground">{table.location}</span>
                )}
                <span className="mt-1 rounded-full bg-green-100 px-3 py-0.5 text-xs font-medium text-green-700">
                  Available
                </span>
              </button>
            );
          })}
        </div>
      )}

      <StepFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="h-12 flex-1 rounded-xl text-base"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Back
        </Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={!selectedTableId}
          className="h-12 flex-[1.5] rounded-xl text-base"
        >
          Next <ArrowRight aria-hidden="true" className="size-4" />
        </Button>
      </StepFooter>
    </div>
  );
}

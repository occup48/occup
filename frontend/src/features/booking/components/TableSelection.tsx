import type { Table } from "../types/booking";
import { Button } from "@/components/ui/button";

interface Props {
  tables: Table[];
  selectedTableId?: string;
  onSelect: (table: Table) => void;
  onBack: () => void;
}

export function TableSelection({ tables, selectedTableId, onSelect, onBack }: Props) {
  return (
    <div className="space-y-4">
      {tables.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tables available for that search. Try a different time or party size.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {tables.map((table) => (
            <button
              key={table.id}
              type="button"
              onClick={() => onSelect(table)}
              className={`rounded-lg border p-3 text-left transition ${
                selectedTableId === table.id
                  ? "border-blue-600 ring-2 ring-blue-200"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-medium">{table.tableNumber}</div>
              <div className="text-sm text-muted-foreground">{table.capacity} seats</div>
              {table.location && (
                <div className="text-xs text-muted-foreground">{table.location}</div>
              )}
            </button>
          ))}
        </div>
      )}

      <Button variant="outline" onClick={onBack} className="w-full">
        Back
      </Button>
    </div>
  );
}
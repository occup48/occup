import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookingSearchForm } from "./components/BookingSearchForm";
import { TableSelection } from "./components/TableSelection";
import { ReservationReview } from "./components/ReservationReview";
import { useAvailability } from "./hooks/useAvailability";
import { useCreateReservation } from "./hooks/useCreateReservation";
import type { Table } from "./types/booking";
import type { AvailabilitySearchFormValues } from "./validation/booking.schema";

type Step = "search" | "select-table" | "review";

export function BookingFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("search");
  const [searchParams, setSearchParams] = useState<AvailabilitySearchFormValues | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [specialRequests, setSpecialRequests] = useState("");

  const { tables, isLoading, error: searchError, search } = useAvailability();
  const { submit, isSubmitting, error: submitError } = useCreateReservation();

  const handleSearch = async (values: AvailabilitySearchFormValues) => {
    setSearchParams(values);
    await search(values);
    setStep("select-table");
  };

  const handleSelectTable = (table: Table) => {
    setSelectedTable(table);
    setStep("review");
  };

  const handleConfirm = async () => {
    if (!searchParams || !selectedTable) return;
    const result = await submit({
      tableId: selectedTable.id,
      reservationDate: searchParams.date,
      startTime: searchParams.time,
      partySize: searchParams.partySize,
      specialRequests: specialRequests || undefined,
    });
    if (result) {
      navigate("/booking/success", { state: { reservation: result } });
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      {step === "search" && (
        <BookingSearchForm onSearch={handleSearch} isLoading={isLoading} />
      )}

      {step === "select-table" && (
        <>
          {searchError && <p className="text-sm text-red-500 mb-2">{searchError}</p>}
          <TableSelection
            tables={tables}
            selectedTableId={selectedTable?.id}
            onSelect={handleSelectTable}
            onBack={() => setStep("search")}
          />
        </>
      )}

      {step === "review" && searchParams && selectedTable && (
        <ReservationReview
          date={searchParams.date}
          time={searchParams.time}
          partySize={searchParams.partySize}
          table={selectedTable}
          specialRequests={specialRequests}
          onSpecialRequestsChange={setSpecialRequests}
          onBack={() => setStep("select-table")}
          onConfirm={handleConfirm}
          isSubmitting={isSubmitting}
          errorMessage={submitError}
        />
      )}
    </div>
  );
}
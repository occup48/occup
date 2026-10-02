const STEPS = ["Date & Guests", "Time", "Table"] as const;

interface Props {
  /** The step the guest is on, 1 to 3. */
  current: 1 | 2 | 3;
  /** Every step is done, as on the review screen. */
  complete?: boolean;
}

export function BookingStepper({ current, complete = false }: Props) {
  return (
    <ol aria-label="Booking progress" className="flex">
      {STEPS.map((label, index) => {
        const number = index + 1;
        const reached = complete || number <= current;
        const isCurrent = !complete && number === current;
        return (
          <li
            key={label}
            aria-current={isCurrent ? "step" : undefined}
            className="relative flex flex-1 flex-col items-center gap-2 text-center"
          >
            {index > 0 && (
              <span
                aria-hidden="true"
                className={`absolute top-4 right-1/2 h-0.5 w-full -translate-y-1/2 ${
                  reached ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
            <span
              className={`relative z-10 flex size-8 items-center justify-center rounded-full text-sm font-semibold ${
                reached ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {number}
            </span>
            <span
              className={`text-xs font-medium ${reached ? "text-primary" : "text-muted-foreground"}`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

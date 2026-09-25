import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function BookingCTA() {
  return (
    <section aria-labelledby="booking-cta-title" className="site-container mt-8 sm:mt-9">
      <div className="flex flex-col items-start justify-between gap-5 rounded-2xl bg-primary-light/80 p-6 sm:flex-row sm:items-center sm:p-8 lg:px-9">
        <div>
          <p className="eyebrow">READY TO DINE WITH US?</p>
          <h2 id="booking-cta-title" className="section-heading mt-2">Book Your Table Today</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/75 sm:text-base">Good food, great company, unforgettable moments.</p>
        </div>
        <Button render={<Link to="/booking" />} nativeButton={false} className="primary-button w-full shrink-0 sm:w-auto sm:px-9">
          Book a Table <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}

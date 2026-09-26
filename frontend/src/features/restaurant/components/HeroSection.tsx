import { Check } from "lucide-react";
import { HOME_IMAGES } from "@/constants";
import { BookingSearch } from "./BookingSearch";

const assurances = ["Instant confirmation", "Secure booking", "A better dining experience"];

export const HeroSection = () => {
  return (
    <section aria-labelledby="hero-title" className="relative isolate">
      <div className="absolute inset-x-0 top-0 bottom-10 -z-10 overflow-hidden bg-foreground sm:bottom-0">
        <img src={HOME_IMAGES.hero} alt="" fetchPriority="high" className="size-full object-cover object-[62%_center] sm:object-center" />
        <div className="absolute inset-0 bg-linear-to-r from-black/75 via-black/40 to-black/10" />
      </div>
      <div className="site-container pt-7 sm:pt-12 lg:pt-14">
        <div className="text-white">
          <p className="text-[10px] font-semibold tracking-[0.14em] sm:text-xs">GOOD FOOD. GREAT COMPANY.</p>
          <h1 id="hero-title" className="mt-3 max-w-lg text-[clamp(2.125rem,4.6vw,3.5rem)] leading-[1.06] font-bold tracking-tight">
            Reserve Your<br />Perfect Table
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/95 sm:mt-4 sm:text-base lg:text-lg">
            Enjoy exceptional food, a warm atmosphere, and unforgettable moments.
          </p>
        </div>
        <div className="mt-6 sm:mt-7 lg:mt-8">
          <BookingSearch />
        </div>
        <ul className="hidden flex-wrap justify-center gap-x-9 gap-y-2 py-4 text-xs text-white sm:flex lg:text-sm">
          {assurances.map((assurance) => (
            <li key={assurance} className="flex items-center gap-2">
              <span className="flex size-4 items-center justify-center rounded-md bg-primary-light">
                <Check aria-hidden="true" className="size-3 stroke-3 text-primary-hover" />
              </span>
              {assurance}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

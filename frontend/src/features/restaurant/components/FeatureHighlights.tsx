import { CalendarDays, ChefHat, UsersRound } from "lucide-react";

const features = [
  { title: "Exceptional Cuisine", description: "A menu crafted with fresh, quality ingredients.", mobile: "Fresh, quality ingredients.", icon: ChefHat },
  { title: "Warm Atmosphere", description: "The perfect setting for any occasion.", mobile: "Perfect for any occasion.", icon: UsersRound },
  { title: "Easy Reservations", description: "Book your table in just a few clicks.", mobile: "Book in seconds.", icon: CalendarDays },
];

export function FeatureHighlights() {
  return (
    <section aria-label="The Occup experience" className="site-container grid grid-cols-3 gap-3 py-7 sm:gap-6 sm:py-10 lg:py-11">
      {features.map(({ title, description, mobile, icon: Icon }) => (
        <div key={title} className="flex min-w-0 flex-col items-center gap-2 text-center md:flex-row md:gap-5 md:text-left">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-light/75 text-primary-hover sm:size-16 lg:size-18">
            <Icon aria-hidden="true" className="size-6 sm:size-8" strokeWidth={1.8} />
          </span>
          <div>
            <h2 className="text-[11px] leading-snug font-semibold sm:text-sm lg:text-base">{title}</h2>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground sm:text-sm">
              <span className="sm:hidden">{mobile}</span>
              <span className="hidden sm:inline">{description}</span>
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}

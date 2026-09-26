import { Star } from "lucide-react";

const testimonials = [
  { quote: "Amazing food and great service! The booking process was seamless.", name: "Sarah A.", initials: "SA" },
  { quote: "The atmosphere is perfect for date nights. Highly recommended!", name: "Tunde M.", initials: "TM" },
  { quote: "Delicious meals and a beautiful setting. We’ll definitely be back!", name: "Chioma K.", initials: "CK" },
];

export function Testimonials() {
  return (
    <section aria-labelledby="testimonials-title" className="site-container mt-9 sm:mt-11 lg:mt-12">
      <p className="eyebrow">WHAT OUR GUESTS SAY</p>
      <h2 id="testimonials-title" className="section-heading mt-2">Real Experiences, Real Smiles</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-3 sm:gap-5">
        {testimonials.map(({ quote, name, initials }) => (
          <figure key={name} className="flex flex-col justify-between rounded-xl border border-border/80 bg-white p-5 lg:p-6">
            <blockquote className="text-sm leading-relaxed text-muted-foreground">“{quote}”</blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-light/65 text-xs font-semibold text-foreground">{initials}</span>
              <div>
                <p className="text-sm font-semibold">{name}</p>
                <div className="mt-1 flex gap-0.5" role="img" aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }, (_, index) => <Star key={index} aria-hidden="true" className="size-4 fill-warning text-warning" strokeWidth={1} />)}
                </div>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

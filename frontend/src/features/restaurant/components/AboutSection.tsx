import { useState } from "react";
import { ArrowRight, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HOME_IMAGES } from "@/constants";

const stats = [
  { value: "100+", label: "Happy Guests" },
  { value: "4.8★", label: "Average Rating" },
  { value: "5+", label: "Years of Excellence" },
];

export function AboutSection() {
  const [expanded, setExpanded] = useState(false);
  return (
    <section id="about" aria-labelledby="about-title" className="site-container grid items-center gap-6 md:grid-cols-2 md:gap-10 lg:gap-12">
      <img src={HOME_IMAGES.about} alt="A warmly lit dining room with set tables, plants, and pendant lights"
        width="960" height="620" loading="lazy" className="aspect-[1.65] w-full rounded-xl object-cover md:aspect-[1.6] lg:max-h-100" />
      <div>
        <p className="eyebrow">ABOUT US</p>
        <h2 id="about-title" className="section-heading mt-2">More Than Just a Meal</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground lg:text-base">
          At Occup, we believe dining is more than just food — it’s an experience.
          Our restaurant offers a unique blend of great flavors, excellent service,
          and a cozy atmosphere where memories are made.
        </p>
        <dl className="my-5 grid grid-cols-3 divide-x divide-border sm:my-6">
          {stats.map(({ value, label }, index) => (
            <div key={label} className={index === 0 ? "pr-2" : "px-3 sm:px-5"}>
              <dt className="text-xl font-bold text-primary-hover sm:text-2xl">{value}</dt>
              <dd className="mt-1 text-[11px] leading-relaxed text-muted-foreground sm:text-xs lg:text-sm">{label}</dd>
            </div>
          ))}
        </dl>
        <Button variant="ghost" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}
          aria-controls="our-story" className="h-11 gap-2 bg-primary-light/60 px-5 hover:bg-primary-light">
          {expanded ? "Show Less" : "Learn More"}
          {expanded ? <ChevronUp aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
        </Button>
        {expanded && (
          <div id="our-story" className="mt-4 border-l-2 border-primary pl-4 text-sm leading-relaxed text-muted-foreground">
            From a quiet dinner for two to a table full of friends, there’s a place for you here.
            We bring thoughtful cooking and warm hospitality to every visit, so you can settle
            in, share a good meal, and enjoy the company.
          </div>
        )}
      </div>
    </section>
  );
}

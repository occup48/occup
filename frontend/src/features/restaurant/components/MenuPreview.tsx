import { useState } from "react";
import { ArrowRight, ChevronUp } from "lucide-react";
import { HOME_IMAGES } from "@/constants";
import { Button } from "@/components/ui/button";

const dishes = [
  { name: "Grilled Steak", description: "Perfectly grilled, full of flavor", image: HOME_IMAGES.menu.steak, alt: "Grilled steak served with colorful roasted vegetables", detail: "Seared steak, roasted seasonal vegetables, and a rich pan sauce.", course: "FROM THE GRILL" },
  { name: "Creamy Pasta", description: "Rich and satisfying", image: HOME_IMAGES.menu.pasta, alt: "A plate of creamy pasta topped with fresh herbs", detail: "Pasta tossed in a velvety cream sauce, finished with fresh herbs.", course: "COMFORT FAVORITES" },
  { name: "Grilled Salmon", description: "A healthy and delicious choice", image: HOME_IMAGES.menu.salmon, alt: "Grilled salmon with vegetables and a fresh herb garnish", detail: "Tender salmon, grilled vegetables, and a bright herb dressing.", course: "FROM THE SEA" },
  { name: "Chocolate Delight", description: "The perfect sweet ending", image: HOME_IMAGES.menu.dessert, alt: "Chocolate cake topped with fresh berries", detail: "Rich chocolate cake with a chocolate glaze and fresh seasonal berries.", course: "SOMETHING SWEET" },
];

export function MenuPreview() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section id="menu" aria-labelledby="menu-title" className="site-container mt-9 sm:mt-10 lg:mt-12">
      <div className="mb-4 flex items-end justify-between gap-3 sm:mb-5">
        <div>
          <p className="eyebrow">OUR MENU</p>
          <h2 id="menu-title" className="section-heading mt-2">A Taste of What Awaits</h2>
        </div>
        <Button variant="link" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-controls="full-menu"
          className="h-auto min-h-11 shrink-0 gap-1 px-0 text-[11px] text-primary-ink sm:gap-2 sm:text-sm">
          {expanded ? "Close Menu" : <><span className="sm:hidden">View Menu</span><span className="hidden sm:inline">View Full Menu</span></>}
          {expanded ? <ChevronUp aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
        </Button>
      </div>
      <div className="horizontal-cards grid auto-cols-[43%] grid-flow-col gap-3 overflow-x-auto pb-2 sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-2 sm:gap-5 lg:grid-cols-4"
        role="region" aria-label="Featured dishes, scroll for more" tabIndex={0}>
        {dishes.map((dish) => (
          <article key={dish.name} className="min-w-0">
            <div className="overflow-hidden rounded-lg bg-muted">
              <img src={dish.image} alt={dish.alt} width="480" height="280" loading="lazy"
                className="aspect-[1.9] w-full object-cover transition-transform duration-300 motion-safe:hover:scale-105" />
            </div>
            <h3 className="mt-3 text-sm font-semibold sm:text-base">{dish.name}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">{dish.description}</p>
          </article>
        ))}
      </div>
      {expanded && (
        <div id="full-menu" className="mt-5 rounded-xl border border-border bg-white p-5 sm:p-7">
          <h3 className="text-lg font-semibold">From our kitchen</h3>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            {dishes.map((dish) => (
              <div key={dish.name}>
                <p className="text-[10px] font-semibold tracking-wider text-primary-ink">{dish.course}</p>
                <h4 className="mt-1 font-semibold">{dish.name}</h4>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{dish.detail}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
            A taste of our signature dishes. Please ask your server about today’s specials,
            dietary requirements, and allergen information.
          </p>
        </div>
      )}
    </section>
  );
}

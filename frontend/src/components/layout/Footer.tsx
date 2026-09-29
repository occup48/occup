import { Camera as Instagram, Music2 } from "lucide-react";
import type { SVGProps } from "react";
import { Link } from "react-router-dom";
import logo from "@/assets/images/logo.png";
import { HOME_NAVIGATION } from "@/constants";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function Facebook(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M14 21v-8h3l.5-4H14V7c0-1.2.4-2 2-2h2V1.4A26 26 0 0 0 15 1c-3 0-5 1.8-5 5v3H7v4h3v8z" /></svg>;
}

function Twitter(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M22 5.9a8.2 8.2 0 0 1-2.4.7 4.2 4.2 0 0 0 1.8-2.3 8.3 8.3 0 0 1-2.6 1 4.1 4.1 0 0 0-7 3.7A11.7 11.7 0 0 1 3.3 4.7a4.1 4.1 0 0 0 1.3 5.5 4.1 4.1 0 0 1-1.9-.5v.1A4.1 4.1 0 0 0 6 13.9a4.1 4.1 0 0 1-1.9.1 4.1 4.1 0 0 0 3.8 2.8A8.3 8.3 0 0 1 2 18.5a11.7 11.7 0 0 0 18-9.8v-.5A8.4 8.4 0 0 0 22 5.9z" /></svg>;
}
const socialChannels = [
  { name: "Facebook", icon: Facebook },
  { name: "Instagram", icon: Instagram },
  { name: "Twitter", icon: Twitter },
  { name: "TikTok", icon: Music2 },
];

export function Footer() {
  return (
    <footer id="contact" aria-label="Contact and site information" className="mt-8 border-t border-border/70 bg-white/60 sm:mt-6">
      <div className="site-container">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 py-6 sm:py-5">
          <Link to="/" aria-label="Occup home" className="brand-logo">
            <img src={logo} alt="Occup" width="132" height="36" loading="lazy" />
          </Link>
          <nav aria-label="Footer navigation" className="order-3 flex w-full justify-between gap-5 text-sm sm:order-0 sm:w-auto sm:gap-7">
            {HOME_NAVIGATION.map(({ label, href }) => (
              <a key={href} href={href} className="nav-link text-muted-foreground">{label}</a>
            ))}
          </nav>
          <div className="flex gap-1.5" aria-label="Social channels">
            {socialChannels.map(({ name, icon: Icon }) => (
              <Popover key={name}>
                <PopoverTrigger aria-label={name} className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary-light hover:text-primary-hover">
                  <Icon aria-hidden="true" className="size-4" />
                </PopoverTrigger>
                <PopoverContent side="top" align="end" className="w-56 p-4">
                  <p className="font-medium">Occup on {name}</p>
                  <p className="text-muted-foreground">Our social page is coming soon. We look forward to sharing more.</p>
                </PopoverContent>
              </Popover>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-border/70 py-5 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-sm">
          <p>© {new Date().getFullYear()} Occup. All rights reserved.</p>
          <p>Good Food. Better Moments.</p>
        </div>
      </div>
    </footer>
  );
}

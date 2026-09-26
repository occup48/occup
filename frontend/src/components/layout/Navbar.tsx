import { CalendarDays, Menu, UserRound, X } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/images/logo-light.svg";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HOME_NAVIGATION } from "@/constants";
import { useState } from "react";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header id="home" className="border-b border-border/60 bg-white">
      <div className="site-container flex h-16 items-center justify-between gap-2 md:h-19">
        <Link to="/" aria-label="Occup home" className="brand-logo">
          <img src={logo} alt="Occup" width="300" height="80" />
        </Link>
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-7 text-sm font-medium sm:flex lg:gap-10"
        >
          {HOME_NAVIGATION.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              aria-current={label === "Home" ? "page" : undefined}
              className={
                label === "Home"
                  ? "nav-link text-primary-hover"
                  : "nav-link text-foreground/80"
              }
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1 md:gap-5">
          <Link
            to="/sign-in"
            aria-label="Sign in"
            className="nav-link flex size-11 items-center justify-center text-sm font-medium md:w-auto"
          >
            <UserRound
              aria-hidden="true"
              className="size-4 text-primary-hover md:hidden"
            />
            <span className="hidden md:inline">Sign In</span>
          </Link>
          <Button
            render={<Link to="/booking" />}
            nativeButton={false}
            className="primary-button hidden sm:inline-flex"
          >
            Book a Table
          </Button>
          <Link
            to="/booking"
            aria-label="Book a table"
            className="flex size-11 items-center justify-center rounded-full bg-primary-light/60 text-primary-hover sm:hidden"
          >
            <CalendarDays aria-hidden="true" className="size-4" />
          </Link>
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              className="flex size-11 items-center justify-center rounded-lg text-foreground sm:hidden"
            >
              {menuOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-2">
              <nav aria-label="Mobile navigation" className="flex flex-col">
                {HOME_NAVIGATION.map(({ label, href }) => (
                  <a
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={label === "Home" ? "page" : undefined}
                    className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium hover:bg-primary-light aria-[current=page]:text-primary-hover"
                  >
                    {label}
                  </a>
                ))}
              </nav>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}

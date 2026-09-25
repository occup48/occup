import hero from "@/assets/images/hero-image.png";
import about from "@/assets/images/about-image.png";
import steak from "@/assets/images/steak.png";
import pasta from "@/assets/images/pasta.png";
import salmon from "@/assets/images/salmom.png";
import dessert from "@/assets/images/desert.png";

export const HOME_IMAGES = {
  hero,
  about,
  menu: { steak, pasta, salmon, dessert },
};

export const HOME_NAVIGATION = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Menu", href: "#menu" },
  { label: "Contact", href: "#contact" },
] as const;

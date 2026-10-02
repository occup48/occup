import { Icon, type IconNode, type LucideProps } from "lucide-react";

// Use the existing Lucide renderer for a dining table, rather than a data-grid glyph.
const diningTable: IconNode = [
  ["ellipse", { cx: "12", cy: "6", rx: "9", ry: "2.5", key: "top" }],
  ["path", { d: "M4.5 10 3 20M12 10v10m7.5-10L21 20", key: "legs" }],
];

export function DiningTableIcon(props: LucideProps) {
  return <Icon iconNode={diningTable} {...props} />;
}

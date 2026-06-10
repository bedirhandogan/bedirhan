export type Shot = {
  image: string;
  thumbnail?: string;
  title: string;
  subtitle: string;
  description: string;
  alt: string;
};

function getShotSlug(image: string) {
  const filename = decodeURIComponent(image.split("/").pop() ?? "");

  return filename
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getShotThumbnail(shot: Pick<Shot, "image" | "thumbnail">) {
  return shot.thumbnail ?? `/shots/thumbs/${getShotSlug(shot.image)}.webp`;
}

export const shots: Shot[] = [
  {
    image: "/shots/Skeuomorphic%20Form%20Elements%201.webp",
    thumbnail: "/shots/thumbs/skeuomorphic-form-elements-1.webp",
    title: "Skeuomorphic Form Elements 1",
    subtitle: "Visual",
    description:
      "A tactile skeuomorphic form interface exploration with dimensional fields, buttons, and refined product UI details.",
    alt: "Skeuomorphic product form UI with dimensional input fields and soft interface details.",
  },
  {
    image: "/shots/Skeuomorphic%20Form%20Elements%202.webp",
    thumbnail: "/shots/thumbs/skeuomorphic-form-elements-2.webp",
    title: "Skeuomorphic Form Elements 2",
    subtitle: "Visual",
    description:
      "A second skeuomorphic interface study focused on soft depth, polished controls, and realistic product interaction details.",
    alt: "Skeuomorphic interface components with soft shadows and polished product controls.",
  },
  {
    image: "/shots/Skeuomorphic%20Form%20Elements%203.webp",
    thumbnail: "/shots/thumbs/skeuomorphic-form-elements-3.webp",
    title: "Skeuomorphic Form Elements 3",
    subtitle: "Visual",
    description:
      "A refined set of tactile form elements exploring visual depth, hierarchy, and detailed UI component styling.",
    alt: "Detailed skeuomorphic form elements showing layered controls and tactile UI styling.",
  },
  {
    image: "/shots/Arciel%20Logo.webp",
    thumbnail: "/shots/thumbs/arciel-logo.webp",
    title: "Logo Marks",
    subtitle: "Brand",
    description:
      "Logo mark and brand identity exploration for Arciel, balancing geometric structure with a clean digital presence.",
    alt: "Arciel logo mark design exploration with clean geometric brand identity elements.",
  },
  {
    image: "/shots/Arciel%20Wizard%20Hat.webp",
    thumbnail: "/shots/thumbs/arciel-wizard-hat.webp",
    title: "Wizard Hat",
    subtitle: "Visual",
    description:
      "A polished wizard hat visual for Arciel, exploring dimensional form, soft material detail, and playful brand expression.",
    alt: "Dimensional wizard hat visual with soft material detail and playful brand styling.",
  },
  {
    image: "/shots/Arciel%20Pricing%20Section.webp",
    thumbnail: "/shots/thumbs/arciel-pricing-section.webp",
    title: "Pricing Section",
    subtitle: "Website",
    description:
      "A website pricing section design for Arciel with structured plan comparison, polished layout, and clear conversion-focused hierarchy.",
    alt: "Arciel website pricing section with structured plan cards and polished conversion-focused layout.",
  },
  {
    image: "/shots/Arciel%20Footer.webp",
    thumbnail: "/shots/thumbs/arciel-footer.webp",
    title: "Footer",
    subtitle: "Website",
    description:
      "A website footer design for Arciel with clear navigation, polished brand presence, and structured closing content.",
    alt: "Arciel website footer design with polished brand presence and structured navigation links.",
  },
  {
    image: "/shots/Arciel%20Choose%20Platform.webp",
    thumbnail: "/shots/thumbs/arciel-choose-platform.webp",
    title: "Choose Platform",
    subtitle: "Product",
    description:
      "A product interface section for Arciel focused on platform selection, clean hierarchy, and polished decision-making flow.",
    alt: "Arciel product interface for choosing a platform with clean hierarchy and polished UI details.",
  },
  {
    image: "/shots/Arciel%20Popover.webp",
    thumbnail: "/shots/thumbs/arciel-popover.webp",
    title: "Popover",
    subtitle: "Product",
    description:
      "A product interface popover for Arciel with focused interaction details, refined hierarchy, and polished component styling.",
    alt: "Arciel product interface popover with refined hierarchy and polished component styling.",
  },
  {
    image: "/shots/Arciel%20Icons%201.webp",
    thumbnail: "/shots/thumbs/arciel-icons-1.webp",
    title: "Icons 1",
    subtitle: "Product",
    description:
      "A product icon set for Arciel with clean forms, consistent visual rhythm, and polished interface-ready details.",
    alt: "Arciel product icon set with clean forms and polished interface-ready details.",
  },
  {
    image: "/shots/Arciel%20Icons%202.webp",
    thumbnail: "/shots/thumbs/arciel-icons-2.webp",
    title: "Icons 2",
    subtitle: "Product",
    description:
      "A second product icon set for Arciel exploring consistent shapes, refined hierarchy, and crisp UI detail.",
    alt: "Second Arciel product icon set with consistent shapes and crisp UI detail.",
  },
  {
    image: "/shots/Folder%20Icon.webp",
    thumbnail: "/shots/thumbs/folder-icon.webp",
    title: "Folder Icon",
    subtitle: "Visual",
    description:
      "A polished folder icon visual exploring dimensional form, soft material detail, and clean digital object styling.",
    alt: "Dimensional folder icon visual with soft material detail and clean digital styling.",
  },
  {
    image: "/shots/Radar.webp",
    thumbnail: "/shots/thumbs/radar.webp",
    title: "Radar",
    subtitle: "Visual",
    description:
      "A polished radar visual exploring dimensional interface detail, signal rhythm, and refined digital object styling.",
    alt: "Radar visual with dimensional interface detail and polished digital styling.",
  },
  {
    image: "/shots/indicator.webp",
    thumbnail: "/shots/thumbs/indicator.webp",
    title: "Indicator",
    subtitle: "Visual",
    description:
      "A polished indicator visual focused on refined interaction detail, depth, and clean interface-ready styling.",
    alt: "Indicator visual with refined interaction detail and clean interface styling.",
  },
  {
    image: "/shots/Keyboard.webp",
    thumbnail: "/shots/thumbs/keyboard.webp",
    title: "Keyboard",
    subtitle: "Visual",
    description:
      "A polished keyboard visual exploring tactile form, soft material detail, and clean digital object styling.",
    alt: "Keyboard visual with tactile form and polished digital object styling.",
  },
];

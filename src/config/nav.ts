export interface NavLink {
  label: string;
  /** Root-relative path with a trailing slash */
  href: string;
}

export const navLinks: NavLink[] = [
  { label: "What We Build", href: "/what-we-build/" },
  { label: "Designs", href: "/designs/" },
  { label: "About", href: "/about/" },
  { label: "Contact", href: "/contact/" },
];

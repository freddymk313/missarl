import Link from "next/link";

type PageBannerProps = { eyebrow: string; title: string; description: string };

export function PageBanner({ eyebrow, title, description }: PageBannerProps) { return <section className="page-banner"><div className="site-container relative z-10"><p className="kicker text-accent before:bg-accent">{eyebrow}</p><h1 className="display-heading mt-4 max-w-3xl">{title}</h1><p className="mt-5 max-w-2xl text-lg text-white/70">{description}</p><p className="mt-6 text-sm text-white/55"><Link href="/" className="hover:text-white">Home</Link><span className="mx-2">/</span>{title}</p></div></section>; }

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { WhatsAppButton } from "@/components/site/whatsapp-button";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <><a href="#main-content" className="skip-link">Skip to content</a><SiteHeader /><main id="main-content">{children}</main><WhatsAppButton /><SiteFooter /></>;
}

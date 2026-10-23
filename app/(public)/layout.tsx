import { Footer } from "@/components/ui/home/footer";
import { Header } from "@/components/ui/home/header";
import { WhatsAppButton } from "@/components/ui/home/whatsapp-button";
import Link from "next/link";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Link href="#main-content" className="skip-link">
        Skip to content
      </Link>
      <Header />
      <main id="main-content">{children}</main>
      <WhatsAppButton />
      <Footer />
    </>
  );
}

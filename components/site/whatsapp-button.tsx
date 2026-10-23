import { MessageCircle } from "lucide-react";
import { siteConfig } from "@/app/config/site";

export function WhatsAppButton() { return <a href={`https://wa.me/${siteConfig.whatsapp}`} target="_blank" rel="noopener noreferrer" aria-label="Contact us on WhatsApp" className="whatsapp-button"><MessageCircle className="size-6" /></a>; }

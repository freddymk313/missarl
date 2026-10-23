export const navigation = [
  { label: "Home", href: "/" },
  { label: "About", href: "/a-propos" },
  { label: "Services", href: "/services" },
  { label: "Contact", href: "/contact" },
] as const;

export const services = [
  { id: "plomberie-industrielle", title: "Industrial plumbing", icon: "Droplets", short: "Piping, water supply, drainage, fittings and valves for demanding sites.", description: "Supply and installation of piping networks, water supply and drainage systems, fittings and valves, with maintenance and repair of plumbing infrastructure for industrial, commercial and residential sites.", bullets: ["Piping networks and water supply", "Drainage systems, fittings and valves", "Maintenance and repair of installations"] },
  { id: "soudure-hdpe", title: "HDPE welding", icon: "Flame", short: "HDPE pipes, fusion welding and transport networks for industrial sites.", description: "Supply of HDPE pipes, butt fusion welding and installation of water, chemical and slurry transport networks, including tank fabrication and common lining solutions for mining and industrial sites.", bullets: ["HDPE pipe supply", "Butt fusion welding on site", "Water, chemical and slurry networks", "Tank fabrication and lining solutions"] },
  { id: "electromecanique-instrumentation", title: "Electromechanics & instrumentation", icon: "Zap", short: "Electrical systems, control panels, lighting, automation and maintenance.", description: "Electrical installation, cabling and instrumentation systems; installation of control panels and switching equipment; industrial electrification; lighting; maintenance and troubleshooting for commercial, industrial and mining sites.", bullets: ["Electrical installation and cabling", "Control panels and switching equipment", "Industrial electrification and lighting", "Instrumentation, maintenance and troubleshooting"] },
  { id: "engins-miniers", title: "Mining equipment", icon: "Truck", short: "Heavy equipment, spare parts and maintenance support for mining operations.", description: "Rental of heavy mining and earthmoving equipment including excavators, loaders, generator sets, compressors and drilling equipment; supply of original and compatible spare parts; and maintenance assistance for machines.", bullets: ["Excavators, loaders and generator sets", "Compressors and drilling equipment", "Original and compatible spare parts", "Maintenance assistance"] },
  { id: "construction-materiaux", title: "Construction materials", icon: "Building2", short: "Materials and technical support for buildings and infrastructure projects.", description: "Supply of construction and civil engineering materials including cement, steel, aggregates, roofing and associated inputs, with technical support for building and infrastructure projects.", bullets: ["Cement, steel and aggregates", "Roofing and associated inputs", "Technical support for projects"] },
  { id: "outillage-epi", title: "Tools & PPE", icon: "HardHat", short: "Workshop tools and protective equipment aligned with safety requirements.", description: "Supply of hand and power tools, workshop equipment and personal protective equipment including helmets, safety shoes, gloves, coveralls and glasses compliant with international safety standards.", bullets: ["Hand and power tools", "Workshop equipment", "Helmets, shoes, gloves and coveralls", "Protective glasses and safety supplies"] },
] as const;

export const team = [
  { initials: "MK", name: "Ir Marc KILUFIY", role: "Industrial engineer / electrician", detail: "ESI – UNILU. M4 Transformers (ECA, South Africa)." },
  { initials: "DM", name: "Ir Dumisani MAHLANGU", role: "Industrial plumber", detail: "Industrial plumbing expertise." },
  { initials: "CS", name: "Mme Christelle SIFA", role: "Human resources", detail: "Economic and financial management (United Arab Emirates)." },
  { initials: "DM", name: "Ir Domy MONGA", role: "Industrial engineer / electronics engineer", detail: "ESI. Electrical control, automation, and instrumentation." },
] as const;

export const partners = [
  { name: "TOCO Lifting", country: "South Africa", detail: "Chain hoists, steel wire ropes, chain slings, wire rope slings and flat webbing slings." },
  { name: "AutoPlus Parts", country: "South Africa", detail: "Diesel injectors, injection pumps, fuel system components and parts for heavy equipment and engines. Compatible OEM products for Caterpillar, Cummins, Komatsu, Denso, Bosch, Delphi, Continental and Perkins." },
  { name: "APTOOLS", country: "South Africa", detail: "Industrial hardware, components and parts for heavy equipment. Brands include Makita, Euromatic, Bishamon, KC Power, LEO, Stabila, Home Set, Rapid, TBM, KITO, Stony and Blue Clean." },
  { name: "China ShiyilMachinery Parts Co., Ltd.", country: "China", detail: "Electrical accessories, industrial automation components and parts for heavy equipment. Common brands include Siemens, Schneider Electric, ABB, Rockwell, Endress+Hauser, Rosemount, Honeywell, Festo, SMC, Omron, Yokogawa, WIKA and Grundfos." },
] as const;

export const steps = [
  { number: "01", title: "Your request", text: "Send your request for quotation by email or WhatsApp, including references and quantities." },
  { number: "02", title: "Our quotation", text: "We source the items and provide a detailed quotation with references, prices and delivery times." },
  { number: "03", title: "Your order", text: "You confirm the order using your purchase order." },
  { number: "04", title: "Delivery and invoice", text: "We deliver with a delivery note and issue the invoice." },
] as const;

export const sectors = [
  { title: "Mining", text: "Equipment, spare parts and maintenance support for mining sites.", image: "mine" },
  { title: "Industry", text: "Electrical systems, instrumentation, piping and tools.", image: "industry" },
  { title: "Construction", text: "Materials and technical support for building and infrastructure projects.", image: "construction" },
] as const;

export const imageRegistry = {
  hero: { url: "https://images.pexels.com/photos/29506757/pexels-photo-29506757.jpeg?auto=compress&cs=tinysrgb&h=650&w=940", alt: "Open-pit mine with large trucks and excavators", credit: "Deyler Rivera Segura / Pexels" },
  pipes: { url: "https://images.pexels.com/photos/372796/pexels-photo-372796.jpeg?auto=compress&cs=tinysrgb&h=650&w=940", alt: "Industrial pipes with pressure gauges", credit: "Pixabay / Pexels" },
  welding: { url: "https://images.pexels.com/photos/26953861/pexels-photo-26953861.jpeg?auto=compress&cs=tinysrgb&h=650&w=940", alt: "Worker welding a large pipe outdoors", credit: "Sergei Starostin / Pexels" },
  transformer: { url: "https://images.pexels.com/photos/7867332/pexels-photo-7867332.jpeg?auto=compress&cs=tinysrgb&h=650&w=940", alt: "Electrical transformers at a power station", credit: "Diana / Pexels" },
  excavator: { url: "https://images.pexels.com/photos/10410019/pexels-photo-10410019.jpeg?auto=compress&cs=tinysrgb&h=650&w=940", alt: "Hydraulic excavator at work", credit: "saravut vanset / Pexels" },
  construction: { url: "https://images.pexels.com/photos/33044594/pexels-photo-33044594.jpeg?auto=compress&cs=tinysrgb&h=650&w=940", alt: "Industrial construction site with steel columns", credit: "Oliver Dumlao / Pexels" },
  safety: { url: "https://images.pexels.com/photos/8488037/pexels-photo-8488037.jpeg?auto=compress&cs=tinysrgb&h=650&w=940", alt: "Hard hat and protective gloves", credit: "Kindel Media / Pexels" },
  warehouse: { url: "https://images.pexels.com/photos/7018662/pexels-photo-7018662.jpeg?auto=compress&cs=tinysrgb&h=650&w=940", alt: "Organized industrial warehouse shelving", credit: "cottonbro studio / Pexels" },
  technician: { url: "https://images.pexels.com/photos/1108101/pexels-photo-1108101.jpeg?auto=compress&cs=tinysrgb&h=650&w=940", alt: "Engineer repairing machinery in an industrial setting", credit: "Chevanon Photography / Pexels" },
} as const;

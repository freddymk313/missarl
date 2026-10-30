"use client";

import { useState } from "react";
import { Plus, Search, Truck, Phone, Mail, MapPin, X, Globe } from "lucide-react";
import { SupplierRecord } from "@/lib/db/suppliers";
import { createSupplierAction } from "@/actions/suppliers";
import { RefChip } from "@/components/dashboard/ui/ref-chip";

interface SuppliersManagerProps {
  initialSuppliers: SupplierRecord[];
}

export function SuppliersManager({ initialSuppliers }: SuppliersManagerProps) {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>(initialSuppliers);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.country && s.country.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await createSupplierAction(formData);
      if (!res.success) {
        setFormError(res.error || "Erreur de création");
      } else if (res.supplier) {
        setSuppliers((prev) => [...prev, res.supplier!]);
        setIsModalOpen(false);
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par nom, code fournisseur ou pays..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-full rounded-xl border border-border bg-card pl-10 pr-12 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            ⌘F
          </span>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs shrink-0 cursor-pointer"
        >
          <Plus className="size-4" /> Nouveau Fournisseur
        </button>
      </div>

      {/* Grid of Supplier Cards */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filteredSuppliers.length === 0 ? (
          <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed border-border rounded-2xl bg-card">
            <Truck className="mx-auto size-10 text-muted-foreground/40 mb-2" />
            <p className="font-bold text-foreground">Aucun fournisseur répertorié</p>
            <p className="text-xs text-muted-foreground mt-1">
              Modifiez votre recherche ou ajoutez un partenaire commercial.
            </p>
          </div>
        ) : (
          filteredSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="flex flex-col justify-between p-6 bg-card border border-border rounded-2xl shadow-xs hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <RefChip value={supplier.code} />
                  <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold text-foreground">
                    <Globe className="size-3 text-muted-foreground" />
                    {supplier.country || "International"}
                  </span>
                </div>

                <h3 className="mt-3 text-base font-black text-primary">{supplier.name}</h3>

                {supplier.contactPerson && (
                  <p className="mt-1 text-xs font-semibold text-foreground">
                    Interlocuteur: {supplier.contactPerson}
                  </p>
                )}

                {supplier.notes && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2 italic">
                    &ldquo;{supplier.notes}&rdquo;
                  </p>
                )}

                <div className="mt-4 space-y-1.5 border-t border-border/80 pt-3 text-xs text-muted-foreground">
                  {supplier.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="size-3.5 text-accent shrink-0" />
                      <span>{supplier.phone}</span>
                    </p>
                  )}
                  {supplier.email && (
                    <p className="flex items-center gap-2">
                      <Mail className="size-3.5 text-accent shrink-0" />
                      <span className="truncate">{supplier.email}</span>
                    </p>
                  )}
                  {supplier.address && (
                    <p className="flex items-start gap-2">
                      <MapPin className="size-3.5 text-accent shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{supplier.address}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Create */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-extrabold text-primary">Nouveau Fournisseur</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive border border-destructive/20">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground">Code *</label>
                  <input
                    name="code"
                    required
                    placeholder="FOURN-ATL"
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono uppercase text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-foreground">Raison Sociale *</label>
                  <input
                    name="name"
                    required
                    placeholder="Atlas Mining Supplies..."
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground">Pays d&apos;origine</label>
                  <input
                    name="country"
                    placeholder="RDC, Afrique du Sud, Belgique..."
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground">Contact / Représentant</label>
                  <input
                    name="contactPerson"
                    placeholder="Directeur commercial..."
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground">Téléphone</label>
                  <input
                    name="phone"
                    placeholder="+27 ... ou +243 ..."
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground">Email commercial</label>
                  <input
                    name="email"
                    type="email"
                    placeholder="sales@fournisseur.com"
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground">Adresse / Siège</label>
                <input
                  name="address"
                  placeholder="Ville, Province, Pays..."
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground">Spécialité / Notes techniques</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Pièces d'usure, robinetterie industrielle, câblage..."
                  className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Enregistrement..." : "Créer le fournisseur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

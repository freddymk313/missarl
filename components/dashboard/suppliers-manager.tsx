"use client";

import * as React from "react";
import {
  Truck,
  Plus,
  Phone,
  Mail,
  MapPin,
  Eye,
  Globe,
  Loader2,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { SupplierRecord } from "@/lib/db/suppliers";
import { createSupplierAction } from "@/actions/suppliers";
import {
  PageHeader,
  DataTable,
  DataTableToolbar,
  RefChip,
  KeyValueTile,
  DetailSheet,
} from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";

interface SuppliersManagerProps {
  initialSuppliers: SupplierRecord[];
}

export function SuppliersManager({ initialSuppliers }: SuppliersManagerProps) {
  const [suppliers, setSuppliers] = React.useState<SupplierRecord[]>(initialSuppliers);
  const [searchTerm, setSearchTerm] = React.useState("");

  // Create sheet state
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  // Detail sheet state
  const [selectedSupplier, setSelectedSupplier] = React.useState<SupplierRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);

  const filteredSuppliers = React.useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.country && s.country.toLowerCase().includes(q)) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q))
    );
  }, [suppliers, searchTerm]);

  const handleOpenDetail = (s: SupplierRecord) => {
    setSelectedSupplier(s);
    setIsDetailOpen(true);
  };

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

  const columns = React.useMemo<ColumnDef<SupplierRecord>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Code Fournisseur",
        cell: ({ row }) => (
          <RefChip variant="primary">{row.original.code}</RefChip>
        ),
      },
      {
        accessorKey: "name",
        header: "Fabricant / Importateur",
        cell: ({ row }) => (
          <div>
            <span className="font-bold text-foreground block truncate">
              {row.original.name}
            </span>
            {row.original.contactPerson && (
              <span className="text-[11px] text-muted-foreground block">
                Contact: {row.original.contactPerson}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "country",
        header: "Pays d'origine",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Globe className="size-3 text-muted-foreground shrink-0" />
            <span>{row.original.country || "International"}</span>
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: "Coordonnées",
        cell: ({ row }) => (
          <div className="space-y-0.5 text-xs text-muted-foreground">
            {row.original.email && (
              <div className="flex items-center gap-1.5 truncate">
                <Mail className="size-3 shrink-0" />
                <span className="truncate">{row.original.email}</span>
              </div>
            )}
            {row.original.phone && (
              <div className="flex items-center gap-1.5 tabular-nums">
                <Phone className="size-3 shrink-0" />
                <span>{row.original.phone}</span>
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "notes",
        header: "Spécialité & Gammes",
        cell: ({ row }) => (
          <span className="text-muted-foreground line-clamp-1 max-w-[240px]">
            {row.original.notes || "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDetail(row.original);
              }}
              className="flex size-8 items-center justify-center rounded-lg border border-border/80 bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors ml-auto"
              title="Consulter"
            >
              <Eye className="size-3.5" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        title="Fournisseurs Industriels"
        description={`${suppliers.length} partenaire${suppliers.length > 1 ? "s" : ""} et distributeur${suppliers.length > 1 ? "s" : ""} certifié${suppliers.length > 1 ? "s" : ""}`}
        icon={<Truck className="size-5" />}
        actions={
          <Button
            onClick={() => {
              setFormError("");
              setIsModalOpen(true);
            }}
            className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
          >
            <Plus className="size-3.5" />
            <span>Nouveau fournisseur</span>
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={filteredSuppliers}
        onRowClick={handleOpenDetail}
        toolbar={
          <DataTableToolbar
            searchPlaceholder="Rechercher par nom, code ou pays..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            onAddNew={() => {
              setFormError("");
              setIsModalOpen(true);
            }}
            addNewLabel="Nouveau fournisseur"
          />
        }
        renderMobileCard={(s) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <RefChip variant="primary">{s.code}</RefChip>
              <span className="text-xs text-muted-foreground">{s.country || "International"}</span>
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">{s.name}</p>
              {s.contactPerson && (
                <p className="text-xs text-muted-foreground mt-0.5">Contact: {s.contactPerson}</p>
              )}
            </div>
            {s.notes && (
              <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                {s.notes}
              </p>
            )}
          </div>
        )}
      />

      {/* Detail Sheet */}
      {selectedSupplier && (
        <DetailSheet
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          title={selectedSupplier.name}
          subtitle={`Réf. Fournisseur: ${selectedSupplier.code}`}
          badge={<RefChip variant="primary">{selectedSupplier.country || "International"}</RefChip>}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              <KeyValueTile
                label="Interlocuteur privilégié"
                value={selectedSupplier.contactPerson || "Non spécifié"}
              />
              <KeyValueTile
                label="Pays d'origine"
                value={selectedSupplier.country || "International"}
                icon={<Globe className="size-3.5" />}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <KeyValueTile
                label="Téléphone"
                value={selectedSupplier.phone || "—"}
                icon={<Phone className="size-3.5" />}
              />
              <KeyValueTile
                label="Email"
                value={selectedSupplier.email || "—"}
                icon={<Mail className="size-3.5" />}
              />
            </div>

            <KeyValueTile
              label="Adresse & Siège"
              value={selectedSupplier.address || "—"}
              icon={<MapPin className="size-3.5" />}
            />

            {selectedSupplier.notes && (
              <div className="rounded-xl border border-border/80 bg-secondary/40 p-3.5 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Spécialités & Équipements fournis
                </span>
                <p className="text-xs text-foreground leading-relaxed font-medium">
                  {selectedSupplier.notes}
                </p>
              </div>
            )}
          </div>
        </DetailSheet>
      )}

      {/* Create Supplier Sheet */}
      <DetailSheet
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title="Nouveau Fournisseur"
        subtitle="Enregistrez les coordonnées d'un fabricant partenaire ou distributeur minier."
      >
        {formError && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Code Fournisseur *
              </label>
              <input
                type="text"
                name="code"
                required
                placeholder="Ex: FOURN-KSB"
                className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs font-semibold text-foreground outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Pays d&apos;origine
              </label>
              <input
                type="text"
                name="country"
                placeholder="Ex: Afrique du Sud, RDC..."
                className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Raison Sociale / Nom du fabricant *
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="Ex: KSB Pumps Distribution"
              className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs font-medium text-foreground outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Contact commercial
              </label>
              <input
                type="text"
                name="contactPerson"
                placeholder="Nom du responsable"
                className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Téléphone
              </label>
              <input
                type="text"
                name="phone"
                placeholder="+27 / +243 ..."
                className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              placeholder="sales@fournisseur.com"
              className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Adresse physique
            </label>
            <textarea
              name="address"
              rows={2}
              placeholder="Adresse d'entrepôt ou usine..."
              className="w-full rounded-lg border border-input bg-card p-2 text-xs outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Spécialités & Remarques
            </label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Tuyauterie, pompes, vannes, automatismes..."
              className="w-full rounded-lg border border-input bg-card p-2 text-xs outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              className="h-8 text-xs"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              size="sm"
              className="h-8 bg-primary text-primary-foreground text-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3 animate-spin mr-1" />
                  Création...
                </>
              ) : (
                "Créer le fournisseur"
              )}
            </Button>
          </div>
        </form>
      </DetailSheet>
    </div>
  );
}

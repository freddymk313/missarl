"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  Building2,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { ClientRecord } from "@/lib/db/clients";
import { createClientAction } from "@/actions/clients";
import {
  PageHeader,
  DataTable,
  DataTableToolbar,
  RefChip,
  StatusPill,
  DetailSheet,
} from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";

interface ClientsManagerProps {
  initialClients: ClientRecord[];
}

export function ClientsManager({ initialClients }: ClientsManagerProps) {
  const [clients, setClients] = React.useState<ClientRecord[]>(initialClients);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  const filteredClients = React.useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [clients, searchTerm]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await createClientAction(formData);
      if (!res.success) {
        setFormError(res.error || "Erreur de création du compte client.");
      } else if (res.client) {
        setClients((prev) => [res.client!, ...prev]);
        setIsModalOpen(false);
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = React.useMemo<ColumnDef<ClientRecord>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Code Client",
        cell: ({ row }) => (
          <RefChip variant="primary">{row.original.code}</RefChip>
        ),
      },
      {
        accessorKey: "name",
        header: "Société / Raison Sociale",
        cell: ({ row }) => (
          <div>
            <Link
              href={`/dashboard/clients/${row.original.id}`}
              className="font-bold text-foreground hover:text-primary transition-colors hover:underline block"
            >
              {row.original.name}
            </Link>
            {row.original.contactPerson && (
              <span className="text-[11px] text-muted-foreground block">
                Contact: {row.original.contactPerson}
              </span>
            )}
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
                <Mail className="size-3 text-muted-foreground shrink-0" />
                <span className="truncate">{row.original.email}</span>
              </div>
            )}
            {row.original.phone && (
              <div className="flex items-center gap-1.5 tabular-nums">
                <Phone className="size-3 text-muted-foreground shrink-0" />
                <span>{row.original.phone}</span>
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "deliveryAddress",
        header: "Site de livraison",
        cell: ({ row }) => (
          <span className="text-muted-foreground line-clamp-1 max-w-[200px]">
            {row.original.deliveryAddress || "—"}
          </span>
        ),
      },
      {
        accessorKey: "isActive",
        header: "État",
        cell: ({ row }) => (
          <StatusPill status={row.original.isActive ? "ACTIVE" : "INACTIVE"} />
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <Link
              href={`/dashboard/clients/${row.original.id}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/80 bg-secondary/50 px-2.5 text-xs font-semibold text-foreground hover:bg-secondary hover:text-primary transition-colors"
            >
              <span>Dossier</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        title="Portefeuille Clients"
        description={`${clients.length} compte${clients.length > 1 ? "s" : ""} client${clients.length > 1 ? "s" : ""} configuré${clients.length > 1 ? "s" : ""}`}
        icon={<Building2 className="size-5" />}
        actions={
          <Button
            onClick={() => {
              setFormError("");
              setIsModalOpen(true);
            }}
            className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
          >
            <Plus className="size-3.5" />
            <span>Nouveau client</span>
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={filteredClients}
        toolbar={
          <DataTableToolbar
            searchPlaceholder="Rechercher par société, code, contact..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            onAddNew={() => {
              setFormError("");
              setIsModalOpen(true);
            }}
            addNewLabel="Nouveau client"
          />
        }
        renderMobileCard={(client) => (
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <RefChip variant="primary">{client.code}</RefChip>
              <StatusPill status={client.isActive ? "ACTIVE" : "INACTIVE"} />
            </div>
            <div>
              <Link
                href={`/dashboard/clients/${client.id}`}
                className="font-bold text-sm text-foreground hover:text-primary hover:underline block"
              >
                {client.name}
              </Link>
              {client.contactPerson && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Contact: {client.contactPerson}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
              <span className="text-muted-foreground truncate max-w-[200px]">
                {client.phone || client.email || "Aucun contact"}
              </span>
              <Link
                href={`/dashboard/clients/${client.id}`}
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
              >
                <span>Accéder</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        )}
      />

      {/* Create Client Sheet */}
      <DetailSheet
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title="Nouveau Client"
        subtitle="Créez un compte client pour lui attribuer des devis et factures avec référence dédiée."
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
                Code Client *
              </label>
              <input
                type="text"
                name="code"
                required
                placeholder="Ex: CLI-KCC"
                className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs font-semibold text-foreground outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Identifiant Fiscal (NIF)
              </label>
              <input
                type="text"
                name="taxId"
                placeholder="Ex: A09123456Z"
                className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Raison Sociale / Nom de l&apos;entreprise *
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="Ex: Kamoto Copper Company (KCC)"
              className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs font-medium text-foreground outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Personne de contact
              </label>
              <input
                type="text"
                name="contactPerson"
                placeholder="Nom du responsable achats"
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
                placeholder="+243 ..."
                className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Email professionnel
            </label>
            <input
              type="email"
              name="email"
              placeholder="achats@client.cd"
              className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Adresse de facturation
            </label>
            <textarea
              name="billingAddress"
              rows={2}
              placeholder="Siège social, avenue, commune, ville..."
              className="w-full rounded-lg border border-input bg-card p-2.5 text-xs outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Site de livraison usuel
            </label>
            <textarea
              name="deliveryAddress"
              rows={2}
              placeholder="Mine site, porte, magasin central..."
              className="w-full rounded-lg border border-input bg-card p-2.5 text-xs outline-none"
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
                  Enregistrement...
                </>
              ) : (
                "Créer le compte client"
              )}
            </Button>
          </div>
        </form>
      </DetailSheet>
    </div>
  );
}

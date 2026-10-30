"use client";

import * as React from "react";
import {
  Plus,
  Package,
  Edit2,
  DollarSign,
  Building,
  Tag,
  Boxes,
  Loader2,
  LayoutGrid,
  List as ListIcon,
  Eye,
  Check,
} from "lucide-react";
import { ItemRecord } from "@/lib/db/items";
import { SupplierRecord } from "@/lib/db/suppliers";
import { UserRole } from "@/lib/permissions";
import { createItemAction, updateItemAction } from "@/actions/items";
import {
  PageHeader,
  DataTableToolbar,
  MoneyText,
  RefChip,
  KeyValueTile,
  DetailSheet,
  EmptyState,
} from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";

interface ArticlesManagerProps {
  initialItems: ItemRecord[];
  suppliers: SupplierRecord[];
  role: UserRole;
}

export function ArticlesManager({
  initialItems,
  suppliers,
  role,
}: ArticlesManagerProps) {
  const [items, setItems] = React.useState<ItemRecord[]>(initialItems);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("ALL");
  const [selectedSupplier, setSelectedSupplier] = React.useState<string>("ALL");
  const [viewMode, setViewMode] = React.useState<"cards" | "table">(
    role === "PRICE_COLLECTOR" ? "cards" : "table"
  );

  // Sheet detail & edit state
  const [selectedItem, setSelectedItem] = React.useState<ItemRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);

  // Create modal sheet state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  const canManage = role === "SUPER_ADMIN";

  // Filter items
  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        item.description.toLowerCase().includes(q) ||
        item.skuRef.toLowerCase().includes(q) ||
        (item.brand && item.brand.toLowerCase().includes(q)) ||
        (item.supplierName && item.supplierName.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === "ALL" || item.category === selectedCategory;

      const matchesSupplier =
        selectedSupplier === "ALL" || item.supplierId === selectedSupplier;

      return matchesSearch && matchesCategory && matchesSupplier;
    });
  }, [items, searchTerm, selectedCategory, selectedSupplier]);

  const categories = React.useMemo(() => {
    return Array.from(
      new Set(items.map((i) => i.category).filter(Boolean) as string[])
    );
  }, [items]);

  const handleOpenDetail = (item: ItemRecord) => {
    setSelectedItem(item);
    setIsEditing(false);
    setFormError("");
    setIsDetailOpen(true);
  };

  const handleOpenCreate = () => {
    setSelectedItem(null);
    setFormError("");
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await createItemAction(formData);
      if (!res.success) {
        setFormError(res.error || "Erreur de création de l'article.");
      } else if (res.item) {
        setItems((prev) => [res.item!, ...prev]);
        setIsCreateOpen(false);
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedItem) return;
    setFormError("");
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await updateItemAction(selectedItem.id, {
        skuRef: formData.get("skuRef")?.toString(),
        description: formData.get("description")?.toString(),
        category: formData.get("category")?.toString(),
        unit: formData.get("unit")?.toString(),
        brand: formData.get("brand")?.toString(),
        supplierId: formData.get("supplierId")?.toString() || undefined,
        purchasePrice: parseFloat(formData.get("purchasePrice")?.toString() || "0"),
        sellingPrice: parseFloat(formData.get("sellingPrice")?.toString() || "0"),
        stockQuantity: parseFloat(formData.get("stockQuantity")?.toString() || "0"),
        minStockLevel: parseFloat(formData.get("minStockLevel")?.toString() || "0"),
      });

      if (!res.success) {
        setFormError(res.error || "Erreur de mise à jour de l'article.");
      } else if (res.item) {
        setItems((prev) =>
          prev.map((i) => (i.id === selectedItem.id ? res.item! : i))
        );
        setSelectedItem(res.item);
        setIsEditing(false);
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page Header */}
      <PageHeader
        title="Articles & Tarifs"
        description={`${filteredItems.length} article${filteredItems.length > 1 ? "s" : ""} référencé${filteredItems.length > 1 ? "s" : ""} au catalogue`}
        icon={<Package className="size-5" />}
        actions={
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-border/80 bg-card p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`flex size-8 items-center justify-center rounded-md text-xs font-semibold transition-colors ${
                  viewMode === "cards"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Affichage en cartes"
              >
                <LayoutGrid className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex size-8 items-center justify-center rounded-md text-xs font-semibold transition-colors ${
                  viewMode === "table"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Affichage en tableau"
              >
                <ListIcon className="size-3.5" />
              </button>
            </div>

            {canManage && (
              <Button
                onClick={handleOpenCreate}
                className="h-9 gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="size-3.5" />
                <span>Créer un article</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Role notice for Price Collector */}
      {role === "PRICE_COLLECTOR" && (
        <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-primary">
          <DollarSign className="size-4 shrink-0 text-primary" />
          <span>
            Mode Consultation Catalogue : vous consultez les caractéristiques techniques, marques et tarifs de vente en USD.
          </span>
        </div>
      )}

      {/* Toolbar / Search & Filters */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
        <DataTableToolbar
          searchPlaceholder="Rechercher par désignation, réf. SKU, marque..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          activeFilterCount={
            (selectedCategory !== "ALL" ? 1 : 0) +
            (selectedSupplier !== "ALL" ? 1 : 0)
          }
          filterContent={
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Catégorie
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-card px-2.5 text-xs font-medium text-foreground outline-none"
                >
                  <option value="ALL">Toutes les catégories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Fournisseur
                </label>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-card px-2.5 text-xs font-medium text-foreground outline-none"
                >
                  <option value="ALL">Tous les fournisseurs</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory("ALL");
                    setSelectedSupplier("ALL");
                  }}
                  className="h-7 text-xs text-muted-foreground"
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
          }
        />

        {/* Content View: Cards Mode (Screenshot 2 pattern) */}
        {viewMode === "cards" ? (
          filteredItems.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Package className="size-6" />}
                title="Aucun article trouvé"
                description="Essayez de modifier vos filtres ou termes de recherche."
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenDetail(item)}
                  className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-2xs hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <RefChip variant="primary">{item.skuRef}</RefChip>
                      <span className="text-xs font-medium text-muted-foreground">
                        {item.unit}
                      </span>
                    </div>

                    <h3 className="mt-3 text-sm font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {item.description}
                    </h3>

                    {/* Mini attribute tiles */}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <KeyValueTile
                        label="Catégorie"
                        value={item.category || "Standard"}
                      />
                      <KeyValueTile
                        label="Marque"
                        value={item.brand || "—"}
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/70 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block">
                        Prix unitaire
                      </span>
                      <MoneyText
                        value={item.sellingPrice}
                        className="text-base font-extrabold text-primary"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(item);
                        }}
                        className="flex size-8 items-center justify-center rounded-lg border border-border/80 bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                        title="Détails"
                      >
                        <Eye className="size-3.5" />
                      </button>
                      {canManage && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(item);
                            setIsEditing(true);
                            setIsDetailOpen(true);
                          }}
                          className="flex size-8 items-center justify-center rounded-lg border border-border/80 bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Content View: Table Mode */
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-secondary/40 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Réf. SKU</th>
                  <th className="py-3 px-4">Désignation</th>
                  <th className="py-3 px-4">Catégorie</th>
                  <th className="py-3 px-4">Unité</th>
                  <th className="py-3 px-4">Marque</th>
                  {canManage && <th className="py-3 px-4 text-right">Prix d&apos;achat</th>}
                  <th className="py-3 px-4 text-right">Prix de vente</th>
                  <th className="py-3 px-4 text-center">Stock</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canManage ? 9 : 8}
                      className="py-12 text-center text-muted-foreground"
                    >
                      <Package className="mx-auto size-7 text-muted-foreground/40 mb-2" />
                      Aucun article ne correspond à votre recherche.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => handleOpenDetail(item)}
                      className="hover:bg-secondary/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-semibold text-foreground">
                        <RefChip>{item.skuRef}</RefChip>
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground max-w-xs">
                        <span className="line-clamp-1">{item.description}</span>
                        {item.supplierName && (
                          <span className="text-[10px] text-muted-foreground block truncate">
                            Fourn: {item.supplierName}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {item.category || "—"}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        {item.unit}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {item.brand || "—"}
                      </td>
                      {canManage && (
                        <td className="py-3 px-4 text-right">
                          <MoneyText
                            value={item.purchasePrice}
                            className="text-muted-foreground"
                          />
                        </td>
                      )}
                      <td className="py-3 px-4 text-right">
                        <MoneyText
                          value={item.sellingPrice}
                          className="font-bold text-primary text-sm"
                        />
                      </td>
                      <td className="py-3 px-4 text-center tabular-nums text-foreground">
                        {item.stockQuantity}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(item);
                            }}
                            className="flex size-7 items-center justify-center rounded-lg border border-border/80 bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            title="Consulter"
                          >
                            <Eye className="size-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Right Detail Sheet */}
      {selectedItem && (
        <DetailSheet
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          title={selectedItem.description}
          subtitle={`Réf: ${selectedItem.skuRef}`}
          badge={<RefChip variant="primary">{selectedItem.category || "Général"}</RefChip>}
          footer={
            canManage && !isEditing ? (
              <Button
                type="button"
                onClick={() => setIsEditing(true)}
                className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
              >
                <Edit2 className="size-3.5" />
                <span>Modifier cet article</span>
              </Button>
            ) : null
          }
        >
          {formError && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              {formError}
            </div>
          )}

          {isEditing && canManage ? (
            /* Edit Form inside the sheet */
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Référence SKU *
                </label>
                <input
                  type="text"
                  name="skuRef"
                  defaultValue={selectedItem.skuRef}
                  required
                  className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs font-semibold text-foreground outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Désignation complète *
                </label>
                <textarea
                  name="description"
                  defaultValue={selectedItem.description}
                  required
                  rows={3}
                  className="w-full rounded-lg border border-input bg-card p-2.5 text-xs font-medium text-foreground outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Catégorie
                  </label>
                  <input
                    type="text"
                    name="category"
                    defaultValue={selectedItem.category || ""}
                    className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Unité de mesure *
                  </label>
                  <input
                    type="text"
                    name="unit"
                    defaultValue={selectedItem.unit}
                    required
                    className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Marque
                  </label>
                  <input
                    type="text"
                    name="brand"
                    defaultValue={selectedItem.brand || ""}
                    className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Fournisseur
                  </label>
                  <select
                    name="supplierId"
                    defaultValue={selectedItem.supplierId || ""}
                    className="h-9 w-full rounded-lg border border-input bg-card px-2 text-xs outline-none"
                  >
                    <option value="">Aucun fournisseur associé</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Prix d&apos;achat ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="purchasePrice"
                    defaultValue={selectedItem.purchasePrice}
                    className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Prix de vente ($ USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="sellingPrice"
                    defaultValue={selectedItem.sellingPrice}
                    required
                    className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs font-bold text-primary outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Stock en magasin
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="stockQuantity"
                    defaultValue={selectedItem.stockQuantity}
                    className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Seuil minimum
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="minStockLevel"
                    defaultValue={selectedItem.minStockLevel}
                    className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
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
                    "Enregistrer les modifications"
                  )}
                </Button>
              </div>
            </form>
          ) : (
            /* Read-only details view */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                <KeyValueTile
                  label="Prix de vente en vigueur"
                  value={<MoneyText value={selectedItem.sellingPrice} className="text-primary font-extrabold text-sm" />}
                  icon={<DollarSign className="size-3.5" />}
                />
                <KeyValueTile
                  label="Unité de facturation"
                  value={selectedItem.unit}
                  icon={<Tag className="size-3.5" />}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <KeyValueTile
                  label="Marque fabricant"
                  value={selectedItem.brand || "Non spécifiée"}
                />
                <KeyValueTile
                  label="Fournisseur principal"
                  value={selectedItem.supplierName || "—"}
                  icon={<Building className="size-3.5" />}
                />
              </div>

              {canManage && (
                <div className="grid grid-cols-2 gap-2.5">
                  <KeyValueTile
                    label="Prix d'achat référentiel"
                    value={<MoneyText value={selectedItem.purchasePrice} />}
                  />
                  <KeyValueTile
                    label="Niveau de stock actuel"
                    value={`${selectedItem.stockQuantity} ${selectedItem.unit}`}
                    icon={<Boxes className="size-3.5" />}
                  />
                </div>
              )}

              <div className="rounded-xl border border-border/80 bg-secondary/40 p-3.5 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Désignation technique complète
                </span>
                <p className="text-xs text-foreground leading-relaxed font-medium">
                  {selectedItem.description}
                </p>
              </div>
            </div>
          )}
        </DetailSheet>
      )}

      {/* Create New Item Sheet */}
      {canManage && (
        <DetailSheet
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          title="Nouvel Article au Catalogue"
          subtitle="Ajoutez un article avec ses caractéristiques et son prix de vente standard en USD."
        >
          {formError && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              {formError}
            </div>
          )}

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Référence SKU *
              </label>
              <input
                type="text"
                name="skuRef"
                required
                placeholder="Ex: ROB-VAN-DN100"
                className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs font-semibold text-foreground outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Désignation technique *
              </label>
              <textarea
                name="description"
                required
                rows={3}
                placeholder="Description complète, caractéristiques et dimensions..."
                className="w-full rounded-lg border border-input bg-card p-2.5 text-xs font-medium text-foreground outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Catégorie
                </label>
                <input
                  type="text"
                  name="category"
                  placeholder="Ex: Électromécanique"
                  className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Unité de mesure *
                </label>
                <input
                  type="text"
                  name="unit"
                  defaultValue="Pce"
                  required
                  placeholder="Pce, Rouleau, Kit..."
                  className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Marque
                </label>
                <input
                  type="text"
                  name="brand"
                  placeholder="Ex: Schneider, KSB..."
                  className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Fournisseur associé
                </label>
                <select
                  name="supplierId"
                  className="h-9 w-full rounded-lg border border-input bg-card px-2 text-xs outline-none"
                >
                  <option value="">Sélectionner un fournisseur</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Prix d&apos;achat ($ USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="purchasePrice"
                  defaultValue="0"
                  className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Prix de vente ($ USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="sellingPrice"
                  required
                  defaultValue="0"
                  className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs font-bold text-primary outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Stock initial
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="stockQuantity"
                  defaultValue="0"
                  className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Seuil d&apos;alerte stock
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="minStockLevel"
                  defaultValue="0"
                  className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
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
                    Création en cours...
                  </>
                ) : (
                  "Créer l'article"
                )}
              </Button>
            </div>
          </form>
        </DetailSheet>
      )}
    </div>
  );
}

import type { EconomicsConfig } from "./config";
import type { JobScope } from "./scope";
import { safeCents, type Cents } from "./money";

export interface MaterialLine {
  recipe: string;
  label: string;
  qty: number;
  unitCostCents: Cents;
  costCents: Cents;
  /** Where this line came from, for the audit trail. */
  basis: string;
}

export interface MaterialBreakdown {
  lines: MaterialLine[];
  costCents: Cents;
  markupCents: Cents;
  chargeCents: Cents;
}

function addRecipe(lines: MaterialLine[], cfg: EconomicsConfig, recipeId: string, times: number, basis: string) {
  const recipe = cfg.recipes[recipeId];
  if (!recipe || times <= 0) return;
  for (const line of recipe.lines) {
    const qty = line.qty * times;
    lines.push({
      recipe: recipeId,
      label: line.label,
      qty,
      unitCostCents: line.unitCostCents,
      costCents: safeCents(qty * line.unitCostCents),
      basis,
    });
  }
}

/** Choose and cost material recipes from scope. Selection is code; quantities and costs are config. */
export function computeMaterials(scope: JobScope, cfg: EconomicsConfig): MaterialBreakdown {
  const lines: MaterialLine[] = [];
  let drywallLike = 0;
  let masonry = 0;
  let steel = 0;
  let outlets = 0;
  let raceways = 0;
  let inWall = 0;

  for (const tv of scope.tvs) {
    if (tv.wall === "brick" || tv.wall === "stone") masonry += 1;
    else if (tv.wall === "steel") steel += 1;
    else drywallLike += 1;

    if (tv.power === "outlet") outlets += 1;
    if (tv.wire === "raceway") raceways += 1;
    if (tv.wire === "in_wall") inWall += 1;

    if (tv.mountSource === "pptv" && tv.mountType) {
      const key = `${tv.mountType}:${tv.sizeBand}` as keyof EconomicsConfig["mountCostsCents"];
      const cost = cfg.mountCostsCents[key] ?? 0;
      lines.push({
        recipe: "pptv_mount",
        label: `PPTV mount (${tv.mountType.replace("_", " ")}, ${tv.sizeBand})`,
        qty: 1,
        unitCostCents: cost,
        costCents: cost,
        basis: `mountCostsCents[${key}]`,
      });
    }
  }

  addRecipe(lines, cfg, "standard_drywall_install", drywallLike, "per TV on drywall/unknown wall");
  addRecipe(lines, cfg, "masonry_install", masonry, "per TV on brick/stone");
  addRecipe(lines, cfg, "steel_install", steel, "per TV on steel/high-rise");
  addRecipe(lines, cfg, "outlet_clean_cord", outlets, "per outlet behind TV");
  addRecipe(lines, cfg, "surface_raceway", raceways, "per TV with raceway");
  addRecipe(lines, cfg, "in_wall_low_voltage", inWall, "per TV with in-wall low-voltage");
  if (scope.cleanup === "patching") addRecipe(lines, cfg, "patching", 1, "cleanup: patching");
  if (scope.cleanup === "haul_away") addRecipe(lines, cfg, "haul_away", 1, "cleanup: haul-away");

  for (const extra of scope.extras) {
    if (extra.kind === "custom" && extra.customMaterialsCents) {
      const cost = extra.customMaterialsCents * extra.qty;
      lines.push({
        recipe: "custom_extra",
        label: extra.label ?? "Custom extra materials",
        qty: extra.qty,
        unitCostCents: extra.customMaterialsCents,
        costCents: cost,
        basis: "owner-entered custom materials",
      });
    }
  }

  const costCents = lines.reduce((sum, l) => sum + l.costCents, 0);
  const markupCents = safeCents(costCents * cfg.business.materialMarkupPct);
  return { lines, costCents, markupCents, chargeCents: costCents + markupCents };
}

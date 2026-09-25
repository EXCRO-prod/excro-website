// Per-entity-type configuration (spec 13's entity table), kept as data so a new entity type or a
// changed document list is a config edit, not an engine change — same spirit as the domain's
// placeholder registry.
export type EntityType = "company" | "llp" | "partnership" | "proprietorship" | "trust";

export const DOC_KINDS = [
  "incorporation_certificate", "moa_aoa", "llp_agreement", "partnership_deed", "trust_deed",
  "board_resolution", "authorisation_letter", "address_proof",
  "gstin_certificate", "udyam_certificate", "shop_establishment_certificate",
] as const;
export type DocKind = (typeof DOC_KINDS)[number];
export const AUTHORITY_DOC_KINDS: readonly DocKind[] = ["board_resolution", "authorisation_letter"];

/** A required "slot": at least one of these kinds must be uploaded. */
export type DocSlot = DocKind[];

export interface EntityTypeRules {
  /** Proprietorships have no entity-level PAN/GSTIN/MCA check: they use the proprietor's own. */
  hasEntityChecks: boolean;
  /** Spec 13's entity table lists GSTIN for company/LLP/partnership but not trust or proprietorship. */
  needsGstin: boolean;
  needsMca: false | "CIN" | "LLPIN";
  requiredDocs: DocSlot[];
  /** Minimum number of slots from requiredDocs that must be satisfied (proprietorship: "two business proofs"). */
  minSlotsSatisfied: number;
  needsBeneficialOwners: boolean;
}

// The authority document (board_resolution / authorisation_letter) is deliberately NOT part of any
// type's requiredDocs below: spec 13 makes it one of two alternatives ("on MCA, OR named in the
// uploaded resolution/authorisation letter"), checked on its own in kyc/entity.ts's submitEntity.
// Folding it into requiredDocs as an unconditional slot would make the MCA alternative unreachable
// — the document would always be mandatory regardless of what MCA shows.
export const ENTITY_RULES: Record<EntityType, EntityTypeRules> = {
  company: {
    hasEntityChecks: true,
    needsGstin: true,
    needsMca: "CIN",
    requiredDocs: [["incorporation_certificate"], ["moa_aoa"], ["address_proof"]],
    minSlotsSatisfied: 3,
    needsBeneficialOwners: true,
  },
  llp: {
    hasEntityChecks: true,
    needsGstin: true,
    needsMca: "LLPIN",
    requiredDocs: [["llp_agreement"]],
    minSlotsSatisfied: 1,
    needsBeneficialOwners: true,
  },
  partnership: {
    hasEntityChecks: true,
    needsGstin: true,
    needsMca: false,
    requiredDocs: [["partnership_deed"]],
    minSlotsSatisfied: 1,
    needsBeneficialOwners: true,
  },
  trust: {
    hasEntityChecks: true,
    needsGstin: false, // spec 13's trust row lists only "Entity PAN; registration" — no GSTIN line
    needsMca: false,
    requiredDocs: [["trust_deed"]],
    minSlotsSatisfied: 1,
    needsBeneficialOwners: false, // trustees are named, not a beneficial-ownership percentage
  },
  proprietorship: {
    hasEntityChecks: false,
    needsGstin: false,
    needsMca: false,
    requiredDocs: [["gstin_certificate", "udyam_certificate"], ["shop_establishment_certificate"]],
    minSlotsSatisfied: 2,
    needsBeneficialOwners: false,
  },
};

export function docsSatisfied(requiredDocs: DocSlot[], minSlotsSatisfied: number, uploadedKinds: Set<DocKind>): { satisfiedSlots: number; missing: DocSlot[] } {
  let satisfiedSlots = 0;
  const missing: DocSlot[] = [];
  for (const slot of requiredDocs) {
    if (slot.some((k) => uploadedKinds.has(k))) satisfiedSlots++;
    else missing.push(slot);
  }
  // A partially-met slot list can still fall short of minSlotsSatisfied; report the unmet slots either way.
  return { satisfiedSlots, missing: satisfiedSlots >= minSlotsSatisfied ? [] : missing };
}

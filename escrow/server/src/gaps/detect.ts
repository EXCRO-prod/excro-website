// Gap scan (spec 12 step 4): the three kinds of finding shown to both parties after extraction.
// Mandatory and advisory gaps come straight from the placeholder registry (domain/params.ts) — the
// same "required means it blocks signing until set, even to an explicit value" rule the money-map
// validator already enforces, so a gap can never be "resolved" into a state the validator would
// reject. Conflicts come from reader/conflicts.ts's text patterns.
import { openAdvisoryGaps, openMandatoryGaps, type Terms } from "../domain/params.js";
import { detectConflicts, type ConflictFinding } from "../reader/conflicts.js";
import { gapDef, type GapDef } from "./library.js";

export interface GapScan {
  mandatory: GapDef[];
  advisory: GapDef[];
  conflicts: ConflictFinding[];
}

/** Force majeure has no schedule term to check (it's outside Phase 1's outcome model, spec 12), so
 * its "is it missing" test is the one place gap detection looks at the raw text instead of Terms. */
function hasForceMajeureClause(sourceText: string): boolean {
  return /force\s+majeure/i.test(sourceText);
}

export function scanGaps(terms: Terms, sourceText: string): GapScan {
  const advisory = openAdvisoryGaps(terms).map((id) => gapDef(id));
  if (!hasForceMajeureClause(sourceText)) advisory.push(gapDef("force_majeure"));
  return {
    mandatory: openMandatoryGaps(terms).map((id) => gapDef(id)),
    advisory,
    conflicts: detectConflicts(sourceText),
  };
}

// Regenerates the frontend's copy of the permission catalog from this
// backend's constants/permissions.ts, so a renamed/removed permission key
// fails the frontend's `tsc --noEmit` instead of silently leaving a stale
// string that never matches anything the backend actually grants.
//
// Run after editing backend/src/constants/permissions.ts:
//   npm run sync:permissions
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PERMISSION_CATALOG } from "../src/constants/permissions.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.resolve(__dirname, "../../frontend/src/lib/generated/permissions.ts");

const entries = PERMISSION_CATALOG.map((p) => {
  const constName = p.key.toUpperCase().replace(/[:-]/g, "_");
  return `  ${constName}: ${JSON.stringify(p.key)},`;
}).join("\n");

const contents = `// GENERATED FILE — do not hand-edit.
// Source of truth: backend/src/constants/permissions.ts
// Regenerate with \`npm run sync:permissions\` in backend/ after changing it,
// then commit the diff. Every feature's constants.ts should reference these
// keys (not re-declare string literals) so a backend rename/removal becomes
// a compile error here instead of a silently-stale permission check.
export const PERMISSIONS = {
${entries}
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
`;

await writeFile(outPath, contents, "utf8");
console.log(`Wrote ${PERMISSION_CATALOG.length} permission keys to ${path.relative(process.cwd(), outPath)}`);

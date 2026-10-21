// Render's current pre-deploy command is "npm run db:push".
// This script deliberately performs NO database operations. Drizzle push can
// change/drop production schema without an approved migration or backup.
// A reviewed migration is run separately with "npm run db:push:manual" only
// against an inspected, backed-up target database.
console.info("[schema] Automatic schema push disabled. No database changes were made.");

/**
 * Canonical built-in sort and filter option definitions.
 * Imported by:
 *   - server/prisma/seed-sorts.js    (CLI seed script)
 *   - server/prisma/seed-filters.js  (CLI seed script)
 *   - server/src/controllers/clients.controller.js  (auto-seed on client create)
 */

// ─── Built-in Sort Options ────────────────────────────────────────────────────
// sortValue must match a key in contacts.controller SORT_MAP or use csort: prefix.

export const BUILT_IN_SORTS = [
  { label: 'Newest first',                 sortValue: 'recent',       contactField: 'lastActivityAt', direction: 'desc', isActive: true,  displayOrder: 0  },
  { label: 'Oldest first',                 sortValue: 'old',          contactField: 'lastActivityAt', direction: 'asc',  isActive: true,  displayOrder: 1  },
  { label: 'Score high → low',             sortValue: 'score_desc',   contactField: 'leadScore',      direction: 'desc', isActive: true,  displayOrder: 2  },
  { label: 'Score low → high',             sortValue: 'score_asc',    contactField: 'leadScore',      direction: 'asc',  isActive: true,  displayOrder: 3  },
  { label: 'Company A → Z',                sortValue: 'company_az',   contactField: 'company',        direction: 'asc',  isActive: true,  displayOrder: 4  },
  { label: 'Company Z → A',                sortValue: 'company_za',   contactField: 'company',        direction: 'desc', isActive: true,  displayOrder: 5  },
  { label: 'Name A → Z',                   sortValue: 'name_az',      contactField: 'firstName',      direction: 'asc',  isActive: true,  displayOrder: 6  },
  { label: 'Name Z → A',                   sortValue: 'name_za',      contactField: 'firstName',      direction: 'desc', isActive: true,  displayOrder: 7  },
  { label: 'Last Name + First A → Z',      sortValue: 'lastname_az',  contactField: 'lastName',       direction: 'asc',  isActive: false, displayOrder: 8  },
  { label: 'Last Name + First Z → A',      sortValue: 'lastname_za',  contactField: 'lastName',       direction: 'desc', isActive: false, displayOrder: 9  },
  { label: 'First Name + Last A → Z',      sortValue: 'firstname_az', contactField: 'firstName',      direction: 'asc',  isActive: false, displayOrder: 10 },
  { label: 'First Name + Last Z → A',      sortValue: 'firstname_za', contactField: 'firstName',      direction: 'desc', isActive: false, displayOrder: 11 },
  { label: 'City + State A → Z',           sortValue: 'city_az',      contactField: 'city',           direction: 'asc',  isActive: false, displayOrder: 12 },
  { label: 'City + State Z → A',           sortValue: 'city_za',      contactField: 'city',           direction: 'desc', isActive: false, displayOrder: 13 },
];

// ─── Built-in Filter Options ──────────────────────────────────────────────────

export const BUILT_IN_FILTERS = [
  // Core filters — always on by default, togglable in Settings
  { label: 'Stage',      contactField: 'lifecycleStage', filterType: 'STAGE_SELECT',  options: [], isActive: true,  displayOrder: 0 },
  { label: 'Status',     contactField: 'status',         filterType: 'STATUS_SELECT', options: [], isActive: true,  displayOrder: 1 },
  { label: 'Lead Score', contactField: 'leadScore',       filterType: 'NUMBER',        options: [], isActive: true,  displayOrder: 2 },

  // Additional filters
  { label: 'Source',     contactField: 'source',          filterType: 'DROPDOWN', options: [
    { value: 'Website Form', label: 'Website Form' },
    { value: 'Cold Outreach', label: 'Cold Outreach' },
    { value: 'Referral', label: 'Referral' },
    { value: 'Google Ad', label: 'Google Ad' },
    { value: 'Conference', label: 'Conference' },
    { value: 'Social Media', label: 'Social Media' },
    { value: 'Direct', label: 'Direct' },
    { value: 'Other', label: 'Other' }
  ], isActive: false, displayOrder: 3 },

  { label: 'State',      contactField: 'state',           filterType: 'TEXT', options: [], isActive: false, displayOrder: 4 },

  { label: 'Account Size', contactField: 'accountSize',   filterType: 'DROPDOWN', options: [
    { value: '1-5', label: '1–5' },
    { value: '6-15', label: '6–15' },
    { value: '16-50', label: '16–50' },
    { value: '51-200', label: '51–200' },
    { value: '200+', label: '200+' }
  ], isActive: false, displayOrder: 5 },

  { label: 'Fleet Size', contactField: 'trucks',          filterType: 'NUMBER', options: [], isActive: false, displayOrder: 6 },
  { label: 'Contract Value', contactField: 'contractValue', filterType: 'NUMBER', options: [], isActive: false, displayOrder: 7 },
  { label: 'Owned By',    contactField: 'ownedBy',        filterType: 'TEXT', options: [], isActive: false, displayOrder: 8 },
  { label: 'Campaign',    contactField: 'campaign',       filterType: 'TEXT', options: [], isActive: false, displayOrder: 9 },
  { label: 'Dispatcher Software', contactField: 'dispatcherSoftware', filterType: 'TEXT', options: [], isActive: false, displayOrder: 10 },
  { label: 'Years in Business', contactField: 'yearsInBusiness', filterType: 'NUMBER', options: [], isActive: false, displayOrder: 11 },
  { label: 'Service Area (mi)', contactField: 'serviceAreaMiles', filterType: 'NUMBER', options: [], isActive: false, displayOrder: 12 },
  { label: 'ZIP Code',    contactField: 'zip',           filterType: 'TEXT', options: [], isActive: false, displayOrder: 13 },
  { label: 'Job Title',   contactField: 'title',         filterType: 'TEXT', options: [], isActive: false, displayOrder: 14 },
  { label: 'Added By',    contactField: 'addedBy',       filterType: 'TEXT', options: [], isActive: false, displayOrder: 15 },
];

// ─── Per-client seeders ───────────────────────────────────────────────────────

/**
 * Seeds all built-in sort options for a single pool (null = prospect pool).
 * Skips entries that already exist (idempotent).
 */
export async function seedSortsForClient(clientId, prisma) {
  let added = 0, skipped = 0;
  for (const s of BUILT_IN_SORTS) {
    const exists = await prisma.customSortOption.findFirst({
      where: { clientId: clientId ?? null, sortValue: s.sortValue, isBuiltIn: true },
    });
    if (exists) { skipped++; continue; }
    await prisma.customSortOption.create({
      data: { ...s, clientId: clientId ?? null, isBuiltIn: true },
    });
    added++;
  }
  return { added, skipped };
}

/**
 * Seeds all built-in filter options for a single pool (null = prospect pool).
 * Skips entries that already exist (idempotent).
 */
export async function seedFiltersForClient(clientId, prisma) {
  let added = 0, skipped = 0;
  for (const f of BUILT_IN_FILTERS) {
    const exists = await prisma.customFilterOption.findFirst({
      where: { clientId: clientId ?? null, contactField: f.contactField, isBuiltIn: true },
    });
    if (exists) { skipped++; continue; }
    await prisma.customFilterOption.create({
      data: { ...f, clientId: clientId ?? null, isBuiltIn: true },
    });
    added++;
  }
  return { added, skipped };
}

/**
 * Seeds both sorts and filters for a single client (or prospect pool if null).
 * Safe to call multiple times — skips already-existing entries.
 */
export async function seedDefaultsForClient(clientId, prisma) {
  const [sorts, filters] = await Promise.all([
    seedSortsForClient(clientId, prisma),
    seedFiltersForClient(clientId, prisma),
  ]);
  return { sorts, filters };
}

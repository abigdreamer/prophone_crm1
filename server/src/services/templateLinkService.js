/**
 * Template link orchestration:
 *   - validateAndSyncLinks  — validate scoring rule IDs, atomically replace a
 *                             template's link set, return persisted rows.
 *   - extractLinksFromHtml  — regex fallback; used when no structured links are
 *                             supplied (bulk import, migration).
 *   - applyLinkScore        — create Activity + increment leadScore in one
 *                             transaction when a tracked link is clicked.
 *
 * Link strategy: frontend-provided structured data is the primary path.
 * The email builder already owns all link metadata and can attach a
 * scoringRuleId to each URL at authoring time. Server-side HTML parsing cannot
 * know which rule to assign to which URL, so it is only used as a fallback.
 */

import prisma from '../lib/prisma.js';
import * as linkRepo from '../repositories/templateLinkRepository.js';
import * as ruleRepo from '../repositories/scoringRuleRepository.js';

// ── HTML fallback parser ──────────────────────────────────────────────────────

const HREF_RE = /href="(https?:\/\/[^"#][^"]*)"/gi;

/**
 * Extract unique http(s) URLs from an HTML string.
 * Returns [{url, label: ''}] — no scoring rule association possible here.
 */
export function extractLinksFromHtml(html) {
  if (!html) return [];
  HREF_RE.lastIndex = 0;
  const seen = new Set();
  const links = [];
  let m;
  while ((m = HREF_RE.exec(html)) !== null) {
    const url = m[1].trim();
    if (!seen.has(url)) { seen.add(url); links.push({ url, label: '' }); }
  }
  return links;
}

// ── Link sync ─────────────────────────────────────────────────────────────────

/**
 * Validate all referenced scoring rules exist and are active, then atomically
 * replace the full link set for a template.
 *
 * @param {string}  templateId
 * @param {string|null} clientId
 * @param {Array<{url: string, label?: string, scoringRuleId?: string}>} linksData
 * @returns {Promise<Array>} persisted TemplateLink rows
 * @throws if any scoringRuleId is unknown or inactive
 */
export async function validateAndSyncLinks(templateId, clientId, linksData) {
  if (!Array.isArray(linksData) || linksData.length === 0) {
    await linkRepo.deleteByTemplate(templateId);
    return [];
  }

  // Validate URLs
  const invalid = linksData.filter(l => !l.url || !l.url.startsWith('http'));
  if (invalid.length) {
    throw Object.assign(
      new Error(`Invalid URL(s): ${invalid.map(l => l.url).join(', ')}`),
      { status: 400 },
    );
  }

  // Validate scoring rule IDs
  const ruleIds = [...new Set(linksData.map(l => l.scoringRuleId).filter(Boolean))];
  if (ruleIds.length) {
    const found = await ruleRepo.findManyByIds(ruleIds);
    const foundMap = new Map(found.map(r => [r.id, r]));
    const unknown  = ruleIds.filter(id => !foundMap.has(id));
    const inactive = ruleIds.filter(id => foundMap.has(id) && !foundMap.get(id).isActive);

    if (unknown.length)  throw Object.assign(new Error(`Unknown scoringRuleId(s): ${unknown.join(', ')}`),  { status: 422 });
    if (inactive.length) throw Object.assign(new Error(`Inactive scoringRuleId(s): ${inactive.join(', ')}`), { status: 422 });
  }

  // Deduplicate by URL (last entry wins)
  const deduped = [...new Map(linksData.map(l => [l.url, l])).values()];

  const rows = deduped.map(l => ({
    templateId,
    clientId:      clientId ?? null,
    url:           l.url,
    label:         l.label || '',
    scoringRuleId: l.scoringRuleId || null,
  }));

  await prisma.$transaction(async tx => {
    await tx.templateLink.deleteMany({ where: { templateId } });
    await tx.templateLink.createMany({ data: rows });
  });

  return linkRepo.findByTemplate(templateId);
}

// ── Score application ─────────────────────────────────────────────────────────

/**
 * Award scoring-rule points to a contact when they click a tracked link.
 * Silently no-ops if: no rule, rule inactive, contact not found, or
 * the contact belongs to a different client than the link.
 *
 * Runs inside a single transaction:
 *   1. Create Activity (type=link_click, points=N)
 *   2. Increment Contact.leadScore + Contact.emailsClicked
 *   3. Increment TemplateLink.clickCount
 *
 * @param {object} link      — TemplateLink row (from findByIdWithTemplate)
 * @param {string} contactId — Contact UUID from query param
 */
export async function applyLinkScore(link, contactId) {
  if (!link.scoringRule?.isActive || !contactId) return;

  const { points } = link.scoringRule;
  if (!points) return;

  const contact = await prisma.contact.findUnique({
    where:  { id: contactId },
    select: { id: true, clientId: true },
  });
  if (!contact) return;

  // Cross-client guard: link's clientId must match the contact's clientId
  if (link.clientId && contact.clientId !== link.clientId) return;

  await prisma.$transaction([
    prisma.activity.create({
      data: {
        contactId,
        type:   'email_clicked',
        note:   `Clicked tracked link: ${link.label || link.url}`,
        by:     'System',
        points,
      },
    }),
    prisma.contact.update({
      where: { id: contactId },
      data: {
        leadScore:      { increment: points },
        emailsClicked:  { increment: 1 },
        lastActivityAt: new Date(),
      },
    }),
    prisma.templateLink.update({
      where: { id: link.id },
      data:  { clickCount: { increment: 1 } },
    }),
  ]);
}

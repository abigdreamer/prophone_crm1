/**
 * Resolves the most meaningful display identifier for a contact
 * based on a configurable priority rule list.
 *
 * Default rules (applied when no custom rules are configured):
 *   name → company → location → email → phone
 *
 * Rule shapes:
 *   { type: "name" }            → firstName + lastName
 *   { type: "company" }        → company
 *   { type: "location" }       → "city, state" composite
 *   { type: "email" }          → email
 *   { type: "phone" }          → phone
 *   { type: "udf", key: "udf_1" } → udfValues[key]
 */

export const DEFAULT_DISPLAY_RULES = [
  { type: "name"     },
  { type: "company"  },
  { type: "location" },
  { type: "email"    },
  { type: "phone"    },
];

export function resolveDisplayName(contact, rules, udfs = []) {
  if (!contact) return "Unknown Contact";
  const c = contact;
  const ruleList = Array.isArray(rules) && rules.length > 0 ? rules : DEFAULT_DISPLAY_RULES;

  for (const rule of ruleList) {
    let val = "";
    switch (rule.type) {
      case "name": {
        val = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
        break;
      }
      case "company": {
        val = c.company?.trim() || "";
        break;
      }
      case "location": {
        val = [c.city, c.state].filter(Boolean).join(", ");
        break;
      }
      case "email": {
        val = c.email?.trim() || "";
        break;
      }
      case "phone": {
        val = c.phone?.trim() || "";
        break;
      }
      case "udf": {
        if (rule.key && c.udfValues) {
          const raw = c.udfValues[rule.key];
          val = Array.isArray(raw) ? raw.join(", ") : String(raw || "").trim();
        }
        break;
      }
      default:
        break;
    }
    if (val) return val;
  }
  return "Unknown Contact";
}

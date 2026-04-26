import * as emailDb from "../api/emailTemplates.api";

function getSuperAdminTenantId() {
  try {
    const u = JSON.parse(localStorage.getItem("prophone_user") || "null");
    if (u?.role !== "super_admin") return null;
    return localStorage.getItem("prophone_scoped_company") || null;
  } catch { return null; }
}

export async function getTemplates() {
  const data = await emailDb.getEmailTemplates();
  return data;
}

export async function getTemplate(id) {
  return emailDb.getEmailTemplate(id);
}

export async function createTemplate(payload) {
  const superTid = getSuperAdminTenantId();
  const body = superTid ? { ...payload, prophone_id: superTid } : { ...payload };
  return emailDb.createEmailTemplate(body);
}

export async function updateTemplate(id, updates) {
  return emailDb.updateEmailTemplate(id, updates);
}

export async function deleteTemplate(id) {
  return emailDb.deleteEmailTemplate(id);
}

export async function duplicateTemplate(id) {
  return emailDb.duplicateEmailTemplate(id);
}

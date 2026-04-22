import { supabase } from './supabase';

// ── Row transformers ───────────────────────────────────────────────────────────

function toActivity(row) {
  return {
    id: row.id,
    type: row.type,
    note: row.note || '',
    ts: row.ts,
    by: row.by || '',
  };
}

function toContact(row) {
  if (!row) return null;
  return {
    id: row.id,
    pool: row.pool,
    clientId: row.client_id,
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    email: row.email || '',
    phone: row.phone || '',
    company: row.company || '',
    title: row.title || '',
    website: row.website || '',
    city: row.city || '',
    trucks: row.trucks || 0,
    lifecycleStage: row.lifecycle_stage || 'new',
    leadScore: row.lead_score || 0,
    status: row.status || 'active',
    source: row.source || '',
    campaign: row.campaign || '',
    emailsSent: row.emails_sent || 0,
    emailsOpened: row.emails_opened || 0,
    emailsClicked: row.emails_clicked || 0,
    callsMade: row.calls_made || 0,
    callsAnswered: row.calls_answered || 0,
    lastActivityAt: row.last_activity_at || row.created_at,
    contractValue: row.contract_value || 0,
    accountSize: row.account_size || '1-5',
    tags: row.tags || [],
    notes: row.notes || '',
    ownedBy: row.owned_by || '',
    addedBy: row.added_by || '',
    createdAt: row.created_at,
    activities: (row.activities || []).sort((a, b) => new Date(a.ts) - new Date(b.ts)).map(toActivity),
  };
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export async function loginUser(email, password) {
  const { data, error } = await supabase.from('users').select('*').ilike('email', email).eq('password', password).maybeSingle();
  if (error) throw error;
  return data; // null = wrong credentials, object = valid user
}

export async function getUsers() {
  const { data, error } = await supabase.from('users').select('*');
  if (error) throw error;
  return data || [];
}

// ── Contacts ───────────────────────────────────────────────────────────────────

export async function getContacts(pool, clientId) {
  let q = supabase
    .from('contacts')
    .select('*, activities(id, type, note, by, ts)')
    .eq('pool', pool)
    .order('last_activity_at', { ascending: false });

  if (pool === 'client' && clientId) {
    q = q.eq('client_id', clientId);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(toContact);
}

export async function getContact(id) {
  const { data, error } = await supabase.from('contacts').select('*, activities(id, type, note, by, ts)').eq('id', id).single();
  if (error) throw error;
  return toContact(data);
}

export async function createContact(contact) {
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      pool: contact.pool,
      client_id: contact.clientId || null,
      first_name: contact.firstName || '',
      last_name: contact.lastName || '',
      email: contact.email || '',
      phone: contact.phone || '',
      company: contact.company || '',
      title: contact.title || '',
      website: contact.website || '',
      city: contact.city || '',
      trucks: parseInt(contact.trucks) || 0,
      lifecycle_stage: contact.lifecycleStage || 'new',
      lead_score: contact.leadScore || 10,
      status: contact.status || 'active',
      source: contact.source || '',
      campaign: contact.campaign || '',
      contract_value: parseInt(contact.contractValue) || 0,
      account_size: contact.accountSize || '1-5',
      tags: contact.tags || [],
      notes: contact.notes || '',
      owned_by: contact.ownedBy || '',
      added_by: contact.addedBy || '',
      last_activity_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) throw error;

  // Insert initial activities
  const initialActs = contact.activities || [];
  if (initialActs.length > 0) {
    await supabase.from('activities').insert(
      initialActs.map((a) => ({
        contact_id: data.id,
        type: a.type,
        note: a.note || '',
        by: a.by || '',
        ts: a.ts || new Date().toISOString(),
      })),
    );
  }

  return getContact(data.id);
}

export async function updateContact(id, contact) {
  const { error } = await supabase
    .from('contacts')
    .update({
      first_name: contact.firstName || '',
      last_name: contact.lastName || '',
      email: contact.email || '',
      phone: contact.phone || '',
      company: contact.company || '',
      title: contact.title || '',
      website: contact.website || '',
      city: contact.city || '',
      trucks: parseInt(contact.trucks) || 0,
      lifecycle_stage: contact.lifecycleStage || 'new',
      lead_score: contact.leadScore || 0,
      status: contact.status || 'active',
      source: contact.source || '',
      campaign: contact.campaign || '',
      contract_value: parseInt(contact.contractValue) || 0,
      account_size: contact.accountSize || '1-5',
      tags: contact.tags || [],
      notes: contact.notes || '',
      owned_by: contact.ownedBy || '',
      last_activity_at: contact.lastActivityAt || new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;

  return getContact(id);
}

// ── Activities ─────────────────────────────────────────────────────────────────

export async function addActivity(contactId, activity) {
  const { error } = await supabase.from('activities').insert({
    contact_id: contactId,
    type: activity.type,
    note: activity.note || '',
    by: activity.by || '',
    ts: activity.ts || new Date().toISOString(),
  });
  if (error) throw error;

  await supabase.from('contacts').update({ last_activity_at: new Date().toISOString() }).eq('id', contactId);
}

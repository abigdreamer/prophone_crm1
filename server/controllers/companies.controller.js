import prisma from '../prisma.js';

// Super admin: list all companies
export async function listCompanies(req, res) {
  try {
    const rows = await prisma.company_profile.findMany({
      orderBy: { created_at: 'desc' },
      include: { _count: { select: { users: true, contacts: true } } },
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Super admin: create a company
export async function createCompany(req, res) {
  const { prophone_id, name, website, city, address, phone, industry, notes, metadata, plan } = req.body;
  if (!prophone_id || !name) {
    return res.status(400).json({ error: 'prophone_id and name are required' });
  }
  try {
    const company = await prisma.company_profile.create({
      data: {
        prophone_id,
        name,
        website:  website  || '',
        city:     city     || '',
        address:  address  || '',
        phone:    phone    || '',
        industry: industry || '',
        plan:     plan     || 'starter',
        notes:    notes    || '',
        metadata: metadata || {},
      },
    });
    res.status(201).json(company);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'prophone_id already exists' });
    }
    res.status(500).json({ error: err.message });
  }
}

// Any authenticated user can GET their own company; super_admin can GET any
export async function getCompany(req, res) {
  const { prophone_id } = req.params;
  if (req.user.role !== 'super_admin' && prophone_id !== req.user.prophone_id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const company = await prisma.company_profile.findUnique({ where: { prophone_id } });
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Admin/super_admin can update their company; super_admin can update any
export async function updateCompany(req, res) {
  const { prophone_id } = req.params;
  if (req.user.role !== 'super_admin' && prophone_id !== req.user.prophone_id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { name, website, city, address, phone, industry, notes, metadata, plan } = req.body;
  const data = {};
  if (name     !== undefined) data.name     = name;
  if (website  !== undefined) data.website  = website;
  if (city     !== undefined) data.city     = city;
  if (address  !== undefined) data.address  = address;
  if (phone    !== undefined) data.phone    = phone;
  if (industry !== undefined) data.industry = industry;
  if (notes    !== undefined) data.notes    = notes;
  if (metadata !== undefined) data.metadata = metadata;
  // Only super_admin can change the plan
  if (plan !== undefined && req.user.role === 'super_admin') data.plan = plan;

  try {
    const company = await prisma.company_profile.update({ where: { prophone_id }, data });
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Super admin only: delete a company
export async function deleteCompany(req, res) {
  const { prophone_id } = req.params;
  try {
    await prisma.company_profile.delete({ where: { prophone_id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

import { sendSuccess, sendError, sendServerError } from '../utils/response.js';
import * as companyRepo from '../repositories/companyRepository.js';

export async function listCompanies(req, res) {
  try {
    const rows = await companyRepo.findAll();
    sendSuccess(res, rows);
  } catch (err) {
    sendServerError(res, err, 'listCompanies');
  }
}

export async function createCompany(req, res) {
  const {
    name, website, city, address, zipcode, state, country, phone, email, fax,
    industry, timezone, notes, metadata, plan,
  } = req.body ?? {};
  if (!name) return sendError(res, 'name is required', 400);

  // Auto-generate prophone_id from company name (UPPERCASE, spaces → underscore)
  const prophone_id = name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');

  try {
    const company = await companyRepo.createCompany({
      prophone_id,
      name,
      website:  website  || '',
      city:     city     || '',
      address:  address  || '',
      zipcode:  zipcode  || '',
      state:    state    || '',
      country:  country  || '',
      phone:    phone    || '',
      email:    email    || '',
      fax:      fax      || '',
      industry: industry || '',
      timezone: timezone || '',
      plan:     plan     || 'starter',
      notes:    notes    || '',
      metadata: metadata || {},
    });
    sendSuccess(res, company, 201);
  } catch (err) {
    if (err.code === 'P2002') return sendError(res, 'prophone_id already exists', 409);
    sendServerError(res, err, 'createCompany');
  }
}

export async function getCompany(req, res) {
  const { prophone_id } = req.params;
  if (req.user.role !== 'super_admin' && prophone_id !== req.user.prophone_id) {
    return sendError(res, 'Forbidden', 403);
  }
  try {
    const company = await companyRepo.findByPhoneId(prophone_id);
    if (!company) return sendError(res, 'Company not found', 404);
    sendSuccess(res, company);
  } catch (err) {
    sendServerError(res, err, 'getCompany');
  }
}

export async function updateCompany(req, res) {
  const { prophone_id } = req.params;
  if (req.user.role !== 'super_admin' && prophone_id !== req.user.prophone_id) {
    return sendError(res, 'Forbidden', 403);
  }
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return sendError(res, 'Admin access required', 403);
  }

  const {
    name, website, city, address, zipcode, state, country, phone, email, fax,
    industry, timezone, notes, metadata, plan,
  } = req.body ?? {};
  const data = {};
  if (name     !== undefined) data.name     = name;
  if (website  !== undefined) data.website  = website;
  if (city     !== undefined) data.city     = city;
  if (address  !== undefined) data.address  = address;
  if (zipcode  !== undefined) data.zipcode  = zipcode;
  if (state    !== undefined) data.state    = state;
  if (country  !== undefined) data.country  = country;
  if (phone    !== undefined) data.phone    = phone;
  if (email    !== undefined) data.email    = email;
  if (fax      !== undefined) data.fax      = fax;
  if (industry !== undefined) data.industry = industry;
  if (timezone !== undefined) data.timezone = timezone;
  if (notes    !== undefined) data.notes    = notes;
  if (metadata !== undefined) data.metadata = metadata;
  if (plan !== undefined && req.user.role === 'super_admin') data.plan = plan;

  try {
    const company = await companyRepo.updateCompany(prophone_id, data);
    sendSuccess(res, company);
  } catch (err) {
    sendServerError(res, err, 'updateCompany');
  }
}

export async function deleteCompany(req, res) {
  const { prophone_id } = req.params;
  try {
    await companyRepo.removeCompany(prophone_id);
    sendSuccess(res, { ok: true });
  } catch (err) {
    sendServerError(res, err, 'deleteCompany');
  }
}

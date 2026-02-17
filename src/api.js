import axios from 'axios';
import { getConfig } from './config.js';

function getBaseUrl() {
  const subdomain = getConfig('subdomain');
  if (subdomain) return `https://${subdomain}.files.com/api/rest/v1`;
  return 'https://app.files.com/api/rest/v1';
}

function getClient() {
  const apiKey = getConfig('apiKey');
  if (!apiKey) throw new Error('API key not configured. Run: filescom config set --api-key YOUR_KEY');
  return axios.create({
    baseURL: getBaseUrl(),
    headers: {
      'X-FilesAPI-Key': apiKey,
      'Content-Type': 'application/json'
    }
  });
}

function handleApiError(error) {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    if (status === 401) throw new Error('Authentication failed. Check your API key.');
    if (status === 403) throw new Error('Access forbidden. Check your permissions.');
    if (status === 404) throw new Error('Resource not found.');
    if (status === 422) {
      const errors = data?.errors || [data?.message || 'Validation error'];
      throw new Error(`Validation error: ${Array.isArray(errors) ? errors.join(', ') : errors}`);
    }
    if (status === 429) throw new Error('Rate limit exceeded. Please wait before retrying.');
    const message = data?.error || data?.message || JSON.stringify(data);
    throw new Error(`API Error (${status}): ${message}`);
  } else if (error.request) {
    throw new Error('No response from Files.com API. Check your internet connection.');
  } else {
    throw error;
  }
}

// ============================================================
// FILES
// ============================================================

export async function listFiles({ path = '/', cursor, perPage = 25, sortBy, sortOrder } = {}) {
  const client = getClient();
  const params = { per_page: perPage };
  if (cursor) params.cursor = cursor;
  if (sortBy) params.sort_by = sortBy;
  if (sortOrder) params.sort_order = sortOrder;
  try {
    const res = await client.get(`/folders/${encodeURIComponent(path)}`, { params });
    return res.data;
  } catch (e) { handleApiError(e); }
}

export async function getFile(path) {
  const client = getClient();
  try {
    const res = await client.get(`/files/${encodeURIComponent(path)}`);
    return res.data;
  } catch (e) { handleApiError(e); }
}

export async function deleteFile(path) {
  const client = getClient();
  try {
    await client.delete(`/files/${encodeURIComponent(path)}`);
    return true;
  } catch (e) { handleApiError(e); }
}

export async function moveFile({ path, destination }) {
  const client = getClient();
  try {
    const res = await client.post(`/file_actions/move/${encodeURIComponent(path)}`, { destination });
    return res.data;
  } catch (e) { handleApiError(e); }
}

export async function copyFile({ path, destination }) {
  const client = getClient();
  try {
    const res = await client.post(`/file_actions/copy/${encodeURIComponent(path)}`, { destination });
    return res.data;
  } catch (e) { handleApiError(e); }
}

export async function createFolder(path) {
  const client = getClient();
  try {
    const res = await client.post(`/folders/${encodeURIComponent(path)}`);
    return res.data;
  } catch (e) { handleApiError(e); }
}

// ============================================================
// USERS
// ============================================================

export async function listUsers({ cursor, perPage = 25, search } = {}) {
  const client = getClient();
  const params = { per_page: perPage };
  if (cursor) params.cursor = cursor;
  if (search) params.search = search;
  try {
    const res = await client.get('/users', { params });
    return res.data;
  } catch (e) { handleApiError(e); }
}

export async function getUser(userId) {
  const client = getClient();
  try {
    const res = await client.get(`/users/${userId}`);
    return res.data;
  } catch (e) { handleApiError(e); }
}

export async function createUser({ username, email, name, password, groupIds, admin = false, ftpPermission = true, sftpPermission = true }) {
  const client = getClient();
  const body = { username };
  if (email) body.email = email;
  if (name) body.name = name;
  if (password) body.password = password;
  if (groupIds) body.group_ids = groupIds.split(',').map(id => parseInt(id.trim()));
  body.admin = admin;
  body.ftp_permission = ftpPermission;
  body.sftp_permission = sftpPermission;
  try {
    const res = await client.post('/users', body);
    return res.data;
  } catch (e) { handleApiError(e); }
}

export async function deleteUser(userId) {
  const client = getClient();
  try {
    await client.delete(`/users/${userId}`);
    return true;
  } catch (e) { handleApiError(e); }
}

// ============================================================
// GROUPS
// ============================================================

export async function listGroups({ cursor, perPage = 25 } = {}) {
  const client = getClient();
  const params = { per_page: perPage };
  if (cursor) params.cursor = cursor;
  try {
    const res = await client.get('/groups', { params });
    return res.data;
  } catch (e) { handleApiError(e); }
}

export async function getGroup(groupId) {
  const client = getClient();
  try {
    const res = await client.get(`/groups/${groupId}`);
    return res.data;
  } catch (e) { handleApiError(e); }
}

export async function createGroup({ name, notes }) {
  const client = getClient();
  const body = { name };
  if (notes) body.notes = notes;
  try {
    const res = await client.post('/groups', body);
    return res.data;
  } catch (e) { handleApiError(e); }
}

// ============================================================
// API KEYS
// ============================================================

export async function listApiKeys({ cursor, perPage = 25 } = {}) {
  const client = getClient();
  const params = { per_page: perPage };
  if (cursor) params.cursor = cursor;
  try {
    const res = await client.get('/api_keys', { params });
    return res.data;
  } catch (e) { handleApiError(e); }
}

export async function createApiKey({ name, expiresAt, permissionSet = 'full' }) {
  const client = getClient();
  const body = { name, permission_set: permissionSet };
  if (expiresAt) body.expires_at = expiresAt;
  try {
    const res = await client.post('/api_keys', body);
    return res.data;
  } catch (e) { handleApiError(e); }
}

export async function deleteApiKey(keyId) {
  const client = getClient();
  try {
    await client.delete(`/api_keys/${keyId}`);
    return true;
  } catch (e) { handleApiError(e); }
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export async function listNotifications({ cursor, perPage = 25 } = {}) {
  const client = getClient();
  const params = { per_page: perPage };
  if (cursor) params.cursor = cursor;
  try {
    const res = await client.get('/notifications', { params });
    return res.data;
  } catch (e) { handleApiError(e); }
}

export async function createNotification({ path, sendInterval, onlyForMyPicks = false, triggerActions }) {
  const client = getClient();
  const body = { path };
  if (sendInterval) body.send_interval = sendInterval;
  body.only_for_my_picks = onlyForMyPicks;
  if (triggerActions) body.trigger_actions = triggerActions.split(',').map(a => a.trim());
  try {
    const res = await client.post('/notifications', body);
    return res.data;
  } catch (e) { handleApiError(e); }
}

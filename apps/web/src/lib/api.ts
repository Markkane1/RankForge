import type {
  DashboardData,
  ClientListItem,
  ClientDetail,
  CreateClientData,
  TaskItem,
  ApprovalRequest,
  BuildStatusData,
  BuildRequirement,
  SettingsData,
  LeadLogEntry,
  Subtask,
  NotificationItem,
  GbpProfileData,
  GeoGridScanResult,
} from '@/lib/types';

const BASE = process.env.NEXT_PUBLIC_API_URL || '';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ─── Dashboard ───
export const getDashboard = (params?: { from?: string; to?: string }) => {
  const sp = new URLSearchParams();
  if (params?.from) sp.set('from', params.from);
  if (params?.to) sp.set('to', params.to);
  const qs = sp.toString();
  return fetchJson<DashboardData>(`/api/dashboard${qs ? `?${qs}` : ''}`);
};

// ─── Clients ───
export const getClients = (params?: { state?: string; search?: string }) => {
  const sp = new URLSearchParams();
  if (params?.state) sp.set('state', params.state);
  if (params?.search) sp.set('search', params.search);
  const qs = sp.toString();
  return fetchJson<ClientListItem[]>(`/api/clients${qs ? `?${qs}` : ''}`);
};

export const getClientDetail = (id: string) =>
  fetchJson<ClientDetail>(`/api/clients/${id}`);

export const getGeoGrid = (id: string) =>
  fetchJson<GeoGridScanResult[]>(`/api/clients/${id}/geo-grid`);

export const runGeoGridScan = (id: string, keyword: string) =>
  fetchJson<GeoGridScanResult>(`/api/clients/${id}/geo-grid`, {
    method: 'POST',
    body: JSON.stringify({ keyword }),
  });

export const updateClientState = (id: string, state: string) =>
  fetchJson<ClientListItem>(`/api/clients/${id}/state`, {
    method: 'PUT',
    body: JSON.stringify({ state }),
  });

export const updateClientNotes = (id: string, notes: string) =>
  fetchJson<ClientListItem>(`/api/clients/${id}/notes`, {
    method: 'PUT',
    body: JSON.stringify({ notes }),
  });

// ─── Tasks ───
export const getTasks = (params?: {
  status?: string;
  module?: string;
  priority?: string;
  clientId?: string;
  search?: string;
}) => {
  const sp = new URLSearchParams();
  if (params?.status) sp.set('status', params.status);
  if (params?.module) sp.set('module', params.module);
  if (params?.priority) sp.set('priority', params.priority);
  if (params?.clientId) sp.set('clientId', params.clientId);
  if (params?.search) sp.set('search', params.search);
  const qs = sp.toString();
  return fetchJson<TaskItem[]>(`/api/tasks${qs ? `?${qs}` : ''}`);
};

export const getTaskDetail = (id: string) =>
  fetchJson<TaskItem>(`/api/tasks/${id}`);

export const updateTaskStatus = (id: string, status: string) =>
  fetchJson<TaskItem>(`/api/tasks/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });

export const createTask = (data: { title: string; description?: string; clientId?: string; module: string; priority: string; sprint?: number; dueDate?: string }) =>
  fetchJson<TaskItem>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// ─── Approvals ───
export const getApprovals = (params?: { status?: string }) => {
  const sp = new URLSearchParams();
  if (params?.status) sp.set('status', params.status);
  const qs = sp.toString();
  return fetchJson<ApprovalRequest[]>(`/api/approvals${qs ? `?${qs}` : ''}`);
};

export const approveRequest = (id: string) =>
  fetchJson<ApprovalRequest>(`/api/approvals/${id}/approve`, {
    method: 'POST',
  });

export const rejectRequest = (id: string, reason?: string) =>
  fetchJson<ApprovalRequest>(`/api/approvals/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

export const createApproval = (data: { clientId?: string; taskId?: string; title: string; description: string; requestType: string; requestData?: string }) =>
  fetchJson<ApprovalRequest>('/api/approvals', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// ─── Build Status ───
export const getBuildStatus = () => fetchJson<BuildStatusData>('/api/build-status');

export const updateBuildReq = (reqId: string, status: string, note?: string) =>
  fetchJson<BuildRequirement>(`/api/build-status/${reqId}`, {
    method: 'PUT',
    body: JSON.stringify({ status, note }),
  });

// ─── Settings ───
export const getSettings = () => fetchJson<SettingsData>('/api/settings');

// ─── Client Creation ───
export const createClient = (data: CreateClientData) =>
  fetchJson<ClientListItem>('/api/clients', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// ─── Leads ───
export const getLeads = (params?: { clientId?: string; limit?: number; source?: string }) => {
  const sp = new URLSearchParams();
  if (params?.clientId) sp.set('clientId', params.clientId);
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.source) sp.set('source', params.source);
  const qs = sp.toString();
  return fetchJson<LeadLogEntry[]>(`/api/leads${qs ? `?${qs}` : ''}`);
};

export const createLead = (data: { clientId: string; source: string; value?: number; contactInfo?: string; notes?: string }) =>
  fetchJson<LeadLogEntry>('/api/leads', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// ─── Subtasks ───
export const createSubtask = (taskId: string, title: string) =>
  fetchJson<Subtask>(`/api/tasks/${taskId}/subtasks`, { method: 'POST', body: JSON.stringify({ title }) });

export const toggleSubtask = (taskId: string, subtaskId: string) =>
  fetchJson<Subtask>(`/api/tasks/${taskId}/subtasks/${subtaskId}`, { method: 'PATCH' });

export const deleteSubtask = (taskId: string, subtaskId: string) =>
  fetchJson<void>(`/api/tasks/${taskId}/subtasks/${subtaskId}`, { method: 'DELETE' });

// ─── Import ───
export const importClientsCsv = async (file: File): Promise<{ imported: number; errors: string[] }> => {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/import/clients', { method: 'POST', body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
};

// ─── Audit Trail ───
export const getClientAuditTrail = (clientId: string) =>
  fetchJson<Array<{ id: string; module: string; entityType: string; entityId?: string; field?: string; oldValue?: string; newValue?: string; changedById?: string; changedByName?: string | null; createdAt: string }>>(`/api/clients/${clientId}/audit-trail`);

// ─── Notifications ───
export const getNotifications = (params?: { page?: number; limit?: number; userId?: string }) => {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.userId) sp.set('userId', params.userId);
  const qs = sp.toString();
  return fetchJson<{ items: NotificationItem[]; total: number; unread: number }>(`/api/notifications${qs ? `?${qs}` : ''}`);
};

export const markNotificationsRead = (ids: string[]) =>
  fetchJson<{ updated: number }>('/api/notifications', { method: 'PATCH', body: JSON.stringify({ ids }) });

export const deleteNotification = (id: string) =>
  fetchJson<{ deleted: boolean }>(`/api/notifications/${id}`, { method: 'DELETE' });

// ─── Monthly Report Download (stub) ───
export const downloadMonthlyReport = async (month?: number, year?: string | number, clientId?: string): Promise<void> => {
  const sp = new URLSearchParams();
  if (month) sp.set('month', String(month));
  if (year) sp.set('year', String(year));
  if (clientId) sp.set('clientId', clientId);
  const qs = sp.toString();
  const res = await fetch(`/api/reports/monthly${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Failed to download report');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report-${month ?? 'all'}-${year ?? new Date().getFullYear()}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── Task CSV Import ───
export const importTasksCsv = async (file: File): Promise<{ imported: number; errors: string[] }> => {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/import/tasks', { method: 'POST', body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
};

// ─── Subtask Reorder ───
export const reorderSubtasks = (taskId: string, subtaskIds: string[]) =>
  fetchJson<Subtask[]>(`/api/tasks/${taskId}/subtasks/reorder`, { method: 'PATCH', body: JSON.stringify({ subtaskIds }) });

// ─── GBP Profile ───
export const getGbpCategories = () =>
  fetchJson<Record<string, string[]>>('/api/gbp/categories');

export const createGbpProfile = (clientId: string, data: Record<string, unknown>) =>
  fetchJson<GbpProfileData>(`/api/clients/${clientId}/gbp`, { method: 'POST', body: JSON.stringify(data) });
export const updateGbpProfile = (clientId: string, gbpId: string, data: Record<string, unknown>) =>
  fetchJson<GbpProfileData>(`/api/clients/${clientId}/gbp/${gbpId}`, { method: 'PATCH', body: JSON.stringify(data) });

export const getGbpServices = (clientId: string, gbpId: string) =>
  fetchJson<any[]>(`/api/clients/${clientId}/gbp/${gbpId}/services`);
export const createGbpService = (clientId: string, gbpId: string, data: Record<string, unknown>) =>
  fetchJson<any>(`/api/clients/${clientId}/gbp/${gbpId}/services`, { method: 'POST', body: JSON.stringify(data) });
export const updateGbpService = (clientId: string, gbpId: string, serviceId: string, data: Record<string, unknown>) =>
  fetchJson<any>(`/api/clients/${clientId}/gbp/${gbpId}/services/${serviceId}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteGbpService = (clientId: string, gbpId: string, serviceId: string) =>
  fetchJson<void>(`/api/clients/${clientId}/gbp/${gbpId}/services/${serviceId}`, { method: 'DELETE' });

export const getGbpProducts = (clientId: string, gbpId: string) =>
  fetchJson<any[]>(`/api/clients/${clientId}/gbp/${gbpId}/products`);
export const createGbpProduct = (clientId: string, gbpId: string, data: Record<string, unknown>) =>
  fetchJson<any>(`/api/clients/${clientId}/gbp/${gbpId}/products`, { method: 'POST', body: JSON.stringify(data) });
export const updateGbpProduct = (clientId: string, gbpId: string, productId: string, data: Record<string, unknown>) =>
  fetchJson<any>(`/api/clients/${clientId}/gbp/${gbpId}/products/${productId}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteGbpProduct = (clientId: string, gbpId: string, productId: string) =>
  fetchJson<void>(`/api/clients/${clientId}/gbp/${gbpId}/products/${productId}`, { method: 'DELETE' });

export const getGbpPhotos = (clientId: string, gbpId: string) =>
  fetchJson<any[]>(`/api/clients/${clientId}/gbp/${gbpId}/photos`);
export const uploadGbpPhoto = (clientId: string, gbpId: string, formData: FormData) =>
  fetch(`/api/clients/${clientId}/gbp/${gbpId}/photos`, { method: 'POST', body: formData }).then(async r => {
    if (!r.ok) { const err = await r.json().catch(() => ({})); throw new Error(err.error || 'Failed to upload photo'); }
    return r.json();
  });
export const deleteGbpPhoto = (clientId: string, gbpId: string, photoId: string) =>
  fetchJson<void>(`/api/clients/${clientId}/gbp/${gbpId}/photos/${photoId}`, { method: 'DELETE' });

export const getGbpPosts = (clientId: string, gbpId: string) =>
  fetchJson<any[]>(`/api/clients/${clientId}/gbp/${gbpId}/posts`);
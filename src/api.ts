import type { ContactInput, ContactMessage, Property, PropertyInput } from '../shared/types';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { credentials: 'same-origin', ...init });
  } catch {
    throw new ApiError(0, 'אין חיבור לשרת. בדקו את החיבור לאינטרנט ונסו שוב.');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body?.error ?? 'הפעולה נכשלה. נסו שוב.');
  return body as T;
}

const json = (method: string, data: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

export const api = {
  listProperties: () => request<Property[]>('/api/properties'),
  getProperty: (id: string) => request<Property>(`/api/properties/${encodeURIComponent(id)}`),
  sendContact: (data: ContactInput) => request<{ ok: true }>('/api/contact', json('POST', data)),

  me: () => request<{ admin: boolean; blobUploads?: boolean }>('/api/admin/me'),
  login: (password: string) => request<{ admin: boolean }>('/api/admin/login', json('POST', { password })),
  logout: () => request<{ admin: boolean }>('/api/admin/logout', { method: 'POST' }),

  adminListProperties: () => request<Property[]>('/api/admin/properties'),
  /** מעלה תמונה אחת ומחזיר את הכתובת שלה (בענן: ישירות ל-Vercel Blob, מקומית: לשרת) */
  uploadImage: async (file: File): Promise<string> => {
    const { blobUploads } = await api.me();
    if (!blobUploads) {
      const fd = new FormData();
      fd.append('file', file);
      return (await request<{ url: string }>('/api/admin/upload', { method: 'POST', body: fd })).url;
    }
    const { upload } = await import('@vercel/blob/client');
    const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
    try {
      const blob = await upload(`properties/${crypto.randomUUID()}.${ext}`, file, {
        access: 'public',
        handleUploadUrl: '/api/admin/upload',
        contentType: file.type,
      });
      return blob.url;
    } catch (err) {
      console.error(err);
      throw new ApiError(0, `העלאת התמונה "${file.name}" נכשלה. נסו שוב.`);
    }
  },
  saveProperty: (input: PropertyInput, id?: string) =>
    request<Property>(id ? `/api/admin/properties/${id}` : '/api/admin/properties', json(id ? 'PUT' : 'POST', input)),
  patchProperty: (id: string, patch: Partial<Pick<Property, 'status' | 'featured'>>) =>
    request<Property>(`/api/admin/properties/${id}`, json('PATCH', patch)),
  deleteProperty: (id: string) => request<{ ok: true }>(`/api/admin/properties/${id}`, { method: 'DELETE' }),

  listMessages: () => request<ContactMessage[]>('/api/admin/messages'),
  markMessage: (id: string, read: boolean) =>
    request<ContactMessage>(`/api/admin/messages/${id}`, json('PATCH', { read })),
  deleteMessage: (id: string) => request<{ ok: true }>(`/api/admin/messages/${id}`, { method: 'DELETE' }),
};

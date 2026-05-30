import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await api.post('/auth/refresh');
        return api(originalRequest);
      } catch (refreshError) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: RegisterData) => api.post('/auth/register', data),
  login: (data: LoginData) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  refresh: () => api.post('/auth/refresh'),
};

export const campaignAPI = {
  getAll: (page = 1) => api.get(`/campaigns?page=${page}`),
  getOne: (id: number) => api.get(`/campaigns/${id}`),
  create: (data: CreateCampaignData) => api.post('/campaigns', data),
  send: (id: number) => api.post(`/campaigns/${id}/send`),
  cancel: (id: number) => api.post(`/campaigns/${id}/cancel`),
};

export const contactListAPI = {
  getAll: (page = 1) => api.get(`/contact-lists?page=${page}`),
  getOne: (id: number) => api.get(`/contact-lists/${id}`),
  create: (data: CreateContactListData) => api.post('/contact-lists', data),
  update: (id: number, data: UpdateContactListData) => api.put(`/contact-lists/${id}`, data),
  delete: (id: number) => api.delete(`/contact-lists/${id}`),
  getContacts: (listId: number, page = 1, params?: { search?: string; subscribed?: string }) =>
    api.get(`/contact-lists/${listId}/contacts`, { params: { page, ...params } }),
  createContact: (listId: number, data: CreateContactData) =>
    api.post(`/contact-lists/${listId}/contacts`, data),
  importContacts: (listId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/contact-lists/${listId}/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const contactAPI = {
  update: (id: number, data: UpdateContactData) => api.put(`/contacts/${id}`, data),
  delete: (id: number) => api.delete(`/contacts/${id}`),
};

export const templateAPI = {
  getAll: (page = 1, type?: string) => api.get('/templates', { params: { page, type } }),
  getOne: (id: number) => api.get(`/templates/${id}`),
  create: (data: CreateTemplateData) => api.post('/templates', data),
  update: (id: number, data: UpdateTemplateData) => api.put(`/templates/${id}`, data),
  delete: (id: number) => api.delete(`/templates/${id}`),
};

export const analyticsAPI = {
  getSummary: () => api.get('/analytics/summary'),
  getDailyStats: () => api.get('/analytics/daily'),
  getCampaignAnalytics: (id: number) => api.get(`/analytics/campaigns/${id}`),
};

export const billingAPI = {
  getPlans: () => api.get('/billing/plans'),
  getSubscription: () => api.get('/billing/subscription'),
  subscribe: (planName: string) => api.post('/billing/subscribe', { plan_name: planName }),
  cancel: () => api.post('/billing/cancel'),
  getTransactions: () => api.get('/billing/transactions'),
};

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  company?: string;
  phone_number?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface CreateCampaignData {
  name: string;
  type: 'sms' | 'email';
  subject?: string;
  content: string;
  template_id?: number;
  contact_list_id: number;
  scheduled_at?: string;
}

export interface CreateContactListData {
  name: string;
  description?: string;
}

export interface UpdateContactListData {
  name?: string;
  description?: string;
}

export interface CreateContactData {
  email?: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  custom_fields?: Record<string, unknown>;
  is_subscribed?: boolean;
}

export interface UpdateContactData {
  email?: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  custom_fields?: Record<string, unknown>;
  is_subscribed?: boolean;
}

export interface CreateTemplateData {
  name: string;
  type: 'sms' | 'email';
  subject?: string;
  content: string;
  html_content?: string;
  variables?: Record<string, unknown>;
  is_public?: boolean;
}

export interface UpdateTemplateData {
  name?: string;
  subject?: string;
  content?: string;
  html_content?: string;
  variables?: Record<string, unknown>;
  is_public?: boolean;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  company: string;
  role: string;
  is_active: boolean;
  subscription?: Subscription;
}

export interface Subscription {
  id: number;
  plan_name: string;
  status: string;
  sms_quota: number;
  email_quota: number;
  sms_used: number;
  email_used: number;
  price_per_month: number;
}

export interface Campaign {
  id: number;
  name: string;
  type: 'sms' | 'email';
  status: string;
  subject?: string;
  content: string;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  open_count: number;
  click_count: number;
  created_at: string;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
}

export interface ContactList {
  id: number;
  name: string;
  description: string;
  total_count: number;
  active_count: number;
  created_at: string;
}

export interface Contact {
  id: number;
  contact_list_id: number;
  email: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  custom_fields: Record<string, unknown>;
  is_subscribed: boolean;
  unsubscribed_at?: string;
  created_at: string;
}

export interface Template {
  id: number;
  name: string;
  type: 'sms' | 'email';
  subject: string;
  content: string;
  html_content: string;
  variables: Record<string, unknown>;
  is_public: boolean;
  created_at: string;
}

export interface AnalyticsSummary {
  total_campaigns: number;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_opened: number;
  total_clicked: number;
  total_contacts: number;
  total_lists: number;
  total_templates: number;
  sms_sent: number;
  email_sent: number;
}

export interface DailyStat {
  date: string;
  sent: number;
  email: number;
  sms: number;
}

export interface Transaction {
  id: number;
  amount: number;
  currency: string;
  status: string;
  type: string;
  provider: string;
  description: string;
  created_at: string;
}

export interface Plan {
  name: string;
  sms_quota: number;
  email_quota: number;
  price_per_month: number;
  stripe_price_id?: string;
}

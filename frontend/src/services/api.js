import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || '';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else if (error.response?.data?.error) {
      toast.error(error.response.data.error);
    } else {
      toast.error('An unexpected error occurred');
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  register: async (data) => {
    const response = await api.post('/api/auth/register', data);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  },

  getCurrentUser: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },

  updateSettings: async (settings) => {
    const response = await api.put('/api/auth/settings', { settings });
    return response.data;
  },

  configureNotion: async (apiKey, databaseId) => {
    const response = await api.post('/api/auth/notion', { apiKey, databaseId });
    return response.data;
  }
};

// Notes API
export const notesAPI = {
  getNotes: async (params = {}) => {
    const response = await api.get('/api/notes', { params });
    return response.data;
  },

  getNote: async (id) => {
    const response = await api.get(`/api/notes/${id}`);
    return response.data;
  },

  searchNotes: async (query, params = {}) => {
    const response = await api.get('/api/notes/search', { 
      params: { q: query, ...params } 
    });
    return response.data;
  },

  updateNote: async (id, data) => {
    const response = await api.put(`/api/notes/${id}`, data);
    return response.data;
  },

  deleteNote: async (id) => {
    const response = await api.delete(`/api/notes/${id}`);
    return response.data;
  },

  toggleFavorite: async (id) => {
    const response = await api.post(`/api/notes/${id}/favorite`);
    return response.data;
  },

  toggleArchive: async (id) => {
    const response = await api.post(`/api/notes/${id}/archive`);
    return response.data;
  },

  syncToNotion: async (id) => {
    const response = await api.post(`/api/notes/${id}/sync-notion`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/api/notes/stats');
    return response.data;
  }
};

// Export combined API
export default {
  ...authAPI,
  ...notesAPI,
  
  // Health check
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  }
};
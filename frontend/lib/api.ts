import axios from 'axios';

// API URL - Use environment variable in production, localhost in development
const API_URL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? 'http://localhost:5001/api' 
    : 'https://qr9vevhu9j.execute-api.us-east-1.amazonaws.com/dev/api');

// Log the API URL being used (only in browser)
if (typeof window !== 'undefined') {
  console.log('🔗 API URL:', API_URL);
  console.log('🌐 Current origin:', window.location.origin);
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout (Lambda cold starts can take time)
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error') || error.message?.includes('Failed to fetch')) {
      console.error('❌ Backend connection failed!');
      console.error('   Error:', error.message);
      console.error('   Code:', error.code);
      console.error('   API URL:', API_URL);
      console.error('   Check: 1) Backend running? 2) Port correct? 3) CORS configured?');
    } else if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.statusText);
      console.error('   Response:', error.response.data);
    } else {
      console.error('❌ Request Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Students API
export const studentsApi = {
  getAll: (page = 1, limit = 20, search = '', sourceType = '') =>
    api.get(`/students?page=${page}&limit=${limit}&search=${search}${sourceType ? `&sourceType=${sourceType}` : ''}`),
  getById: (id: string) => api.get(`/students/${id}`),
  create: (data: any) => api.post('/students', data),
  update: (id: string, data: any) => api.put(`/students/${id}`, data),
  delete: (id: string) => api.delete(`/students/${id}`),
  batchDelete: (studentIds: string[]) => api.post('/students/batch-delete', { studentIds }),
  deleteByBatch: (batchName: string) => api.delete(`/students/batch/${encodeURIComponent(batchName)}`),
  deleteAll: () => api.delete('/students'),
};

// Tests API
export const testsApi = {
  getAll: () => api.get('/tests'),
  getById: (id: string) => api.get(`/tests/${id}`),
  create: (data: any) => api.post('/tests', data),
  update: (id: string, data: any) => api.put(`/tests/${id}`, data),
  delete: (id: string) => api.delete(`/tests/${id}`),
  uploadExcel: (file: File) => {
    const formData = new FormData();
    formData.append('excelFile', file);
    return api.post('/tests/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  // Legacy method for backward compatibility
  uploadExcelWithTestId: (testId: string, file: File) => {
    const formData = new FormData();
    formData.append('excelFile', file);
    return api.post(`/tests/${testId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Results API
export const resultsApi = {
  getByStudent: (studentId: string) => api.get(`/results/student/${studentId}`),
  getById: (id: string) => api.get(`/results/${id}`),
  create: (data: any) => api.post('/results', data),
  update: (id: string, data: any) => api.put(`/results/${id}`, data),
  getByTest: (testId: string, page = 1, limit = 50) =>
    api.get(`/results/test/${testId}?page=${page}&limit=${limit}`),
};

// Visits API
export const visitsApi = {
  getByStudent: (studentId: string) => api.get(`/visits/student/${studentId}`),
  getById: (id: string) => api.get(`/visits/${id}`),
  create: (data: any) => api.post('/visits', data),
  update: (id: string, data: any) => api.put(`/visits/${id}`, data),
  delete: (id: string) => api.delete(`/visits/${id}`),
};

// Backlog API
export const backlogApi = {
  getSyllabus: () => api.get('/backlog/syllabus'),
  getByStudent: (studentId: string) => api.get(`/backlog/student/${studentId}`),
  initialize: (studentId: string) => api.post(`/backlog/student/${studentId}/initialize`),
  getItem: (studentId: string, topic: string, subtopic: string) =>
    api.get(`/backlog/student/${studentId}/item?topic=${topic}&subtopic=${subtopic}`),
  update: (id: string, data: any) => api.put(`/backlog/${id}`, data),
  bulkUpdate: (studentId: string, updates: any[]) =>
    api.put(`/backlog/student/${studentId}/bulk`, { updates }),
};

// Syllabus API
export const syllabusApi = {
  getAll: () => api.get('/syllabus'),
  getBySubject: (subject: string) => api.get(`/syllabus/subject/${subject}`),
  create: (data: any) => api.post('/syllabus', data),
  update: (id: string, data: any) => api.put(`/syllabus/${id}`, data),
  delete: (id: string) => api.delete(`/syllabus/${id}`),
  deleteAll: () => api.delete('/syllabus'),
  addTopic: (id: string, data: { name: string; subtopics: string[] }) => api.post(`/syllabus/${id}/topics`, data),
  addSubtopic: (id: string, topicId: string, subtopic: string) => api.post(`/syllabus/${id}/topics/${topicId}/subtopics`, { subtopic }),
  removeSubtopic: (id: string, topicId: string, subtopic: string) => api.delete(`/syllabus/${id}/topics/${topicId}/subtopics/${encodeURIComponent(subtopic)}`),
  deleteTopic: (id: string, topicId: string) => api.delete(`/syllabus/${id}/topics/${topicId}`),
};

// Auth API
export const authApi = {
  login: (username: string, password: string) => api.post('/auth/login', { username, password }),
  verify: () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return api.get('/auth/verify', {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  changePassword: (currentPassword: string, newPassword: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return api.post('/auth/change-password', { currentPassword, newPassword }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  verifyOTP: (otp: string) => api.post('/auth/verify-otp', { otp }),
  resetPassword: (otp: string, newPassword: string) => api.post('/auth/reset-password', { otp, newPassword }),
  updateHeaderName: (headerName: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return api.post('/auth/update-header-name', { headerName }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
};

// Add token to all requests
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Topics API
export const topicsApi = {
  getAll: () => api.get('/topics'),
  getBySubject: (subject: string) => api.get(`/topics/subject/${subject}`),
  getGroupedSubtopics: () => api.get('/topics/subtopics/grouped'),
  create: (data: { name: string; subject: string }) => api.post('/topics', data),
  addSubtopic: (topicId: string, name: string) => api.post(`/topics/${topicId}/subtopics`, { name }),
  updateSubtopic: (topicId: string, subtopicId: string, name: string) => api.put(`/topics/${topicId}/subtopics/${subtopicId}`, { name }),
  deleteSubtopic: (topicId: string, subtopicId: string) => api.delete(`/topics/${topicId}/subtopics/${subtopicId}`),
  delete: (topicId: string) => api.delete(`/topics/${topicId}`),
};

// Student Topic Status API
export const studentTopicStatusApi = {
  getByStudent: (studentId: string) => api.get(`/student-topic-status/student/${studentId}`),
  getBulk: (studentIds: string[]) => api.post('/student-topic-status/students/bulk', { studentIds }),
  update: (studentId: string, data: { 
    subject: string; 
    topicName: string; 
    subtopicName?: string; 
    status?: string | null;
    theoryCompleted?: boolean;
    solvingCompleted?: boolean;
  }) => 
    api.post(`/student-topic-status/student/${studentId}`, data),
  incrementNegative: (studentId: string, data: { subject: string; topicName: string; subtopicName: string }) =>
    api.post(`/student-topic-status/student/${studentId}/negative`, data),
};

// WhatsApp API
export const whatsappApi = {
  configure: (data: { accountSid?: string; authToken?: string; fromNumber: string; provider?: string }) =>
    api.post('/whatsapp/configure', data),
  getStatus: () => api.get('/whatsapp/status'),
  sendTest: (data: { toNumber: string; message?: string }) => api.post('/whatsapp/test', data),
};

export default api;


import axios from "axios";
import { API_URL } from "../config";

const api = axios.create({ baseURL: API_URL });

// Attach the JWT to every request once the user is logged in
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Expired or invalid token: send the person back to log in.
// Spring answers 403 (not 401) for unauthenticated requests, so handle both.
// Calls to /auth/* are skipped so a wrong password shows its error instead of reloading the page.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isAuthCall = (error.config?.url || "").startsWith("/auth/");
    const hadToken = Boolean(localStorage.getItem("token"));

    if ((status === 401 || status === 403) && hadToken && !isAuthCall) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
};

export const userAPI = {
  getProfile: () => api.get("/users/profile"),
  updateProfile: (data) => api.put("/users/profile", data),
};

export const bookAPI = {
  getAll: () => api.get("/books"),
  getMine: () => api.get("/books/mine"),
  getById: (id) => api.get(`/books/${id}`),
  create: (data) => api.post("/books", data),
  update: (id, data) => api.put(`/books/${id}`, data),
  delete: (id) => api.delete(`/books/${id}`),
  search: (params) => api.get("/books/search", { params }),
  uploadImage: (formData) =>
    api.post("/books/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

export const offerAPI = {
  create: (data) => api.post("/offers", data),
  getMine: () => api.get("/offers"),
  getReceived: () => api.get("/offers/received"),
  accept: (id) => api.put(`/offers/${id}/accept`),
  reject: (id) => api.put(`/offers/${id}/reject`),
};

export const messageAPI = {
  getForOffer: (offerId) => api.get(`/messages/${offerId}`),
  send: (data) => api.post("/messages", data),
};

export default api;

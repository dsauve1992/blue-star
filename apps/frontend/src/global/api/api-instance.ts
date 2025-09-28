import { ApiClient } from "./api-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const apiClient = new ApiClient({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

export const startCrawl = (config) => api.post("/start", config);
export const getStatus = (runId) => api.get(`/status/${runId}`);
export const getResult = (runId) => api.get(`/result/${runId}`);
export const exportData = (runId, format) => api.get(`/export/${runId}/${format}`, { responseType: "blob" });

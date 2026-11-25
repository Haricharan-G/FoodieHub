//centeralized API setup

import axios from "axios";
import qs from "qs";

const apiOrigin = import.meta.env.VITE_API_URL?.replace(/\/$/, "");

const api = axios.create({
  // In local development Vite proxies /api to the Express server.  A hosted
  // build can still provide VITE_API_URL (for example, https://api.example.com).
  baseURL: apiOrigin ? `${apiOrigin}/api` : "/api",
  withCredentials: true,
  paramsSerializer: (params) => qs.stringify(params, { arrayFormat: "repeat" }),
});

export default api;

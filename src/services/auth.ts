import { apiClient } from "./apiClient";

export async function login(username: string, password: string) {
  return apiClient("/api/login", { method: "POST", body: JSON.stringify({ username, password }) });
}

export async function logout() {
  return apiClient("/api/logout", { method: "POST" });
}

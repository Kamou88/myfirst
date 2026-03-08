import { requestJson } from "./http";

export function login(apiBaseUrl, payload) {
  return requestJson(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getMe(apiBaseUrl) {
  return requestJson(`${apiBaseUrl}/api/auth/me`);
}

export function logout(apiBaseUrl) {
  return requestJson(`${apiBaseUrl}/api/auth/logout`, {
    method: "POST",
  });
}

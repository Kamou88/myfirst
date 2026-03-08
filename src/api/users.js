import { requestJson } from "./http";

export function listUsers(apiBaseUrl) {
  return requestJson(`${apiBaseUrl}/api/users`);
}

export function createUser(apiBaseUrl, payload) {
  return requestJson(`${apiBaseUrl}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateUserByID(apiBaseUrl, id, payload) {
  return requestJson(`${apiBaseUrl}/api/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteUserByID(apiBaseUrl, id) {
  return requestJson(`${apiBaseUrl}/api/users/${id}`, {
    method: "DELETE",
  });
}

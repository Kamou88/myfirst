import { requestJson } from "./http";

export function listDeviceTypes(apiBaseUrl) {
  return requestJson(`${apiBaseUrl}/api/device-types`);
}

export function createDeviceType(apiBaseUrl, payload) {
  return requestJson(`${apiBaseUrl}/api/device-types`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateDeviceTypeByID(apiBaseUrl, id, payload) {
  return requestJson(`${apiBaseUrl}/api/device-types/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteDeviceTypeByID(apiBaseUrl, id) {
  return requestJson(`${apiBaseUrl}/api/device-types/${id}`, {
    method: "DELETE",
  });
}

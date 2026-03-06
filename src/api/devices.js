import { requestJson } from "./http";

export function listDevices(apiBaseUrl) {
  return requestJson(`${apiBaseUrl}/api/devices`);
}

export function createDevice(apiBaseUrl, payload) {
  return requestJson(`${apiBaseUrl}/api/devices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateDeviceByID(apiBaseUrl, id, payload) {
  return requestJson(`${apiBaseUrl}/api/devices/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteDeviceByID(apiBaseUrl, id) {
  return requestJson(`${apiBaseUrl}/api/devices/${id}`, { method: "DELETE" });
}

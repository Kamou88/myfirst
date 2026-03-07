import { requestJson } from "./http";

export function listMaterials(apiBaseUrl) {
  return requestJson(`${apiBaseUrl}/api/materials`);
}

export function createMaterial(apiBaseUrl, payload) {
  return requestJson(`${apiBaseUrl}/api/materials`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateMaterialByID(apiBaseUrl, id, payload) {
  return requestJson(`${apiBaseUrl}/api/materials/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteMaterialByID(apiBaseUrl, id) {
  return requestJson(`${apiBaseUrl}/api/materials/${id}`, { method: "DELETE" });
}

export function syncMaterialRaw(apiBaseUrl) {
  return requestJson(`${apiBaseUrl}/api/materials/sync-raw`, {
    method: "POST",
  });
}

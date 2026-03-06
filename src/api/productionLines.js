import { requestJson } from "./http";

export function listProductionLines(apiBaseUrl) {
  return requestJson(`${apiBaseUrl}/api/production-lines`);
}

export function createProductionLine(apiBaseUrl, payload) {
  return requestJson(`${apiBaseUrl}/api/production-lines`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateProductionLineByID(apiBaseUrl, id, payload) {
  return requestJson(`${apiBaseUrl}/api/production-lines/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteProductionLineByID(apiBaseUrl, id) {
  return requestJson(`${apiBaseUrl}/api/production-lines/${id}`, {
    method: "DELETE",
  });
}

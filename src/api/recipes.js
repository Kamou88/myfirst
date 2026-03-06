import { requestJson } from "./http";

export function listRecipes(apiBaseUrl) {
  return requestJson(`${apiBaseUrl}/api/recipes`);
}

export function createRecipes(apiBaseUrl, payload) {
  return requestJson(`${apiBaseUrl}/api/recipes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateRecipeGroup(apiBaseUrl, id, payload) {
  return requestJson(`${apiBaseUrl}/api/recipes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteRecipeByID(apiBaseUrl, id) {
  return requestJson(`${apiBaseUrl}/api/recipes/${id}`, { method: "DELETE" });
}

export function updateRecipeBooster(apiBaseUrl, id, boosterTier) {
  return requestJson(`${apiBaseUrl}/api/recipes/${id}/booster`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ boosterTier }),
  });
}

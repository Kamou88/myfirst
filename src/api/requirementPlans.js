import { requestJson } from "./http";

export function listRequirementPlans(apiBaseUrl) {
  return requestJson(`${apiBaseUrl}/api/requirement-plans`);
}

export function createRequirementPlan(apiBaseUrl, payload) {
  return requestJson(`${apiBaseUrl}/api/requirement-plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateRequirementPlanByID(apiBaseUrl, id, payload) {
  return requestJson(`${apiBaseUrl}/api/requirement-plans/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteRequirementPlanByID(apiBaseUrl, id) {
  return requestJson(`${apiBaseUrl}/api/requirement-plans/${id}`, {
    method: "DELETE",
  });
}

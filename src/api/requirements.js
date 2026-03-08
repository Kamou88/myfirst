import { requestJson } from "./http";

export function calculateRequirements(apiBaseUrl, payload) {
  return requestJson(`${apiBaseUrl}/api/requirements/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

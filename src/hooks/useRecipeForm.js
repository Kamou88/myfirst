import { useState } from "react";

const emptyMaterial = { name: "", amount: "" };

export function useRecipeForm(devices) {
  const [name, setName] = useState("");
  const [machineName, setMachineName] = useState("");
  const [cycleSeconds, setCycleSeconds] = useState("");
  const [inputs, setInputs] = useState([{ ...emptyMaterial }]);
  const [outputs, setOutputs] = useState([{ ...emptyMaterial }]);
  const [canSpeedup, setCanSpeedup] = useState(true);
  const [canBoost, setCanBoost] = useState(true);
  const [editingRecipeId, setEditingRecipeId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function updateMaterial(listSetter, index, field, value) {
    listSetter((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  function addMaterial(listSetter) {
    listSetter((prev) => [...prev, { ...emptyMaterial }]);
  }

  function removeMaterial(listSetter, index) {
    listSetter((prev) => prev.filter((_, idx) => idx !== index));
  }

  function normalizeMaterials(items) {
    return items
      .map((item) => ({ name: item.name.trim(), amount: Number(item.amount) }))
      .filter((item) => item.name && item.amount > 0);
  }

  function formatNumberForInput(value) {
    if (!Number.isFinite(value)) return "";
    return String(parseFloat(value.toFixed(6)));
  }

  function getBoosterMultipliers(boosterTier, effectMode) {
    const tier = boosterTier || "mk3";
    if (tier === "mk1") {
      if (effectMode === "speed")
        return { cycleMultiplier: 0.75, outputMultiplier: 1 };
      if (effectMode === "boost")
        return { cycleMultiplier: 1, outputMultiplier: 1.125 };
      return { cycleMultiplier: 1, outputMultiplier: 1 };
    }
    if (tier === "mk2") {
      if (effectMode === "speed")
        return { cycleMultiplier: 2 / 3, outputMultiplier: 1 };
      if (effectMode === "boost")
        return { cycleMultiplier: 1, outputMultiplier: 1.2 };
      return { cycleMultiplier: 1, outputMultiplier: 1 };
    }
    if (effectMode === "speed")
      return { cycleMultiplier: 0.5, outputMultiplier: 1 };
    if (effectMode === "boost")
      return { cycleMultiplier: 1, outputMultiplier: 1.25 };
    return { cycleMultiplier: 1, outputMultiplier: 1 };
  }

  function resetRecipeForm() {
    setName("");
    setMachineName("");
    setCycleSeconds("");
    setInputs([{ ...emptyMaterial }]);
    setOutputs([{ ...emptyMaterial }]);
    setCanSpeedup(true);
    setCanBoost(true);
    setEditingRecipeId(null);
  }

  function startEditRecipe(item) {
    const matchedDevice =
      devices.find(
        (d) => d.name === item.deviceModel && d.deviceType === item.machineName,
      ) || devices.find((d) => d.name === item.deviceModel);
    const efficiency =
      Number(matchedDevice?.efficiencyPercent) > 0
        ? Number(matchedDevice.efficiencyPercent)
        : 100;
    const { cycleMultiplier, outputMultiplier } = getBoosterMultipliers(
      item.boosterTier,
      item.effectMode,
    );
    const baseCycleSeconds =
      (Number(item.cycleSeconds) / cycleMultiplier) * (efficiency / 100);
    const outputRecoverScale = 1 / outputMultiplier;

    setEditingRecipeId(item.id);
    setName(item.name);
    setMachineName(item.machineName);
    setCycleSeconds(formatNumberForInput(baseCycleSeconds));
    setInputs(
      item.inputs.map((m) => ({ name: m.name, amount: String(m.amount) })),
    );
    setOutputs(
      item.outputs.map((m) => ({
        name: m.name,
        amount: formatNumberForInput(Number(m.amount) * outputRecoverScale),
      })),
    );
    setCanSpeedup(item.canSpeedup ?? true);
    setCanBoost(item.canBoost ?? true);
  }

  function buildPayload() {
    return {
      name: name.trim(),
      machineName: machineName.trim(),
      cycleSeconds: Number(cycleSeconds),
      powerKW: 0,
      canSpeedup,
      canBoost,
      inputs: normalizeMaterials(inputs),
      outputs: normalizeMaterials(outputs),
    };
  }

  return {
    name,
    setName,
    machineName,
    setMachineName,
    cycleSeconds,
    setCycleSeconds,
    inputs,
    setInputs,
    outputs,
    setOutputs,
    canSpeedup,
    setCanSpeedup,
    canBoost,
    setCanBoost,
    editingRecipeId,
    setEditingRecipeId,
    submitting,
    setSubmitting,
    updateMaterial,
    addMaterial,
    removeMaterial,
    resetRecipeForm,
    startEditRecipe,
    buildPayload,
  };
}

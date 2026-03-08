import { useEffect, useMemo, useState } from "react";
import { listDevices } from "../api/devices";
import { listDeviceTypes } from "../api/deviceTypes";
import { listMaterials } from "../api/materials";
import {
  deleteRecipeByID,
  listRecipes,
  updateRecipeBooster,
  updateRecipeResearch,
} from "../api/recipes";

function boosterSortRank(item) {
  if ((item.effectMode || "") === "none") return 0;
  const tier = (item.boosterTier || "mk3").toLowerCase();
  if (tier === "mk1") return 1;
  if (tier === "mk2") return 2;
  return 3;
}

function effectSortRank(effectMode) {
  if (effectMode === "none") return 0;
  if (effectMode === "speed") return 1;
  if (effectMode === "boost") return 2;
  return 9;
}

export function useRecipesData(apiBaseUrl) {
  const [recipes, setRecipes] = useState([]);
  const [devices, setDevices] = useState([]);
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [productFilter, setProductFilter] = useState("");
  const [effectFilter, setEffectFilter] = useState("");
  const [deviceModelFilter, setDeviceModelFilter] = useState("");
  const [boosterTierFilter, setBoosterTierFilter] = useState("");
  const [researchedFilter, setResearchedFilter] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function normalizeRecipe(item) {
    return {
      ...item,
      isResearched: Boolean(item?.isResearched),
    };
  }

  async function loadRecipesData() {
    try {
      setLoading(true);
      const data = await listRecipes(apiBaseUrl);
      setRecipes((data || []).map(normalizeRecipe));
      setMessage("");
    } catch (error) {
      setMessage(`加载配方失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecipeOptionsData() {
    try {
      const [typeData, materialData, deviceData] = await Promise.all([
        listDeviceTypes(apiBaseUrl),
        listMaterials(apiBaseUrl),
        listDevices(apiBaseUrl),
      ]);
      setDeviceTypes(typeData);
      setMaterials(materialData);
      setDevices(deviceData);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function changeRecipeBoosterTier(item, boosterTier) {
    try {
      const updated = await updateRecipeBooster(
        apiBaseUrl,
        item.id,
        boosterTier,
      );
      const updatedItems = Array.isArray(updated) ? updated : [updated];
      await loadRecipesData();
      setMessage(`增产剂已更新（同效果共 ${updatedItems.length} 条）`);
    } catch (error) {
      setMessage(`更新增产剂失败: ${error.message}`);
    }
  }

  async function removeRecipe(id) {
    try {
      await deleteRecipeByID(apiBaseUrl, id);
      setRecipes((prev) => prev.filter((item) => item.id !== id));
      setMessage("配方删除成功");
      return true;
    } catch (error) {
      setMessage(`删除配方失败: ${error.message}`);
      return false;
    }
  }

  async function toggleRecipeResearch(item) {
    const nextValue = !Boolean(item?.isResearched);
    try {
      await updateRecipeResearch(apiBaseUrl, item.id, nextValue);
      await loadRecipesData();
      setMessage(nextValue ? "已标记为已研究" : "已标记为未研究");
    } catch (error) {
      setMessage(`更新研究状态失败: ${error.message}`);
    }
  }

  const craftableMaterials = useMemo(
    () => materials.filter((m) => m.isCraftable),
    [materials],
  );
  const rawMaterials = useMemo(
    () => materials.filter((m) => m.isRaw),
    [materials],
  );

  const productOptions = useMemo(
    () =>
      Array.from(
        new Set(
          recipes
            .flatMap((item) => item.outputs || [])
            .map((m) => (m.name || "").trim())
            .filter((name) => name.length > 0),
        ),
      ),
    [recipes],
  );

  const deviceModelOptions = useMemo(
    () =>
      Array.from(
        new Set(
          recipes
            .map((item) => (item.deviceModel || "").trim())
            .filter((model) => model.length > 0),
        ),
      ),
    [recipes],
  );

  const visibleRecipes = useMemo(
    () =>
      recipes
        .filter((item) => {
          if (
            productFilter &&
            !(item.outputs || []).some((m) => m.name === productFilter)
          ) {
            return false;
          }
          if (effectFilter && item.effectMode !== effectFilter) return false;
          if (
            deviceModelFilter &&
            (item.deviceModel || "") !== deviceModelFilter
          ) {
            return false;
          }
          if (boosterTierFilter) {
            if (boosterTierFilter === "none") {
              if (item.effectMode !== "none") return false;
            } else {
              if (item.effectMode === "none") return false;
              const tier = (item.boosterTier || "mk3").toLowerCase();
              if (tier !== boosterTierFilter) return false;
            }
          }
          if (researchedFilter) {
            const isResearched = Boolean(item.isResearched);
            if (researchedFilter === "researched" && !isResearched) return false;
            if (researchedFilter === "unresearched" && isResearched) return false;
          }
          return true;
        })
        .sort((a, b) => {
          const byName = String(a.name || "").localeCompare(
            String(b.name || ""),
            "zh-Hans-CN",
          );
          if (byName !== 0) return byName;

          const byBooster = boosterSortRank(a) - boosterSortRank(b);
          if (byBooster !== 0) return byBooster;

          const byDeviceModel = String(a.deviceModel || "").localeCompare(
            String(b.deviceModel || ""),
            "zh-Hans-CN",
          );
          if (byDeviceModel !== 0) return byDeviceModel;

          const byEffect = effectSortRank(a.effectMode) - effectSortRank(b.effectMode);
          if (byEffect !== 0) return byEffect;
          return Number(a.id || 0) - Number(b.id || 0);
        }),
    [
      recipes,
      productFilter,
      effectFilter,
      deviceModelFilter,
      boosterTierFilter,
      researchedFilter,
    ],
  );

  function clearFilters() {
    setProductFilter("");
    setEffectFilter("");
    setDeviceModelFilter("");
    setBoosterTierFilter("");
    setResearchedFilter("");
  }

  function appendCreatedRecipes(items) {
    const generated = Array.isArray(items) ? items : [items];
    const normalized = generated.map(normalizeRecipe);
    setRecipes((prev) => [...prev, ...normalized]);
    return normalized;
  }

  useEffect(() => {
    loadRecipesData();
    loadRecipeOptionsData();
  }, [apiBaseUrl]);

  return {
    recipes,
    devices,
    deviceTypes,
    materials,
    craftableMaterials,
    rawMaterials,
    loading,
    message,
    setMessage,
    productFilter,
    effectFilter,
    deviceModelFilter,
    boosterTierFilter,
    researchedFilter,
    setProductFilter,
    setEffectFilter,
    setDeviceModelFilter,
    setBoosterTierFilter,
    setResearchedFilter,
    clearFilters,
    productOptions,
    deviceModelOptions,
    visibleRecipes,
    loadRecipesData,
    appendCreatedRecipes,
    changeRecipeBoosterTier,
    toggleRecipeResearch,
    removeRecipe,
  };
}

import { useEffect, useMemo, useState } from "react";
import { listDevices } from "../api/devices";
import { listDeviceTypes } from "../api/deviceTypes";
import { listMaterials } from "../api/materials";
import {
  deleteRecipeByID,
  listRecipes,
  updateRecipeBooster,
} from "../api/recipes";

export function useRecipesData(apiBaseUrl) {
  const [recipes, setRecipes] = useState([]);
  const [devices, setDevices] = useState([]);
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [productFilter, setProductFilter] = useState("");
  const [effectFilter, setEffectFilter] = useState("");
  const [deviceModelFilter, setDeviceModelFilter] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadRecipesData() {
    try {
      setLoading(true);
      const data = await listRecipes(apiBaseUrl);
      setRecipes(data);
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
      recipes.filter((item) => {
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
        return true;
      }),
    [recipes, productFilter, effectFilter, deviceModelFilter],
  );

  function clearFilters() {
    setProductFilter("");
    setEffectFilter("");
    setDeviceModelFilter("");
  }

  function appendCreatedRecipes(items) {
    const generated = Array.isArray(items) ? items : [items];
    setRecipes((prev) => [...prev, ...generated]);
    return generated;
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
    setProductFilter,
    setEffectFilter,
    setDeviceModelFilter,
    clearFilters,
    productOptions,
    deviceModelOptions,
    visibleRecipes,
    loadRecipesData,
    appendCreatedRecipes,
    changeRecipeBoosterTier,
    removeRecipe,
  };
}

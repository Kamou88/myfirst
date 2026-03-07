import { useEffect, useState } from "react";
import {
  createMaterial,
  deleteMaterialByID,
  listMaterials,
  syncMaterialRaw,
  updateMaterialByID,
} from "../api/materials";
import { listRecipes } from "../api/recipes";

function buildRawMismatchNames(materials, recipes) {
  const recipeInputNames = new Set(
    (recipes || [])
      .flatMap((recipe) => recipe.inputs || [])
      .map((item) => String(item.name || "").trim())
      .filter(Boolean),
  );
  return (materials || [])
    .filter((material) => Boolean(material.isRaw) !== recipeInputNames.has(material.name))
    .map((material) => material.name);
}

export function useMaterialsData(apiBaseUrl) {
  const [materials, setMaterials] = useState([]);
  const [rawMismatchNames, setRawMismatchNames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function reload() {
    try {
      setLoading(true);
      const [materialData, recipeData] = await Promise.all([
        listMaterials(apiBaseUrl),
        listRecipes(apiBaseUrl),
      ]);
      setMaterials(materialData);
      setRawMismatchNames(buildRawMismatchNames(materialData, recipeData));
      setMessage("");
    } catch (error) {
      setMessage(`加载材料失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function save(editingId, payload) {
    if (!payload.name) {
      setMessage("请填写材料名称");
      return null;
    }
    try {
      setSubmitting(true);
      const isEditing = editingId !== null;
      const item = isEditing
        ? await updateMaterialByID(apiBaseUrl, editingId, payload)
        : await createMaterial(apiBaseUrl, payload);
      setMaterials((prev) =>
        isEditing
          ? prev.map((m) => (m.id === item.id ? item : m))
          : [...prev, item],
      );
      await reload();
      setMessage(isEditing ? "材料更新成功" : "材料新增成功");
      return item;
    } catch (error) {
      setMessage(`保存材料失败: ${error.message}`);
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id, editingId) {
    try {
      await deleteMaterialByID(apiBaseUrl, id);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      await reload();
      setMessage("材料删除成功");
      return editingId === id;
    } catch (error) {
      setMessage(`删除材料失败: ${error.message}`);
      return false;
    }
  }

  async function syncRaw() {
    try {
      setSubmitting(true);
      const data = await syncMaterialRaw(apiBaseUrl);
      setMaterials(data || []);
      const recipeData = await listRecipes(apiBaseUrl);
      setRawMismatchNames(buildRawMismatchNames(data || [], recipeData || []));
      setMessage("已按配方输入同步原料属性");
      return true;
    } catch (error) {
      setMessage(`同步原料属性失败: ${error.message}`);
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    reload();
  }, [apiBaseUrl]);

  return {
    materials,
    rawMismatchNames,
    loading,
    submitting,
    message,
    setMessage,
    reload,
    save,
    remove,
    syncRaw,
  };
}

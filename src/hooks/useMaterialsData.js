import { useEffect, useState } from "react";
import {
  createMaterial,
  deleteMaterialByID,
  listMaterials,
  updateMaterialByID,
} from "../api/materials";

export function useMaterialsData(apiBaseUrl) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function reload() {
    try {
      setLoading(true);
      const data = await listMaterials(apiBaseUrl);
      setMaterials(data);
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
      setMessage("材料删除成功");
      return editingId === id;
    } catch (error) {
      setMessage(`删除材料失败: ${error.message}`);
      return false;
    }
  }

  useEffect(() => {
    reload();
  }, [apiBaseUrl]);

  return {
    materials,
    loading,
    submitting,
    message,
    setMessage,
    reload,
    save,
    remove,
  };
}

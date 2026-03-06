import { useEffect, useState } from "react";
import {
  createDeviceType,
  deleteDeviceTypeByID,
  listDeviceTypes,
  updateDeviceTypeByID,
} from "../api/deviceTypes";

export function useDeviceTypesData(apiBaseUrl) {
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function reload() {
    try {
      setLoading(true);
      const data = await listDeviceTypes(apiBaseUrl);
      setDeviceTypes(data);
      setMessage("");
    } catch (error) {
      setMessage(`加载设备种类失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function save(editingId, name) {
    const payload = { name: name.trim() };
    if (!payload.name) {
      setMessage("请填写设备种类名称");
      return null;
    }
    try {
      setSubmitting(true);
      const isEditing = editingId !== null;
      const item = isEditing
        ? await updateDeviceTypeByID(apiBaseUrl, editingId, payload)
        : await createDeviceType(apiBaseUrl, payload);
      setDeviceTypes((prev) =>
        isEditing
          ? prev.map((d) => (d.id === item.id ? item : d))
          : [...prev, item],
      );
      setMessage(isEditing ? "设备种类更新成功" : "设备种类新增成功");
      return item;
    } catch (error) {
      setMessage(`保存设备种类失败: ${error.message}`);
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id, editingId) {
    try {
      await deleteDeviceTypeByID(apiBaseUrl, id);
      setDeviceTypes((prev) => prev.filter((d) => d.id !== id));
      setMessage("设备种类删除成功");
      return editingId === id;
    } catch (error) {
      setMessage(`删除设备种类失败: ${error.message}`);
      return false;
    }
  }

  useEffect(() => {
    reload();
  }, [apiBaseUrl]);

  return {
    deviceTypes,
    loading,
    submitting,
    message,
    setMessage,
    reload,
    save,
    remove,
  };
}

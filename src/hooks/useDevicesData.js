import { useEffect, useState } from "react";
import {
  createDevice,
  deleteDeviceByID,
  listDevices,
  updateDeviceByID,
} from "../api/devices";
import { listDeviceTypes } from "../api/deviceTypes";

export function useDevicesData(apiBaseUrl) {
  const [devices, setDevices] = useState([]);
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function reloadDevices() {
    try {
      setLoading(true);
      const data = await listDevices(apiBaseUrl);
      setDevices(data);
      setMessage("");
    } catch (error) {
      setMessage(`加载设备失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function reloadDeviceTypes() {
    try {
      const data = await listDeviceTypes(apiBaseUrl);
      setDeviceTypes(data);
    } catch (error) {
      setMessage(`加载设备种类失败: ${error.message}`);
    }
  }

  async function save(editingId, payload) {
    if (
      !payload.deviceType ||
      !payload.name ||
      payload.efficiencyPercent <= 0 ||
      payload.powerKW < 0
    ) {
      setMessage("请填写设备种类与型号，生产效率>0，且机器功耗不能为负数");
      return null;
    }
    try {
      setSubmitting(true);
      const isEditing = editingId !== null;
      const item = isEditing
        ? await updateDeviceByID(apiBaseUrl, editingId, payload)
        : await createDevice(apiBaseUrl, payload);
      setDevices((prev) =>
        isEditing
          ? prev.map((d) => (d.id === item.id ? item : d))
          : [...prev, item],
      );
      setMessage(isEditing ? "设备更新成功" : "设备新增成功");
      return item;
    } catch (error) {
      setMessage(`保存设备失败: ${error.message}`);
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id, editingId) {
    try {
      await deleteDeviceByID(apiBaseUrl, id);
      setDevices((prev) => prev.filter((d) => d.id !== id));
      setMessage("设备删除成功");
      return editingId === id;
    } catch (error) {
      setMessage(`删除设备失败: ${error.message}`);
      return false;
    }
  }

  useEffect(() => {
    reloadDevices();
    reloadDeviceTypes();
  }, [apiBaseUrl]);

  return {
    devices,
    deviceTypes,
    loading,
    submitting,
    message,
    setMessage,
    reloadDevices,
    reloadDeviceTypes,
    save,
    remove,
  };
}

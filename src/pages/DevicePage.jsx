import { useState } from "react";
import { useDevicesData } from "../hooks/useDevicesData";

function DevicePage({ apiBaseUrl }) {
  const [deviceType, setDeviceType] = useState("");
  const [name, setName] = useState("");
  const [efficiencyPercent, setEfficiencyPercent] = useState("");
  const [powerKW, setPowerKW] = useState("");
  const [editingId, setEditingId] = useState(null);
  const {
    devices,
    deviceTypes,
    loading,
    submitting,
    message,
    reloadDevices,
    save,
    remove,
  } = useDevicesData(apiBaseUrl);

  function resetForm() {
    setDeviceType("");
    setName("");
    setEfficiencyPercent("");
    setPowerKW("");
    setEditingId(null);
  }

  async function submitDevice(event) {
    event.preventDefault();
    const payload = {
      deviceType: deviceType.trim(),
      name: name.trim(),
      efficiencyPercent: Number(efficiencyPercent),
      powerKW: Number(powerKW),
    };
    const item = await save(editingId, payload);
    if (item) {
      resetForm();
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setDeviceType(item.deviceType || "");
    setName(item.name);
    setEfficiencyPercent(String(item.efficiencyPercent));
    setPowerKW(String(item.powerKW));
  }

  async function removeDevice(id) {
    const shouldReset = await remove(id, editingId);
    if (shouldReset) {
      resetForm();
    }
  }

  return (
    <div className="card">
      <h2>设备管理（CRUD）</h2>
      <form className="recipe-form" onSubmit={submitDevice}>
        <div className="grid">
          <select
            value={deviceType}
            onChange={(event) => setDeviceType(event.target.value)}
          >
            <option value="">请选择设备种类</option>
            {deviceTypes.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="设备型号（例如：熔炉 Mk1）"
          />
          <input
            type="number"
            min="0.001"
            step="0.001"
            value={efficiencyPercent}
            onChange={(event) => setEfficiencyPercent(event.target.value)}
            placeholder="生产效率百分比（例如：100）"
          />
          <input
            type="number"
            min="0"
            step="0.001"
            value={powerKW}
            onChange={(event) => setPowerKW(event.target.value)}
            placeholder="设备功耗（kW）"
          />
        </div>
        <div className="actions">
          <button type="submit" disabled={submitting}>
            {submitting
              ? "保存中..."
              : editingId !== null
                ? "更新设备"
                : "新增设备"}
          </button>
          <button type="button" onClick={reloadDevices} disabled={loading}>
            {loading ? "刷新中..." : "刷新设备列表"}
          </button>
          {editingId !== null ? (
            <button type="button" onClick={resetForm}>
              取消编辑
            </button>
          ) : null}
        </div>
      </form>

      <h3>已保存设备</h3>
      <ul className="recipe-list">
        {devices.map((item) => (
          <li key={item.id}>
            <strong>{item.deviceType || "未分类"}</strong> / 型号 {item.name} /
            生产效率 {item.efficiencyPercent}% / 功耗 {item.powerKW}kW
            <div className="actions">
              <button type="button" onClick={() => startEdit(item)}>
                编辑
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => removeDevice(item.id)}
              >
                删除
              </button>
            </div>
          </li>
        ))}
      </ul>
      {!loading && devices.length === 0 && <p>还没有设备，先新增一台吧。</p>}
      {deviceTypes.length === 0 && (
        <p className="hint">请先到“设备种类管理”新增设备种类。</p>
      )}
      {message && <p>{message}</p>}
    </div>
  );
}

export default DevicePage;

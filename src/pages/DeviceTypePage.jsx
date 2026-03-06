import { useState } from "react";
import { useDeviceTypesData } from "../hooks/useDeviceTypesData";

function DeviceTypePage({ apiBaseUrl }) {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const { deviceTypes, loading, submitting, message, reload, save, remove } =
    useDeviceTypesData(apiBaseUrl);

  function resetForm() {
    setName("");
    setEditingId(null);
  }

  async function submitDeviceType(event) {
    event.preventDefault();
    const item = await save(editingId, name);
    if (item) resetForm();
  }

  function startEdit(item) {
    setEditingId(item.id);
    setName(item.name);
  }

  async function removeDeviceType(id) {
    const shouldReset = await remove(id, editingId);
    if (shouldReset) resetForm();
  }

  return (
    <div className="card">
      <h2>设备种类管理（CRUD）</h2>
      <form className="recipe-form" onSubmit={submitDeviceType}>
        <div className="grid material-grid">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="设备种类（例如：熔炉）"
          />
        </div>
        <div className="actions">
          <button type="submit" disabled={submitting}>
            {submitting
              ? "保存中..."
              : editingId !== null
                ? "更新设备种类"
                : "新增设备种类"}
          </button>
          <button type="button" onClick={reload} disabled={loading}>
            {loading ? "刷新中..." : "刷新列表"}
          </button>
          {editingId !== null ? (
            <button type="button" onClick={resetForm}>
              取消编辑
            </button>
          ) : null}
        </div>
      </form>

      <h3>已保存设备种类</h3>
      <ul className="recipe-list">
        {deviceTypes.map((item) => (
          <li key={item.id}>
            <strong>{item.name}</strong>
            <div className="actions">
              <button type="button" onClick={() => startEdit(item)}>
                编辑
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => removeDeviceType(item.id)}
              >
                删除
              </button>
            </div>
          </li>
        ))}
      </ul>
      {!loading && deviceTypes.length === 0 && (
        <p>还没有设备种类，先新增一条吧。</p>
      )}
      {message && <p>{message}</p>}
    </div>
  );
}

export default DeviceTypePage;

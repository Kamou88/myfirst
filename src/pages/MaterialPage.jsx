import { useState } from "react";
import { useMaterialsData } from "../hooks/useMaterialsData";

function MaterialPage({ apiBaseUrl }) {
  const [name, setName] = useState("");
  const [isCraftable, setIsCraftable] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const { materials, loading, submitting, message, reload, save, remove } =
    useMaterialsData(apiBaseUrl);

  function resetForm() {
    setName("");
    setIsCraftable(false);
    setEditingId(null);
  }

  async function submitMaterial(event) {
    event.preventDefault();
    const payload = { name: name.trim(), isCraftable };
    const item = await save(editingId, payload);
    if (item) {
      resetForm();
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setName(item.name);
    setIsCraftable(Boolean(item.isCraftable));
  }

  async function removeMaterial(id) {
    const shouldReset = await remove(id, editingId);
    if (shouldReset) {
      resetForm();
    }
  }

  return (
    <div className="card">
      <h2>材料管理（CRUD）</h2>
      <form className="recipe-form" onSubmit={submitMaterial}>
        <div className="grid material-grid">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="材料名称（例如：铁矿）"
          />
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={isCraftable}
              onChange={(event) => setIsCraftable(event.target.checked)}
            />
            可制造（可出现在配方输出产物）
          </label>
        </div>
        <div className="actions">
          <button type="submit" disabled={submitting}>
            {submitting
              ? "保存中..."
              : editingId !== null
                ? "更新材料"
                : "新增材料"}
          </button>
          <button type="button" onClick={reload} disabled={loading}>
            {loading ? "刷新中..." : "刷新材料列表"}
          </button>
          {editingId !== null ? (
            <button type="button" onClick={resetForm}>
              取消编辑
            </button>
          ) : null}
        </div>
      </form>

      <h3>已保存材料</h3>
      <ul className="recipe-list">
        {materials.map((item) => (
          <li key={item.id}>
            <strong>{item.name}</strong>
            <div className="sub-line">
              {item.isCraftable ? "可制造" : "不可制造"}
            </div>
            <div className="actions">
              <button type="button" onClick={() => startEdit(item)}>
                编辑
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => removeMaterial(item.id)}
              >
                删除
              </button>
            </div>
          </li>
        ))}
      </ul>
      {!loading && materials.length === 0 && <p>还没有材料，先新增一条吧。</p>}
      {message && <p>{message}</p>}
    </div>
  );
}

export default MaterialPage;

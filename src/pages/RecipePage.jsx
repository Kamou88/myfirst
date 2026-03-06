import { createRecipes, updateRecipeGroup } from "../api/recipes";
import { useRecipeForm } from "../hooks/useRecipeForm";
import { useRecipesData } from "../hooks/useRecipesData";

function getOutputPerMinuteText(item) {
  if (
    !item.outputs ||
    item.outputs.length === 0 ||
    !item.cycleSeconds ||
    item.cycleSeconds <= 0
  ) {
    return "无";
  }
  return item.outputs
    .map(
      (m) =>
        `${m.name} ${((Number(m.amount) * 60) / Number(item.cycleSeconds)).toFixed(2)}/分钟`,
    )
    .join("，");
}

function getInputPerMinuteText(item) {
  if (
    !item.inputs ||
    item.inputs.length === 0 ||
    !item.cycleSeconds ||
    item.cycleSeconds <= 0
  ) {
    return "无";
  }
  return item.inputs
    .map(
      (m) =>
        `${m.name} ${((Number(m.amount) * 60) / Number(item.cycleSeconds)).toFixed(2)}/分钟`,
    )
    .join("，");
}

function RecipePage({ apiBaseUrl }) {
  const {
    recipes,
    devices,
    deviceTypes,
    materials,
    craftableMaterials,
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
  } = useRecipesData(apiBaseUrl);

  const {
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
    submitting,
    setSubmitting,
    updateMaterial,
    addMaterial,
    removeMaterial,
    resetRecipeForm,
    startEditRecipe,
    buildPayload,
  } = useRecipeForm(devices);

  async function submitRecipe(event) {
    event.preventDefault();
    const payload = buildPayload();

    if (!payload.name || !payload.machineName || payload.cycleSeconds <= 0) {
      setMessage("请完整填写配方名、机器名和生产周期（秒）");
      return;
    }
    if (payload.inputs.length === 0 || payload.outputs.length === 0) {
      setMessage("至少填写一条有效输入和一条有效输出");
      return;
    }

    try {
      setSubmitting(true);
      const isEditing = editingRecipeId !== null;
      const saved = isEditing
        ? await updateRecipeGroup(apiBaseUrl, editingRecipeId, payload)
        : await createRecipes(apiBaseUrl, payload);
      const generated = Array.isArray(saved) ? saved : [saved];
      if (isEditing) {
        await loadRecipesData();
        setMessage(`配方更新成功，已重新生成 ${generated.length} 条`);
      } else {
        appendCreatedRecipes(generated);
        setMessage(`配方新增成功，已按设备型号生成 ${generated.length} 条`);
      }
      resetRecipeForm();
    } catch (error) {
      setMessage(`保存配方失败: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function removeRecipeAndResetIfNeeded(id) {
    const ok = await removeRecipe(id);
    if (ok && editingRecipeId === id) {
      resetRecipeForm();
    }
  }

  return (
    <div className="card">
      <h2>添加生产配方</h2>
      <form className="recipe-form" onSubmit={submitRecipe}>
        <div className="grid">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="配方名称（例如：铁板）"
          />
          <select
            value={machineName}
            onChange={(event) => setMachineName(event.target.value)}
          >
            <option value="">请选择设备种类</option>
            {deviceTypes.map((type) => (
              <option key={type.id} value={type.name}>
                {type.name}
              </option>
            ))}
          </select>
          <input
            value={machineName || "请选择设备种类"}
            readOnly
            placeholder="配方适用设备种类"
          />
          <input
            type="number"
            min="0.001"
            step="0.001"
            value={cycleSeconds}
            onChange={(event) => setCycleSeconds(event.target.value)}
            placeholder="生产周期（秒）"
          />
        </div>

        <div className="actions">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={canSpeedup}
              onChange={(event) => setCanSpeedup(event.target.checked)}
            />
            可加速（勾选后额外生成“可加速效果”配方）
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={canBoost}
              onChange={(event) => setCanBoost(event.target.checked)}
            />
            可增产（勾选后额外生成“可增产效果”配方）
          </label>
        </div>

        <h3>输入原料（每周期）</h3>
        {inputs.map((item, index) => (
          <div className="material-row" key={`in-${index}`}>
            <select
              value={item.name}
              onChange={(event) =>
                updateMaterial(setInputs, index, "name", event.target.value)
              }
            >
              <option value="">请选择原料</option>
              {materials.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0.001"
              step="0.001"
              value={item.amount}
              onChange={(event) =>
                updateMaterial(setInputs, index, "amount", event.target.value)
              }
              placeholder="数量"
            />
            <button
              type="button"
              className="danger"
              onClick={() => removeMaterial(setInputs, index)}
              disabled={inputs.length === 1}
            >
              删除
            </button>
          </div>
        ))}
        <button type="button" onClick={() => addMaterial(setInputs)}>
          + 添加输入原料
        </button>

        <h3>输出产物（每周期）</h3>
        {outputs.map((item, index) => (
          <div className="material-row" key={`out-${index}`}>
            <select
              value={item.name}
              onChange={(event) =>
                updateMaterial(setOutputs, index, "name", event.target.value)
              }
            >
              <option value="">请选择产物</option>
              {craftableMaterials.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0.001"
              step="0.001"
              value={item.amount}
              onChange={(event) =>
                updateMaterial(setOutputs, index, "amount", event.target.value)
              }
              placeholder="数量"
            />
            <button
              type="button"
              className="danger"
              onClick={() => removeMaterial(setOutputs, index)}
              disabled={outputs.length === 1}
            >
              删除
            </button>
          </div>
        ))}
        <button type="button" onClick={() => addMaterial(setOutputs)}>
          + 添加输出产物
        </button>
        {craftableMaterials.length === 0 ? (
          <p className="hint">
            暂无可制造材料，请先在“材料管理”中将材料标记为“可制造”。
          </p>
        ) : null}

        <div className="actions">
          <button type="submit" disabled={submitting}>
            {submitting
              ? "保存中..."
              : editingRecipeId !== null
                ? "更新配方"
                : "保存配方"}
          </button>
          <button type="button" onClick={loadRecipesData} disabled={loading}>
            {loading ? "刷新中..." : "刷新配方列表"}
          </button>
          {editingRecipeId !== null ? (
            <button type="button" onClick={resetRecipeForm}>
              取消编辑
            </button>
          ) : null}
        </div>
      </form>

      <h3>已保存配方</h3>
      <div className="actions">
        <select
          value={productFilter}
          onChange={(event) => setProductFilter(event.target.value)}
        >
          <option value="">按产物筛选（全部）</option>
          {productOptions.map((product) => (
            <option key={product} value={product}>
              {product}
            </option>
          ))}
        </select>
        <select
          value={effectFilter}
          onChange={(event) => setEffectFilter(event.target.value)}
        >
          <option value="">按效果筛选（全部）</option>
          <option value="none">无效果</option>
          <option value="speed">可加速</option>
          <option value="boost">可增产</option>
        </select>
        <select
          value={deviceModelFilter}
          onChange={(event) => setDeviceModelFilter(event.target.value)}
        >
          <option value="">按设备型号筛选（全部）</option>
          {deviceModelOptions.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
        {productFilter || effectFilter || deviceModelFilter ? (
          <button type="button" onClick={clearFilters}>
            清除筛选
          </button>
        ) : null}
      </div>

      <ul className="recipe-list">
        {visibleRecipes.map((item) => (
          <li key={item.id}>
            <strong>{item.name}</strong> / 设备种类 {item.machineName}
            <div className="sub-line">
              每分钟产量：{getOutputPerMinuteText(item)}
            </div>
            <div className="sub-line">
              每分钟消耗：{getInputPerMinuteText(item)}
            </div>
            <div className="sub-line">
              功耗：{Number(item.powerKW || 0).toFixed(2)} kW
            </div>
            <div className="sub-line">
              效果：
              {item.effectMode === "speed"
                ? "可加速"
                : item.effectMode === "boost"
                  ? "可增产"
                  : "无"}
              {item.effectMode === "none" ? null : (
                <>
                  {" / "}增产剂：
                  <select
                    value={item.boosterTier || "mk3"}
                    onChange={(event) =>
                      changeRecipeBoosterTier(item, event.target.value)
                    }
                  >
                    <option value="mk1">mk1</option>
                    <option value="mk2">mk2</option>
                    <option value="mk3">mk3</option>
                  </select>
                </>
              )}
            </div>
            <div className="sub-line">
              设备型号：{item.deviceModel || "未指定"}
            </div>
            <div className="actions">
              <button type="button" onClick={() => startEditRecipe(item)}>
                编辑
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => removeRecipeAndResetIfNeeded(item.id)}
              >
                删除
              </button>
            </div>
          </li>
        ))}
      </ul>

      {!loading && recipes.length === 0 && <p>还没有配方，先新增一条吧。</p>}
      {!loading && recipes.length > 0 && visibleRecipes.length === 0 && (
        <p>没有符合筛选条件的配方。</p>
      )}
      {deviceTypes.length === 0 && (
        <p className="hint">还没有设备种类，请先到“设备种类管理”新增。</p>
      )}
      {materials.length === 0 && (
        <p className="hint">还没有材料，请先到“材料管理”新增材料。</p>
      )}
      {message && <p>{message}</p>}
    </div>
  );
}

export default RecipePage;

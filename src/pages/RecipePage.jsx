import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Form, Select, Space, Table } from "antd";
import { createRecipes, updateRecipeBooster, updateRecipeGroup } from "../api/recipes";
import { useRecipeForm } from "../hooks/useRecipeForm";
import { useRecipesData } from "../hooks/useRecipesData";
import RecipeFormModal from "./RecipeFormModal";
import { createRecipeColumns } from "./recipeTableConfig";

function normalizeMaterialsFromForm(items) {
  return (items || [])
    .map((item) => ({
      name: String(item?.name || "").trim(),
      amount: Number(item?.amount),
    }))
    .filter((item) => item.name && item.amount > 0);
}

function RecipePage({ apiBaseUrl }) {
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [batchBoosterTier, setBatchBoosterTier] = useState(undefined);
  const [batchApplying, setBatchApplying] = useState(false);
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
    removeRecipe,
  } = useRecipesData(apiBaseUrl);

  const {
    name,
    machineName,
    cycleSeconds,
    inputs,
    outputs,
    canSpeedup,
    canBoost,
    editingRecipeId,
    submitting,
    setSubmitting,
    resetRecipeForm,
    startEditRecipe,
  } = useRecipeForm(devices);

  const rarityByName = useMemo(
    () =>
      new Map(
        materials.map((item) => [String(item.name || "").trim(), item.rarity || "一般"]),
      ),
    [materials],
  );

  useEffect(() => {
    if (!modalOpen) return;
    form.setFieldsValue({
      name,
      machineName,
      cycleSeconds: cycleSeconds ? Number(cycleSeconds) : undefined,
      canSpeedup,
      canBoost,
      inputs: inputs.map((item) => ({
        name: item.name || undefined,
        amount: item.amount === "" ? undefined : Number(item.amount),
      })),
      outputs: outputs.map((item) => ({
        name: item.name || undefined,
        amount: item.amount === "" ? undefined : Number(item.amount),
      })),
    });
  }, [modalOpen, form, name, machineName, cycleSeconds, canSpeedup, canBoost, inputs, outputs]);

  async function submitRecipe(values) {
    const payload = {
      name: String(values?.name || "").trim(),
      machineName: String(values?.machineName || "").trim(),
      cycleSeconds: Number(values?.cycleSeconds),
      powerKW: 0,
      canSpeedup: Boolean(values?.canSpeedup),
      canBoost: Boolean(values?.canBoost),
      inputs: normalizeMaterialsFromForm(values?.inputs),
      outputs: normalizeMaterialsFromForm(values?.outputs),
    };

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
      setModalOpen(false);
    } catch (error) {
      setMessage(`保存配方失败: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  function openCreateModal() {
    resetRecipeForm();
    form.setFieldsValue({
      name: "",
      machineName: undefined,
      cycleSeconds: undefined,
      canSpeedup: true,
      canBoost: true,
      inputs: [{ name: undefined, amount: undefined }],
      outputs: [{ name: undefined, amount: undefined }],
    });
    setModalOpen(true);
  }

  function openEditModal(item) {
    startEditRecipe(item);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    resetRecipeForm();
    form.resetFields();
  }

  async function removeRecipeAndResetIfNeeded(id) {
    const ok = await removeRecipe(id);
    if (ok && editingRecipeId === id) {
      resetRecipeForm();
      setModalOpen(false);
    }
  }

  async function applyBoosterTierToTable(boosterTier) {
    setBatchBoosterTier(boosterTier);
    const targets = visibleRecipes.filter(
      (item) =>
        item.effectMode !== "none" && (item.boosterTier || "mk3") !== boosterTier,
    );
    if (targets.length === 0) {
      setMessage("当前表格没有需要变更增产剂的配方");
      return;
    }

    try {
      setBatchApplying(true);
      const results = await Promise.allSettled(
        targets.map((item) => updateRecipeBooster(apiBaseUrl, item.id, boosterTier)),
      );
      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failCount = results.length - successCount;
      await loadRecipesData();
      if (failCount === 0) {
        setMessage(`已统一更新 ${successCount} 条配方为 ${boosterTier.toUpperCase()}`);
      } else {
        setMessage(
          `已更新 ${successCount} 条，失败 ${failCount} 条（已刷新列表）`,
        );
      }
    } catch (error) {
      setMessage(`批量更新增产剂失败: ${error.message}`);
    } finally {
      setBatchApplying(false);
    }
  }

  const columns = createRecipeColumns({
    onOpenEdit: openEditModal,
    onDelete: removeRecipeAndResetIfNeeded,
    rarityByName,
  });

  return (
    <Card title="配方管理（Antd）">
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Space wrap>
          <Button
            type="primary"
            onClick={openCreateModal}
            disabled={deviceTypes.length === 0 || materials.length === 0}
          >
            新增配方
          </Button>
          <Button onClick={loadRecipesData} loading={loading}>
            刷新配方列表
          </Button>
          <Select
            placeholder="统一增产剂（表格内）"
            style={{ width: 220 }}
            value={batchBoosterTier}
            loading={batchApplying}
            disabled={batchApplying}
            onChange={applyBoosterTierToTable}
            options={[
              { label: "MK1", value: "mk1" },
              { label: "MK2", value: "mk2" },
              { label: "MK3", value: "mk3" },
            ]}
          />
        </Space>

        <Space wrap>
          <Select
            allowClear
            placeholder="按产物筛选"
            style={{ width: 220 }}
            value={productFilter || undefined}
            onChange={(value) => setProductFilter(value || "")}
            options={productOptions.map((product) => ({
              label: product,
              value: product,
            }))}
          />
          <Select
            allowClear
            placeholder="按效果筛选"
            style={{ width: 180 }}
            value={effectFilter || undefined}
            onChange={(value) => setEffectFilter(value || "")}
            options={[
              { label: "无效果", value: "none" },
              { label: "可加速", value: "speed" },
              { label: "可增产", value: "boost" },
            ]}
          />
          <Select
            allowClear
            placeholder="按设备型号筛选"
            style={{ width: 220 }}
            value={deviceModelFilter || undefined}
            onChange={(value) => setDeviceModelFilter(value || "")}
            options={deviceModelOptions.map((model) => ({
              label: model,
              value: model,
            }))}
          />
          {productFilter || effectFilter || deviceModelFilter ? (
            <Button onClick={clearFilters}>清除筛选</Button>
          ) : null}
        </Space>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={visibleRecipes}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{
            emptyText:
              recipes.length === 0
                ? "还没有配方，先新增一条吧。"
                : "没有符合筛选条件的配方。",
          }}
        />

        {deviceTypes.length === 0 ? (
          <Alert
            type="warning"
            showIcon
            message="还没有设备种类，请先到“设备种类管理”新增。"
          />
        ) : null}
        {materials.length === 0 ? (
          <Alert
            type="warning"
            showIcon
            message="还没有材料，请先到“材料管理”新增材料。"
          />
        ) : null}
        {message ? <Alert type="info" showIcon message={message} /> : null}
      </Space>

      <RecipeFormModal
        open={modalOpen}
        editingRecipeId={editingRecipeId}
        submitting={submitting}
        form={form}
        onSubmit={submitRecipe}
        onCancel={closeModal}
        deviceTypes={deviceTypes}
        materials={materials}
        craftableMaterials={craftableMaterials}
      />
    </Card>
  );
}

export default RecipePage;

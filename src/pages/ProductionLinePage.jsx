import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message as antdMessage,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { listMaterials } from "../api/materials";
import {
  createProductionLine,
  deleteProductionLineByID,
  listProductionLines,
  updateProductionLineByID,
} from "../api/productionLines";
import { listRecipes } from "../api/recipes";
import { MATERIAL_RARITY_COLOR, normalizeMaterialRarity } from "../utils/materialRarity";

function effectText(item) {
  if (item.effectMode === "speed") return "加速";
  if (item.effectMode === "boost") return "增产";
  return "无";
}

function formatNumber(value) {
  return Number(value || 0).toFixed(2);
}

function calcTotals(lines, recipeById) {
  const netMap = new Map();
  const grossOutMap = new Map();
  const grossInMap = new Map();
  let totalPowerKW = 0;

  for (const line of lines) {
    const recipe = recipeById.get(Number(line.recipeId));
    if (!recipe) continue;

    const cycle = Number(recipe.cycleSeconds || 0);
    const machineCount = Number(line.machineCount || 0);
    if (cycle <= 0 || machineCount <= 0) continue;

    totalPowerKW += Number(recipe.powerKW || 0) * machineCount;
    const scale = (machineCount * 60) / cycle;

    for (const output of recipe.outputs || []) {
      const amount = Number(output.amount || 0) * scale;
      if (amount <= 0) continue;
      grossOutMap.set(output.name, (grossOutMap.get(output.name) || 0) + amount);
      netMap.set(output.name, (netMap.get(output.name) || 0) + amount);
    }
    for (const input of recipe.inputs || []) {
      const amount = Number(input.amount || 0) * scale;
      if (amount <= 0) continue;
      grossInMap.set(input.name, (grossInMap.get(input.name) || 0) + amount);
      netMap.set(input.name, (netMap.get(input.name) || 0) - amount);
    }
  }

  const productions = [];
  const consumptions = [];
  const internalFlows = [];

  for (const [name, net] of netMap.entries()) {
    if (net > 1e-9) productions.push({ name, amount: net });
    if (net < -1e-9) consumptions.push({ name, amount: Math.abs(net) });
  }
  for (const [name, outAmount] of grossOutMap.entries()) {
    const inAmount = grossInMap.get(name) || 0;
    const flow = Math.min(outAmount, inAmount);
    if (flow > 1e-9) internalFlows.push({ name, amount: flow });
  }

  productions.sort((a, b) => b.amount - a.amount);
  consumptions.sort((a, b) => b.amount - a.amount);
  internalFlows.sort((a, b) => b.amount - a.amount);

  return { productions, consumptions, internalFlows, totalPowerKW };
}

function ProductionLinePage({ apiBaseUrl }) {
  const [form] = Form.useForm();
  const [recipes, setRecipes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [linePlans, setLinePlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingPlanId, setViewingPlanId] = useState(null);

  async function loadData() {
    setLoading(true);
    const [recipeResult, materialResult, linePlanResult] = await Promise.allSettled([
      listRecipes(apiBaseUrl),
      listMaterials(apiBaseUrl),
      listProductionLines(apiBaseUrl),
    ]);

    const recipeData = recipeResult.status === "fulfilled" ? recipeResult.value || [] : [];
    const materialData = materialResult.status === "fulfilled" ? materialResult.value || [] : [];
    const linePlanData = linePlanResult.status === "fulfilled" ? linePlanResult.value || [] : [];

    setRecipes(recipeData);
    setMaterials(materialData);
    setLinePlans(linePlanData);

    if (!viewingPlanId && linePlanData.length > 0) {
      setViewingPlanId(linePlanData[0].id);
    } else if (viewingPlanId && !linePlanData.some((item) => item.id === viewingPlanId)) {
      setViewingPlanId(linePlanData.length > 0 ? linePlanData[0].id : null);
    }

    const errors = [];
    if (recipeResult.status === "rejected") {
      errors.push(`配方加载失败: ${recipeResult.reason?.message || "未知错误"}`);
    }
    if (materialResult.status === "rejected") {
      errors.push(`材料加载失败: ${materialResult.reason?.message || "未知错误"}`);
    }
    if (linePlanResult.status === "rejected") {
      errors.push(`产线方案加载失败: ${linePlanResult.reason?.message || "未知错误"}`);
    }
    setMessage(errors.join("；"));
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [apiBaseUrl]);

  const recipeById = useMemo(
    () => new Map(recipes.map((item) => [item.id, item])),
    [recipes],
  );

  const rarityByName = useMemo(
    () => new Map(materials.map((item) => [item.name, item.rarity || "一般"])),
    [materials],
  );

  const recipeOptions = useMemo(
    () =>
      recipes.map((item) => ({
        label: `${item.name} / ${item.deviceModel || "未指定"} / ${effectText(item)} / ${
          (item.boosterTier || "mk3").toUpperCase()
        }`,
        value: item.id,
      })),
    [recipes],
  );

  const viewingPlan = useMemo(
    () => linePlans.find((item) => item.id === viewingPlanId) || null,
    [linePlans, viewingPlanId],
  );

  const viewingRows = useMemo(() => {
    if (!viewingPlan) return [];
    return (viewingPlan.items || []).map((item) => ({
      recipeId: Number(item.recipeId),
      machineCount: Number(item.machineCount || 0),
      recipe: recipeById.get(Number(item.recipeId)),
    }));
  }, [viewingPlan, recipeById]);

  const totals = useMemo(() => {
    if (!viewingPlan) {
      return { productions: [], consumptions: [], internalFlows: [], totalPowerKW: 0 };
    }
    return calcTotals(viewingPlan.items || [], recipeById);
  }, [viewingPlan, recipeById]);

  function resetForm() {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({
      name: "",
      items: [{ recipeId: undefined, machineCount: 1 }],
    });
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  function startCreate() {
    setEditingId(null);
    setModalOpen(true);
  }

  function startEdit(plan) {
    setEditingId(plan.id);
    setModalOpen(true);
  }

  useEffect(() => {
    if (!modalOpen) return;

    if (editingId === null) {
      form.setFieldsValue({
        name: "",
        items: [{ recipeId: undefined, machineCount: 1 }],
      });
      return;
    }

    const plan = linePlans.find((item) => item.id === editingId);
    if (!plan) {
      form.setFieldsValue({
        name: "",
        items: [{ recipeId: undefined, machineCount: 1 }],
      });
      return;
    }

    form.setFieldsValue({
      name: plan.name,
      items:
        plan.items?.length > 0
          ? plan.items.map((item) => ({
              recipeId: Number(item.recipeId),
              machineCount: Number(item.machineCount || 1),
            }))
          : [{ recipeId: undefined, machineCount: 1 }],
    });
  }, [modalOpen, editingId, linePlans, form]);

  async function submitPlan(values) {
    const payload = {
      name: String(values.name || "").trim(),
      items: (values.items || [])
        .map((item) => ({
          recipeId: Number(item.recipeId),
          machineCount: Number(item.machineCount),
        }))
        .filter((item) => item.recipeId > 0 && item.machineCount > 0),
    };

    if (!payload.name) {
      setMessage("请填写产线方案名称");
      antdMessage.warning("请填写产线方案名称");
      return;
    }
    if (payload.items.length === 0) {
      setMessage("请至少添加一条配方");
      antdMessage.warning("请至少添加一条配方");
      return;
    }

    try {
      setSubmitting(true);
      if (editingId === null) {
        const created = await createProductionLine(apiBaseUrl, payload);
        setViewingPlanId(created.id);
        setMessage("产线方案新增成功");
        antdMessage.success("产线方案新增成功");
      } else {
        await updateProductionLineByID(apiBaseUrl, editingId, payload);
        setViewingPlanId(editingId);
        setMessage("产线方案更新成功");
        antdMessage.success("产线方案更新成功");
      }
      closeModal();
      await loadData();
    } catch (error) {
      setMessage(`保存产线方案失败: ${error.message}`);
      antdMessage.error(`保存失败：${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function removePlan(planID) {
    try {
      setSubmitting(true);
      await deleteProductionLineByID(apiBaseUrl, planID);
      if (viewingPlanId === planID) {
        setViewingPlanId(null);
      }
      await loadData();
      setMessage("产线方案删除成功");
    } catch (error) {
      setMessage(`删除产线方案失败: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  const planColumns = [
    {
      title: "方案名称",
      dataIndex: "name",
      key: "name",
      render: (value, item) => (
        <Space size={8}>
          <Typography.Text strong={item.id === viewingPlanId}>{value}</Typography.Text>
          {item.id === viewingPlanId ? <Tag color="blue">当前方案</Tag> : null}
        </Space>
      ),
    },
    {
      title: "配方条目数",
      key: "itemCount",
      render: (_, item) => (item.items || []).length,
    },
    {
      title: "操作",
      key: "actions",
      render: (_, item) => (
        <Space>
          <Button
            type="link"
            onClick={(event) => {
              event.stopPropagation();
              startEdit(item);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除该产线方案吗？"
            okText="删除"
            cancelText="取消"
            onConfirm={() => removePlan(item.id)}
          >
            <Button
              type="link"
              danger
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const detailColumns = [
    {
      title: "配方",
      key: "recipe",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{row.recipe?.name || "配方已失效"}</Typography.Text>
          <Typography.Text type="secondary">
            {row.recipe ? `${row.recipe.deviceModel || "未指定"} / ${effectText(row.recipe)}` : "-"}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "设备数量",
      dataIndex: "machineCount",
      key: "machineCount",
    },
  ];

  function renderMaterialAmount(item) {
    const rarity = normalizeMaterialRarity(rarityByName.get(item.name));
    return (
      <span style={{ color: MATERIAL_RARITY_COLOR[rarity] }}>
        {item.name} {formatNumber(item.amount)}
      </span>
    );
  }

  return (
    <Card title="产线管理">
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Space>
          <Button type="primary" onClick={startCreate}>
            新增产线方案
          </Button>
          <Button onClick={loadData} loading={loading}>
            刷新数据
          </Button>
        </Space>

        <Table
          rowKey="id"
          columns={planColumns}
          dataSource={linePlans}
          loading={loading}
          onRow={(record) => ({
            onClick: () => setViewingPlanId(record.id),
            style: {
              cursor: "pointer",
              backgroundColor: record.id === viewingPlanId ? "#e6f4ff" : undefined,
            },
          })}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{ emptyText: "还没有产线方案，先新增一条吧。" }}
        />

        <Card
          size="small"
          title={
            <Space size={8}>
              <Typography.Text strong>当前查看方案：{viewingPlan?.name || "未选择"}</Typography.Text>
              {viewingPlan ? <Tag color="blue">当前方案</Tag> : null}
            </Space>
          }
        >
          <Table
            rowKey={(row) => `${row.recipeId}-${row.machineCount}`}
            columns={detailColumns}
            dataSource={viewingRows}
            pagination={false}
            locale={{ emptyText: "请选择产线方案查看明细" }}
          />
        </Card>

        <Card size="small" title="每分钟总产量（净）">
          <Space wrap>
            {totals.productions.length === 0 ? (
              <Typography.Text type="secondary">无</Typography.Text>
            ) : (
              totals.productions.map((item) => (
                <Tag key={`p-${item.name}`} color="success">
                  {renderMaterialAmount(item)}
                </Tag>
              ))
            )}
          </Space>
        </Card>

        <Card size="small" title="每分钟总消耗（净）">
          <Space wrap>
            {totals.consumptions.length === 0 ? (
              <Typography.Text type="secondary">无</Typography.Text>
            ) : (
              totals.consumptions.map((item) => (
                <Tag key={`c-${item.name}`} color="error">
                  {renderMaterialAmount(item)}
                </Tag>
              ))
            )}
          </Space>
        </Card>

        <Card size="small" title="内部流转（自动抵消部分）">
          <Space wrap>
            {totals.internalFlows.length === 0 ? (
              <Typography.Text type="secondary">无</Typography.Text>
            ) : (
              totals.internalFlows.map((item) => (
                <Tag key={`f-${item.name}`}>{renderMaterialAmount(item)}</Tag>
              ))
            )}
          </Space>
        </Card>

        <Card size="small" title="总耗电功率">
          <Typography.Text strong>{formatNumber(totals.totalPowerKW)} kW</Typography.Text>
        </Card>

        {message ? <Alert type="info" showIcon message={message} /> : null}
      </Space>

      <Modal
        title={editingId !== null ? "编辑产线方案" : "新增产线方案"}
        open={modalOpen}
        onOk={() => form.submit()}
        onCancel={closeModal}
        okText={editingId !== null ? "保存修改" : "保存"}
        cancelText="取消"
        confirmLoading={submitting}
        width={920}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ name: "", items: [{ recipeId: undefined, machineCount: 1 }] }}
          onFinish={submitPlan}
        >
          <Form.Item
            label="方案名称"
            name="name"
            rules={[{ required: true, message: "请填写方案名称" }]}
          >
            <Input placeholder="例如：基础铁板产线" />
          </Form.Item>

          <Typography.Text strong>配方条目</Typography.Text>
          {recipeOptions.length === 0 ? (
            <Alert
              style={{ marginTop: 8, marginBottom: 8 }}
              type="warning"
              showIcon
              message="暂无可选配方，请先到“配方管理”创建配方，或检查后端接口是否正常。"
            />
          ) : null}
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: "100%" }}>
                {fields.map((field) => (
                  <Space key={field.key} wrap style={{ width: "100%" }}>
                    <Form.Item
                      style={{ marginBottom: 0 }}
                      name={[field.name, "recipeId"]}
                      rules={[{ required: true, message: "请选择配方" }]}
                    >
                      <Select
                        style={{ width: 520 }}
                        placeholder="选择已有配方"
                        options={recipeOptions}
                        showSearch
                        optionFilterProp="label"
                        notFoundContent="暂无可选配方"
                      />
                    </Form.Item>
                    <Form.Item
                      style={{ marginBottom: 0 }}
                      name={[field.name, "machineCount"]}
                      rules={[{ required: true, message: "请输入设备数量" }]}
                    >
                      <InputNumber min={1} step={1} precision={0} placeholder="设备数量" />
                    </Form.Item>
                    <Button danger onClick={() => remove(field.name)} disabled={fields.length === 1}>
                      删除
                    </Button>
                  </Space>
                ))}
                <Button onClick={() => add({ recipeId: undefined, machineCount: 1 })}>
                  + 添加配方条目
                </Button>
              </Space>
            )}
          </Form.List>
        </Form>
      </Modal>
    </Card>
  );
}

export default ProductionLinePage;

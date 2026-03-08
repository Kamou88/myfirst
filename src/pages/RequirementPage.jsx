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
import { listDevices } from "../api/devices";
import { listMaterials } from "../api/materials";
import {
  createRequirementPlan,
  deleteRequirementPlanByID,
  listRequirementPlans,
  updateRequirementPlanByID,
} from "../api/requirementPlans";
import { calculateRequirements } from "../api/requirements";
import { listRecipes } from "../api/recipes";
import { MATERIAL_RARITY_COLOR, normalizeMaterialRarity } from "../utils/materialRarity";

function effectText(item) {
  if (item.effectMode === "speed") return "加速";
  if (item.effectMode === "boost") return "增产";
  return "无";
}

function fmt(value) {
  return Number(value || 0).toFixed(2);
}

function fmtMachineCount(value) {
  const number = Number(value || 0);
  if (Math.abs(number - Math.round(number)) < 1e-6) {
    return String(Math.round(number));
  }
  return number.toFixed(2);
}

function RequirementPage({ apiBaseUrl }) {
  const [form] = Form.useForm();
  const [planForm] = Form.useForm();
  const [recipes, setRecipes] = useState([]);
  const [devices, setDevices] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [requirementPlans, setRequirementPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [submittingPlan, setSubmittingPlan] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [viewingPlanId, setViewingPlanId] = useState(null);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState({
    minPower: {
      recipeRows: [],
      externalInputs: [],
      unresolvedCraftables: [],
      totalPowerKW: 0,
      totalExternalInputs: 0,
      warnings: [],
    },
    minRaw: {
      recipeRows: [],
      externalInputs: [],
      unresolvedCraftables: [],
      totalPowerKW: 0,
      totalExternalInputs: 0,
      warnings: [],
    },
  });

  async function loadData() {
    setLoading(true);
    const [recipeResult, materialResult, deviceResult, planResult] = await Promise.allSettled([
      listRecipes(apiBaseUrl),
      listMaterials(apiBaseUrl),
      listDevices(apiBaseUrl),
      listRequirementPlans(apiBaseUrl),
    ]);

    const recipeData = recipeResult.status === "fulfilled" ? recipeResult.value || [] : [];
    const materialData = materialResult.status === "fulfilled" ? materialResult.value || [] : [];
    const deviceData = deviceResult.status === "fulfilled" ? deviceResult.value || [] : [];
    const planData = planResult.status === "fulfilled" ? planResult.value || [] : [];
    setRecipes(recipeData);
    setMaterials(materialData);
    setDevices(deviceData);
    setRequirementPlans(planData);
    if (!viewingPlanId && planData.length > 0) {
      setViewingPlanId(planData[0].id);
    } else if (viewingPlanId && !planData.some((item) => item.id === viewingPlanId)) {
      setViewingPlanId(planData.length > 0 ? planData[0].id : null);
    }

    const errors = [];
    if (recipeResult.status === "rejected") {
      errors.push(`配方加载失败: ${recipeResult.reason?.message || "未知错误"}`);
    }
    if (materialResult.status === "rejected") {
      errors.push(`材料加载失败: ${materialResult.reason?.message || "未知错误"}`);
    }
    if (deviceResult.status === "rejected") {
      errors.push(`设备加载失败: ${deviceResult.reason?.message || "未知错误"}`);
    }
    if (planResult.status === "rejected") {
      errors.push(`需求方案加载失败: ${planResult.reason?.message || "未知错误"}`);
    }
    setMessage(errors.join("；"));
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    form.setFieldsValue({
      targets: [{ name: undefined, amount: 60 }],
    });
  }, [apiBaseUrl]);

  const viewingPlan = useMemo(
    () => requirementPlans.find((item) => item.id === viewingPlanId) || null,
    [requirementPlans, viewingPlanId],
  );

  const rarityByName = useMemo(
    () => new Map(materials.map((item) => [item.name, item.rarity || "一般"])),
    [materials],
  );

  const researchedRecipes = useMemo(
    () => recipes.filter((item) => Boolean(item.isResearched) && Boolean(item.deviceUnlocked)),
    [recipes],
  );

  const materialOptions = useMemo(
    () =>
      Array.from(
        new Set(
          researchedRecipes
            .flatMap((recipe) => recipe.outputs || [])
            .map((output) => String(output?.name || "").trim())
            .filter((name) => name.length > 0),
        ),
      )
        .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))
        .map((name) => ({
          label: name,
          value: name,
        })),
    [researchedRecipes],
  );

  const recipeDeviceModelById = useMemo(
    () => new Map(recipes.map((item) => [Number(item.id), item])),
    [recipes],
  );
  const deviceNameById = useMemo(
    () => new Map(devices.map((item) => [Number(item.id), item.name || "未指定"])),
    [devices],
  );

  const recipeColumns = [
    {
      title: "配方",
      key: "recipeName",
      render: (_, item) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{item.recipeName}</Typography.Text>
          <Typography.Text type="secondary">
            {(() => {
              const recipeInfo = recipeDeviceModelById.get(Number(item.recipeID));
              const fromDeviceID = recipeInfo?.deviceId
                ? deviceNameById.get(Number(recipeInfo.deviceId))
                : "";
              return fromDeviceID || recipeInfo?.deviceModel || item.deviceModel || "未指定";
            })()}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "效果",
      dataIndex: "effectMode",
      key: "effectMode",
      render: (value) => <Tag>{effectText({ effectMode: value })}</Tag>,
    },
    {
      title: "所需设备数",
      dataIndex: "machineCount",
      key: "machineCount",
      render: (value) => fmtMachineCount(value),
    },
    {
      title: "功耗(kW)",
      dataIndex: "powerKW",
      key: "powerKW",
      render: (value) => fmt(value),
    },
  ];

  function renderMaterial(item) {
    const rarity = normalizeMaterialRarity(rarityByName.get(item.name));
    return (
      <span style={{ color: MATERIAL_RARITY_COLOR[rarity] }}>
        {item.name} {fmt(item.amount)}
      </span>
    );
  }

  async function submitTargets(values) {
    try {
      setCalculating(true);
      const response = await calculateRequirements(apiBaseUrl, {
        targets: values.targets || [],
      });
      setResult(response);
      setMessage("");
    } catch (error) {
      setResult({
        minPower: {
          recipeRows: [],
          externalInputs: [],
          unresolvedCraftables: [],
          totalPowerKW: 0,
          totalExternalInputs: 0,
          warnings: [],
        },
        minRaw: {
          recipeRows: [],
          externalInputs: [],
          unresolvedCraftables: [],
          totalPowerKW: 0,
          totalExternalInputs: 0,
          warnings: [],
        },
      });
      setMessage(`后端计算失败：${error.message}`);
    } finally {
      setCalculating(false);
    }
  }

  function applyPlanToTargets(plan) {
    if (!plan) return;
    const targets =
      (plan.targets || []).length > 0
        ? plan.targets.map((item) => ({
            name: item.name,
            amount: Number(item.amount || 0),
          }))
        : [{ name: undefined, amount: 60 }];
    form.setFieldsValue({ targets });
  }

  function startCreatePlan() {
    setEditingPlanId(null);
    setPlanModalOpen(true);
  }

  function startEditPlan(plan) {
    setEditingPlanId(plan.id);
    setPlanModalOpen(true);
  }

  function closePlanModal() {
    setPlanModalOpen(false);
    setEditingPlanId(null);
    planForm.resetFields();
  }

  useEffect(() => {
    if (!planModalOpen) return;
    if (editingPlanId === null) {
      const currentTargets = form.getFieldValue("targets");
      planForm.setFieldsValue({
        name: "",
        targets:
          currentTargets?.length > 0 ? currentTargets : [{ name: undefined, amount: 60 }],
      });
      return;
    }
    const plan = requirementPlans.find((item) => item.id === editingPlanId);
    if (!plan) {
      planForm.setFieldsValue({
        name: "",
        targets: [{ name: undefined, amount: 60 }],
      });
      return;
    }
    planForm.setFieldsValue({
      name: plan.name,
      targets:
        plan.targets?.length > 0
          ? plan.targets.map((item) => ({
              name: item.name,
              amount: Number(item.amount || 0),
            }))
          : [{ name: undefined, amount: 60 }],
    });
  }, [planModalOpen, editingPlanId, requirementPlans, planForm, form]);

  async function submitRequirementPlan(values) {
    const payload = {
      name: String(values.name || "").trim(),
      targets: (values.targets || [])
        .map((item) => ({
          name: String(item?.name || "").trim(),
          amount: Number(item?.amount || 0),
        }))
        .filter((item) => item.name && item.amount > 0),
    };
    if (!payload.name) {
      antdMessage.warning("请填写需求方案名称");
      return;
    }
    if (payload.targets.length === 0) {
      antdMessage.warning("请至少添加一条目标材料");
      return;
    }
    try {
      setSubmittingPlan(true);
      if (editingPlanId === null) {
        const created = await createRequirementPlan(apiBaseUrl, payload);
        setViewingPlanId(created.id);
        antdMessage.success("需求方案新增成功");
      } else {
        await updateRequirementPlanByID(apiBaseUrl, editingPlanId, payload);
        setViewingPlanId(editingPlanId);
        antdMessage.success("需求方案更新成功");
      }
      closePlanModal();
      await loadData();
    } catch (error) {
      antdMessage.error(`保存失败：${error.message}`);
      setMessage(`保存需求方案失败：${error.message}`);
    } finally {
      setSubmittingPlan(false);
    }
  }

  async function removeRequirementPlan(planID) {
    try {
      setSubmittingPlan(true);
      await deleteRequirementPlanByID(apiBaseUrl, planID);
      if (viewingPlanId === planID) {
        setViewingPlanId(null);
      }
      await loadData();
      setMessage("需求方案删除成功");
      antdMessage.success("需求方案删除成功");
    } catch (error) {
      setMessage(`删除需求方案失败：${error.message}`);
      antdMessage.error(`删除失败：${error.message}`);
    } finally {
      setSubmittingPlan(false);
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
      title: "目标条目数",
      key: "targetCount",
      render: (_, item) => (item.targets || []).length,
    },
    {
      title: "操作",
      key: "actions",
      render: (_, item) => (
        <Space wrap>
          <Button
            type="link"
            onClick={(event) => {
              event.stopPropagation();
              startEditPlan(item);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除该需求方案吗？"
            okText="删除"
            cancelText="取消"
            onConfirm={() => removeRequirementPlan(item.id)}
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

  function renderPlanBlock(title, subtitle, plan, keyPrefix) {
    return (
      <Card size="small" title={title}>
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Typography.Text type="secondary">{subtitle}</Typography.Text>

          <Table
            rowKey="recipeID"
            columns={recipeColumns}
            dataSource={plan.recipeRows}
            scroll={{ x: "max-content" }}
            pagination={{ pageSize: 8, showSizeChanger: false }}
            locale={{ emptyText: "请先填写目标并点击计算" }}
          />

          <Card size="small" title="每分钟实际总产量（毛）">
            <Space wrap>
              {(plan.actualOutputs || []).length === 0 ? (
                <Typography.Text type="secondary">无</Typography.Text>
              ) : (
                (plan.actualOutputs || []).map((item) => (
                  <Tag key={`${keyPrefix}-ao-${item.name}`} color="success">
                    {renderMaterial(item)}
                  </Tag>
                ))
              )}
            </Space>
          </Card>

          <Card size="small" title="每分钟实际总消耗（毛）">
            <Space wrap>
              {(plan.actualInputs || []).length === 0 ? (
                <Typography.Text type="secondary">无</Typography.Text>
              ) : (
                (plan.actualInputs || []).map((item) => (
                  <Tag key={`${keyPrefix}-ai-${item.name}`} color="error">
                    {renderMaterial(item)}
                  </Tag>
                ))
              )}
            </Space>
          </Card>

          <Card size="small" title="外部原料需求（无法由当前配方继续生产）">
            <Space wrap>
              {plan.externalInputs.length === 0 ? (
                <Typography.Text type="secondary">无</Typography.Text>
              ) : (
                plan.externalInputs.map((item) => (
                  <Tag key={`${keyPrefix}-e-${item.name}`} color="gold">
                    {renderMaterial(item)}
                  </Tag>
                ))
              )}
            </Space>
          </Card>

          <Space wrap>
            <Card size="small" title="总耗电功率" style={{ minWidth: 220 }}>
              <Typography.Text strong>{fmt(plan.totalPowerKW)} kW</Typography.Text>
            </Card>
            <Card size="small" title="外部原料总量(每分钟)" style={{ minWidth: 220 }}>
              <Typography.Text strong>{fmt(plan.totalExternalInputs)}</Typography.Text>
            </Card>
          </Space>

          {plan.unresolvedCraftables.length > 0 ? (
            <Alert
              type="warning"
              showIcon
              message={`未完全求解材料：${plan.unresolvedCraftables
                .map((item) => `${item.name} ${fmt(item.amount)}`)
                .join("，")}`}
            />
          ) : null}

          {(plan.warnings || []).map((text, index) => (
            <Alert key={`${keyPrefix}-${text}-${index}`} type="warning" showIcon message={text} />
          ))}
        </Space>
      </Card>
    );
  }

  return (
    <Card title="需求管理">
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Space wrap>
          <Button type="primary" onClick={startCreatePlan}>
            新增需求方案
          </Button>
          <Button onClick={loadData} loading={loading}>
            刷新数据
          </Button>
          <Button
            onClick={() => {
              applyPlanToTargets(viewingPlan);
              antdMessage.info("已将当前方案填充到目标表单");
            }}
            disabled={!viewingPlan}
          >
            使用当前方案填充目标
          </Button>
        </Space>

        <Table
          rowKey="id"
          columns={planColumns}
          dataSource={requirementPlans}
          loading={loading}
          scroll={{ x: "max-content" }}
          onRow={(record) => ({
            onClick: () => {
              setViewingPlanId(record.id);
              applyPlanToTargets(record);
            },
            style: {
              cursor: "pointer",
              backgroundColor: record.id === viewingPlanId ? "#e6f4ff" : undefined,
            },
          })}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{ emptyText: "还没有需求方案，先新增一条吧。" }}
        />

        <Form
          form={form}
          layout="vertical"
          initialValues={{ targets: [{ name: undefined, amount: 60 }] }}
          onFinish={submitTargets}
        >
          <Typography.Text strong>目标产线规模（每分钟）</Typography.Text>
          <Form.List name="targets">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: "100%" }}>
                {fields.map((field) => (
                  <Space key={field.key} wrap style={{ width: "100%" }}>
                    <Form.Item
                      style={{ marginBottom: 0, minWidth: 220, flex: 1 }}
                      name={[field.name, "name"]}
                      rules={[{ required: true, message: "请选择目标材料" }]}
                    >
                      <Select
                        style={{ width: "100%" }}
                        placeholder="目标材料"
                        options={materialOptions}
                        showSearch
                        optionFilterProp="label"
                        notFoundContent="暂无已研究且设备已解锁配方产物"
                      />
                    </Form.Item>
                    <Form.Item
                      style={{ marginBottom: 0, minWidth: 140 }}
                      name={[field.name, "amount"]}
                      rules={[{ required: true, message: "请输入目标产量" }]}
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0.001}
                        step={1}
                        placeholder="每分钟产量"
                      />
                    </Form.Item>
                    <Button danger onClick={() => remove(field.name)} disabled={fields.length === 1}>
                      删除
                    </Button>
                  </Space>
                ))}
                <Space wrap style={{ width: "100%" }}>
                  <Button onClick={() => add({ name: undefined, amount: 60 })}>+ 添加目标材料</Button>
                  <Button type="primary" htmlType="submit" loading={loading || calculating}>
                    计算所需配方量
                  </Button>
                  <Button onClick={loadData} loading={loading}>
                    刷新数据
                  </Button>
                </Space>
              </Space>
            )}
          </Form.List>
        </Form>

        <Alert
          type="info"
          showIcon
          message="计算只会使用“已研究且设备已解锁”的配方，并优先使用效率更高的设备；在此基础上，最低功耗方案按“单位产出功耗最低”优先选配方，最少原材料方案按“单位产出输入总量最少”优先选配方。"
        />

        {renderPlanBlock(
          "最低功耗方案",
          "优先选择每生产1单位目标材料所需功耗更低的配方路径。",
          result.minPower,
          "power",
        )}

        {renderPlanBlock(
          "最少原材料方案",
          "优先选择每生产1单位目标材料所需输入总量更少的配方路径。",
          result.minRaw,
          "raw",
        )}

        {message ? <Alert type="info" showIcon message={message} /> : null}
      </Space>

      <Modal
        title={editingPlanId !== null ? "编辑需求方案" : "新增需求方案"}
        open={planModalOpen}
        onOk={() => planForm.submit()}
        onCancel={closePlanModal}
        okText={editingPlanId !== null ? "保存修改" : "保存"}
        cancelText="取消"
        confirmLoading={submittingPlan}
        width={880}
        destroyOnClose
      >
        <Form
          form={planForm}
          layout="vertical"
          initialValues={{ name: "", targets: [{ name: undefined, amount: 60 }] }}
          onFinish={submitRequirementPlan}
        >
          <Form.Item
            label="方案名称"
            name="name"
            rules={[{ required: true, message: "请填写需求方案名称" }]}
          >
            <Input placeholder="例如：基础电路需求" />
          </Form.Item>

          <Typography.Text strong>目标条目</Typography.Text>
          <Form.List name="targets">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: "100%" }}>
                {fields.map((field) => (
                  <Space key={field.key} wrap style={{ width: "100%" }}>
                    <Form.Item
                      style={{ marginBottom: 0, minWidth: 220, flex: 1 }}
                      name={[field.name, "name"]}
                      rules={[{ required: true, message: "请选择目标材料" }]}
                    >
                      <Select
                        style={{ width: "100%" }}
                        placeholder="目标材料"
                        options={materialOptions}
                        showSearch
                        optionFilterProp="label"
                        notFoundContent="暂无已研究且设备已解锁配方产物"
                      />
                    </Form.Item>
                    <Form.Item
                      style={{ marginBottom: 0, minWidth: 140 }}
                      name={[field.name, "amount"]}
                      rules={[{ required: true, message: "请输入目标产量" }]}
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0.001}
                        step={1}
                        placeholder="每分钟产量"
                      />
                    </Form.Item>
                    <Button danger onClick={() => remove(field.name)} disabled={fields.length === 1}>
                      删除
                    </Button>
                  </Space>
                ))}
                <Button onClick={() => add({ name: undefined, amount: 60 })}>+ 添加目标材料</Button>
              </Space>
            )}
          </Form.List>
        </Form>
      </Modal>
    </Card>
  );
}

export default RequirementPage;

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { listDevices } from "../api/devices";
import { listMaterials } from "../api/materials";
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
  const [recipes, setRecipes] = useState([]);
  const [devices, setDevices] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
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
    const [recipeResult, materialResult, deviceResult] = await Promise.allSettled([
      listRecipes(apiBaseUrl),
      listMaterials(apiBaseUrl),
      listDevices(apiBaseUrl),
    ]);

    const recipeData = recipeResult.status === "fulfilled" ? recipeResult.value || [] : [];
    const materialData = materialResult.status === "fulfilled" ? materialResult.value || [] : [];
    const deviceData = deviceResult.status === "fulfilled" ? deviceResult.value || [] : [];
    setRecipes(recipeData);
    setMaterials(materialData);
    setDevices(deviceData);

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
    setMessage(errors.join("；"));
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    form.setFieldsValue({
      targets: [{ name: undefined, amount: 60 }],
    });
  }, [apiBaseUrl]);

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
    </Card>
  );
}

export default RequirementPage;

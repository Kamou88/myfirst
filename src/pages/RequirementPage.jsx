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
import { listMaterials } from "../api/materials";
import { listRecipes } from "../api/recipes";
import { MATERIAL_RARITY_COLOR, normalizeMaterialRarity } from "../utils/materialRarity";

const EPS = 1e-6;
const MAX_STEPS = 3000;

function effectText(item) {
  if (item.effectMode === "speed") return "加速";
  if (item.effectMode === "boost") return "增产";
  return "无";
}

function perMinute(amount, cycleSeconds) {
  const cycle = Number(cycleSeconds || 0);
  if (cycle <= 0) return 0;
  return (Number(amount || 0) * 60) / cycle;
}

function fmt(value) {
  return Number(value || 0).toFixed(2);
}

function buildRecipeOptionsByMaterial(recipes) {
  const optionsByMaterial = new Map();
  for (const recipe of recipes || []) {
    for (const output of recipe.outputs || []) {
      const material = output.name;
      const outRate = perMinute(output.amount, recipe.cycleSeconds);
      if (outRate <= EPS) continue;

      const totalInputRate = (recipe.inputs || []).reduce(
        (sum, input) => sum + perMinute(input.amount, recipe.cycleSeconds),
        0,
      );
      const powerRate = Number(recipe.powerKW || 0);
      const option = {
        recipe,
        outRate,
        totalInputRate,
        powerRate,
        powerPerOut: powerRate / outRate,
        inputPerOut: totalInputRate / outRate,
      };
      optionsByMaterial.set(material, [...(optionsByMaterial.get(material) || []), option]);
    }
  }
  return optionsByMaterial;
}

function chooseOption(material, optionsByMaterial, strategy) {
  const options = optionsByMaterial.get(material) || [];
  if (options.length === 0) return null;

  const sorted = [...options].sort((a, b) => {
    if (strategy === "min_power") {
      if (a.powerPerOut !== b.powerPerOut) return a.powerPerOut - b.powerPerOut;
      if (a.inputPerOut !== b.inputPerOut) return a.inputPerOut - b.inputPerOut;
      return b.outRate - a.outRate;
    }
    if (a.inputPerOut !== b.inputPerOut) return a.inputPerOut - b.inputPerOut;
    if (a.powerPerOut !== b.powerPerOut) return a.powerPerOut - b.powerPerOut;
    return b.outRate - a.outRate;
  });
  return sorted[0];
}

function calculatePlan(targets, recipes, strategy) {
  const requirement = new Map();
  for (const item of targets || []) {
    const name = String(item.name || "").trim();
    const amount = Number(item.amount || 0);
    if (!name || amount <= EPS) continue;
    requirement.set(name, (requirement.get(name) || 0) + amount);
  }

  const optionsByMaterial = buildRecipeOptionsByMaterial(recipes);
  const machineByRecipeId = new Map();
  const recipeByID = new Map((recipes || []).map((item) => [item.id, item]));
  const warnings = [];

  let steps = 0;
  while (steps < MAX_STEPS) {
    steps += 1;
    let selectedMaterial = null;
    let selectedNeed = 0;

    for (const [name, value] of requirement.entries()) {
      if (value > EPS && optionsByMaterial.has(name)) {
        selectedMaterial = name;
        selectedNeed = value;
        break;
      }
    }
    if (!selectedMaterial) break;

    const picked = chooseOption(selectedMaterial, optionsByMaterial, strategy);
    if (!picked || picked.outRate <= EPS) {
      break;
    }
    const machineCount = Math.max(1, Math.ceil(selectedNeed / picked.outRate));
    machineByRecipeId.set(
      picked.recipe.id,
      (machineByRecipeId.get(picked.recipe.id) || 0) + machineCount,
    );

    for (const output of picked.recipe.outputs || []) {
      const outputRate = perMinute(output.amount, picked.recipe.cycleSeconds);
      requirement.set(output.name, (requirement.get(output.name) || 0) - outputRate * machineCount);
    }
    for (const input of picked.recipe.inputs || []) {
      const inputRate = perMinute(input.amount, picked.recipe.cycleSeconds);
      requirement.set(input.name, (requirement.get(input.name) || 0) + inputRate * machineCount);
    }
  }

  if (steps >= MAX_STEPS) {
    warnings.push("计算步数达到上限，可能存在循环依赖，请检查配方关系。");
  }

  const recipeRows = [];
  let totalPowerKW = 0;
  for (const [recipeID, machineCount] of machineByRecipeId.entries()) {
    if (machineCount <= EPS) continue;
    const recipe = recipeByID.get(recipeID);
    if (!recipe) continue;
    const power = Number(recipe.powerKW || 0) * machineCount;
    totalPowerKW += power;
    recipeRows.push({
      recipeID,
      recipeName: recipe.name,
      deviceModel: recipe.deviceModel || "未指定",
      effectMode: recipe.effectMode || "none",
      machineCount,
      powerKW: power,
    });
  }
  recipeRows.sort((a, b) => b.machineCount - a.machineCount);

  const externalInputs = [];
  const unresolvedCraftables = [];
  for (const [name, need] of requirement.entries()) {
    if (need <= EPS) continue;
    if (optionsByMaterial.has(name)) {
      unresolvedCraftables.push({ name, amount: need });
    } else {
      externalInputs.push({ name, amount: need });
    }
  }
  externalInputs.sort((a, b) => b.amount - a.amount);
  unresolvedCraftables.sort((a, b) => b.amount - a.amount);

  if (unresolvedCraftables.length > 0) {
    warnings.push("部分可制造材料未能被完全反推，请检查是否有循环依赖或多路径配方。");
  }

  const totalExternalInputs = externalInputs.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return {
    recipeRows,
    externalInputs,
    unresolvedCraftables,
    totalPowerKW,
    totalExternalInputs,
    warnings,
  };
}

function RequirementPage({ apiBaseUrl }) {
  const [form] = Form.useForm();
  const [recipes, setRecipes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
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
    const [recipeResult, materialResult] = await Promise.allSettled([
      listRecipes(apiBaseUrl),
      listMaterials(apiBaseUrl),
    ]);

    const recipeData = recipeResult.status === "fulfilled" ? recipeResult.value || [] : [];
    const materialData = materialResult.status === "fulfilled" ? materialResult.value || [] : [];
    setRecipes(recipeData);
    setMaterials(materialData);

    const errors = [];
    if (recipeResult.status === "rejected") {
      errors.push(`配方加载失败: ${recipeResult.reason?.message || "未知错误"}`);
    }
    if (materialResult.status === "rejected") {
      errors.push(`材料加载失败: ${materialResult.reason?.message || "未知错误"}`);
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

  const materialOptions = useMemo(
    () =>
      materials.map((item) => ({
        label: item.name,
        value: item.name,
      })),
    [materials],
  );

  const recipeColumns = [
    {
      title: "配方",
      key: "recipeName",
      render: (_, item) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{item.recipeName}</Typography.Text>
          <Typography.Text type="secondary">{item.deviceModel}</Typography.Text>
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
      render: (value) => Math.round(Number(value || 0)),
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

  function submitTargets(values) {
    const targets = values.targets || [];
    const minPower = calculatePlan(targets, recipes, "min_power");
    const minRaw = calculatePlan(targets, recipes, "min_raw");
    setResult({ minPower, minRaw });
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
            pagination={{ pageSize: 8, showSizeChanger: false }}
            locale={{ emptyText: "请先填写目标并点击计算" }}
          />

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
                      style={{ marginBottom: 0 }}
                      name={[field.name, "name"]}
                      rules={[{ required: true, message: "请选择目标材料" }]}
                    >
                      <Select
                        style={{ width: 300 }}
                        placeholder="目标材料"
                        options={materialOptions}
                        showSearch
                        optionFilterProp="label"
                        notFoundContent="暂无材料"
                      />
                    </Form.Item>
                    <Form.Item
                      style={{ marginBottom: 0 }}
                      name={[field.name, "amount"]}
                      rules={[{ required: true, message: "请输入目标产量" }]}
                    >
                      <InputNumber
                        style={{ width: 200 }}
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
                <Space>
                  <Button onClick={() => add({ name: undefined, amount: 60 })}>+ 添加目标材料</Button>
                  <Button type="primary" htmlType="submit" loading={loading}>
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
          message="结论条件：最低功耗方案按“单位产出功耗最低”优先选配方；最少原材料方案按“单位产出输入总量最少”优先选配方。"
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

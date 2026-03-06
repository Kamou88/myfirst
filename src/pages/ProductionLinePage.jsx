import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, InputNumber, Select, Space, Table, Tag, Typography } from "antd";
import { listMaterials } from "../api/materials";
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

function ProductionLinePage({ apiBaseUrl }) {
  const [recipes, setRecipes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState(undefined);
  const [selectedCount, setSelectedCount] = useState(1);
  const [lines, setLines] = useState([]);

  async function loadData() {
    try {
      setLoading(true);
      const [recipeData, materialData] = await Promise.all([
        listRecipes(apiBaseUrl),
        listMaterials(apiBaseUrl),
      ]);
      setRecipes(recipeData || []);
      setMaterials(materialData || []);
      setMessage("");
    } catch (error) {
      setMessage(`加载产线数据失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
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

  function addLine() {
    if (!selectedRecipeId || selectedCount <= 0) {
      setMessage("请选择配方并填写设备数量");
      return;
    }
    setLines((prev) => {
      const existing = prev.find((line) => line.recipeId === selectedRecipeId);
      if (existing) {
        return prev.map((line) =>
          line.recipeId === selectedRecipeId
            ? { ...line, machineCount: line.machineCount + Number(selectedCount) }
            : line,
        );
      }
      return [
        ...prev,
        {
          key: `${selectedRecipeId}-${Date.now()}`,
          recipeId: selectedRecipeId,
          machineCount: Number(selectedCount),
        },
      ];
    });
    setMessage("");
  }

  function removeLine(recipeId) {
    setLines((prev) => prev.filter((line) => line.recipeId !== recipeId));
  }

  function updateMachineCount(recipeId, machineCount) {
    setLines((prev) =>
      prev.map((line) =>
        line.recipeId === recipeId
          ? { ...line, machineCount: Number(machineCount || 0) }
          : line,
      ),
    );
  }

  const lineRows = useMemo(
    () =>
      lines
        .map((line) => {
          const recipe = recipeById.get(line.recipeId);
          if (!recipe) return null;
          return {
            ...line,
            recipe,
          };
        })
        .filter(Boolean),
    [lines, recipeById],
  );

  const totals = useMemo(() => {
    const netMap = new Map();
    const grossOutMap = new Map();
    const grossInMap = new Map();
    let totalPowerKW = 0;

    for (const row of lineRows) {
      const cycle = Number(row.recipe.cycleSeconds || 0);
      const machineCount = Number(row.machineCount || 0);
      if (cycle <= 0 || machineCount <= 0) continue;
      totalPowerKW += Number(row.recipe.powerKW || 0) * machineCount;
      const scale = (machineCount * 60) / cycle;

      for (const output of row.recipe.outputs || []) {
        const amount = Number(output.amount || 0) * scale;
        if (amount <= 0) continue;
        grossOutMap.set(output.name, (grossOutMap.get(output.name) || 0) + amount);
        netMap.set(output.name, (netMap.get(output.name) || 0) + amount);
      }
      for (const input of row.recipe.inputs || []) {
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
  }, [lineRows]);

  const columns = [
    {
      title: "配方",
      key: "recipe",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{row.recipe.name}</Typography.Text>
          <Typography.Text type="secondary">
            {row.recipe.deviceModel || "未指定"} / {effectText(row.recipe)}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "设备数量",
      key: "machineCount",
      render: (_, row) => (
        <InputNumber
          min={0}
          step={1}
          precision={0}
          value={row.machineCount}
          onChange={(value) => updateMachineCount(row.recipeId, value)}
        />
      ),
    },
    {
      title: "操作",
      key: "actions",
      render: (_, row) => (
        <Button danger type="link" onClick={() => removeLine(row.recipeId)}>
          删除
        </Button>
      ),
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
        <Space wrap>
          <Select
            style={{ width: 520 }}
            placeholder="选择已有配方"
            value={selectedRecipeId}
            onChange={setSelectedRecipeId}
            options={recipeOptions}
            showSearch
            optionFilterProp="label"
          />
          <InputNumber
            min={1}
            step={1}
            precision={0}
            value={selectedCount}
            onChange={(value) => setSelectedCount(Number(value || 1))}
            placeholder="设备数量"
          />
          <Button type="primary" onClick={addLine}>
            添加到产线
          </Button>
          <Button onClick={loadData} loading={loading}>
            刷新数据
          </Button>
        </Space>

        <Table
          rowKey={(row) => row.recipeId}
          columns={columns}
          dataSource={lineRows}
          loading={loading}
          pagination={false}
          locale={{ emptyText: "请先添加配方到产线" }}
        />

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
          <Typography.Text strong>
            {formatNumber(totals.totalPowerKW)} kW
          </Typography.Text>
        </Card>

        {message ? <Alert type="info" showIcon message={message} /> : null}
      </Space>
    </Card>
  );
}

export default ProductionLinePage;

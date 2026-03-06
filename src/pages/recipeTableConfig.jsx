import { Button, Popconfirm, Space, Tag, Typography } from "antd";
import {
  MATERIAL_RARITY_COLOR,
  normalizeMaterialRarity,
} from "../utils/materialRarity";

function renderMaterialsPerMinute(items, cycleSeconds, rarityByName) {
  if (
    !items ||
    items.length === 0 ||
    !cycleSeconds ||
    cycleSeconds <= 0
  ) {
    return "无";
  }
  return (
    <>
      {items.map((m, index) => {
        const rarity = normalizeMaterialRarity(rarityByName?.get(m.name));
        const text = `${m.name} ${((Number(m.amount) * 60) / Number(cycleSeconds)).toFixed(2)}`;
        return (
          <span key={`${m.name}-${index}`}>
            <span style={{ color: MATERIAL_RARITY_COLOR[rarity] }}>{text}</span>
            {index < items.length - 1 ? "，" : ""}
          </span>
        );
      })}
    </>
  );
}

export function getOutputPerMinuteText(item, rarityByName) {
  return renderMaterialsPerMinute(item.outputs, item.cycleSeconds, rarityByName);
}

export function getInputPerMinuteText(item, rarityByName) {
  return renderMaterialsPerMinute(item.inputs, item.cycleSeconds, rarityByName);
}

function effectLabel(effectMode) {
  if (effectMode === "speed") return "加速";
  if (effectMode === "boost") return "增产";
  return "无";
}

function effectTagColor(effectMode) {
  if (effectMode === "speed") return "blue";
  if (effectMode === "boost") return "purple";
  return "default";
}

function effectPercent(effectMode, boosterTier) {
  const tier = (boosterTier || "mk3").toLowerCase();
  if (effectMode === "speed") {
    if (tier === "mk1") return "25%";
    if (tier === "mk2") return "50%";
    return "100%";
  }
  if (effectMode === "boost") {
    if (tier === "mk1") return "12.5%";
    if (tier === "mk2") return "20%";
    return "25%";
  }
  return "";
}

export function createRecipeColumns({
  onOpenEdit,
  onDelete,
  rarityByName,
}) {
  return [
    {
      title: "配方",
      key: "name",
      render: (_, item) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{item.name}</Typography.Text>
          <Typography.Text type="secondary">
            设备种类：{item.machineName}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "每分钟产量",
      key: "outputPerMinute",
      render: (_, item) => getOutputPerMinuteText(item, rarityByName),
    },
    {
      title: "每分钟消耗",
      key: "inputPerMinute",
      render: (_, item) => getInputPerMinuteText(item, rarityByName),
    },
    {
      title: "功耗(kW)",
      dataIndex: "powerKW",
      key: "powerKW",
      render: (value) => Math.round(Number(value || 0)),
    },
    {
      title: "效果",
      key: "effect",
      render: (_, item) => (
        <Space>
          <Tag color={effectTagColor(item.effectMode)}>
            {item.effectMode === "none"
              ? "无"
              : `${effectLabel(item.effectMode)}${effectPercent(item.effectMode, item.boosterTier)}`}
          </Tag>
        </Space>
      ),
    },
    {
      title: "设备型号",
      dataIndex: "deviceModel",
      key: "deviceModel",
      render: (value) => value || "未指定",
    },
    {
      title: "操作",
      key: "actions",
      render: (_, item) => (
        <Space>
          <Button type="link" onClick={() => onOpenEdit(item)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该配方吗？"
            okText="删除"
            cancelText="取消"
            onConfirm={() => onDelete(item.id)}
          >
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
}

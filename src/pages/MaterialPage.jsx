import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from "antd";
import { useMaterialsData } from "../hooks/useMaterialsData";
import {
  MATERIAL_RARITY_COLOR,
  MATERIAL_RARITY_OPTIONS,
  normalizeMaterialRarity,
} from "../utils/materialRarity";

const MATERIAL_RARITY_ORDER = {
  一般: 1,
  普通: 2,
  稀有: 3,
  史诗: 4,
  传说: 5,
};

function materialNameLength(value) {
  return Array.from(String(value || "")).length;
}

function compareMaterialByRules(a, b) {
  const rarityA = normalizeMaterialRarity(a.rarity);
  const rarityB = normalizeMaterialRarity(b.rarity);
  const byRarity =
    (MATERIAL_RARITY_ORDER[rarityA] || 999) - (MATERIAL_RARITY_ORDER[rarityB] || 999);
  if (byRarity !== 0) return byRarity;

  const byLength = materialNameLength(a.name) - materialNameLength(b.name);
  if (byLength !== 0) return byLength;

  return String(a.name || "").localeCompare(String(b.name || ""), "zh-Hans-CN");
}

function MaterialPage({ apiBaseUrl }) {
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [craftableFilter, setCraftableFilter] = useState("all");
  const [rawFilter, setRawFilter] = useState("all");
  const [syncFilter, setSyncFilter] = useState("all");
  const {
    materials,
    rawMismatchNames,
    loading,
    submitting,
    message,
    reload,
    save,
    remove,
    syncRaw,
  } =
    useMaterialsData(apiBaseUrl);

  function resetForm() {
    form.resetFields();
    form.setFieldValue("isCraftable", false);
    form.setFieldValue("isRaw", false);
    form.setFieldValue("rarity", "一般");
    setEditingId(null);
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  function startCreate() {
    setEditingId(null);
    form.setFieldsValue({
      name: "",
      isCraftable: false,
      isRaw: false,
      rarity: "一般",
    });
    setModalOpen(true);
  }

  async function submitMaterial(values) {
    const payload = {
      name: (values.name || "").trim(),
      isCraftable: Boolean(values.isCraftable),
      isRaw: Boolean(values.isRaw),
      rarity: normalizeMaterialRarity(values.rarity),
    };
    const item = await save(editingId, payload);
    if (item) {
      closeModal();
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    form.setFieldsValue({
      name: item.name,
      isCraftable: Boolean(item.isCraftable),
      isRaw: Boolean(item.isRaw),
      rarity: normalizeMaterialRarity(item.rarity),
    });
    setModalOpen(true);
  }

  async function removeMaterial(id) {
    const shouldReset = await remove(id, editingId);
    if (shouldReset) {
      resetForm();
    }
  }

  const columns = [
    {
      title: "材料名称",
      dataIndex: "name",
      key: "name",
      render: (value, item) => (
        <span style={{ color: MATERIAL_RARITY_COLOR[normalizeMaterialRarity(item.rarity)] }}>
          {value}
        </span>
      ),
    },
    {
      title: "稀有度",
      dataIndex: "rarity",
      key: "rarity",
      render: (value) => {
        const rarity = normalizeMaterialRarity(value);
        return <Tag color="default" style={{ color: MATERIAL_RARITY_COLOR[rarity] }}>{rarity}</Tag>;
      },
    },
    {
      title: "制造属性",
      dataIndex: "isCraftable",
      key: "isCraftable",
      render: (value) =>
        value ? <Tag color="green">可制造</Tag> : <Tag>不可制造</Tag>,
    },
    {
      title: "原料属性",
      dataIndex: "isRaw",
      key: "isRaw",
      render: (value, item) => (
        <Space size={4}>
          {value ? <Tag color="blue">可作原料</Tag> : <Tag>非原料</Tag>}
          {rawMismatchNames.includes(item.name) ? <Tag color="orange">需同步</Tag> : null}
        </Space>
      ),
    },
    {
      title: "操作",
      key: "actions",
      render: (_, item) => (
        <Space>
          <Button type="link" onClick={() => startEdit(item)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该材料吗？"
            okText="删除"
            cancelText="取消"
            onConfirm={() => removeMaterial(item.id)}
          >
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const filteredMaterials = useMemo(
    () =>
      [...materials]
        .sort(compareMaterialByRules)
        .filter((item) => {
        const needSync = rawMismatchNames.includes(item.name);
        const craftableMatched =
          craftableFilter === "all" ||
          (craftableFilter === "yes" ? Boolean(item.isCraftable) : !Boolean(item.isCraftable));
        const rawMatched =
          rawFilter === "all" || (rawFilter === "yes" ? Boolean(item.isRaw) : !Boolean(item.isRaw));
        const syncMatched =
          syncFilter === "all" || (syncFilter === "yes" ? needSync : !needSync);
        return craftableMatched && rawMatched && syncMatched;
        }),
    [materials, craftableFilter, rawFilter, rawMismatchNames, syncFilter],
  );

  function resetFilters() {
    setCraftableFilter("all");
    setRawFilter("all");
    setSyncFilter("all");
  }

  return (
    <Card title="材料管理（Antd）">
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Alert
          type="info"
          showIcon
          message="默认排序由后端统一提供：按稀有度升序；同稀有度按名称长度升序；长度相同按名称字母序。"
        />

        <Space>
          <Button type="primary" onClick={startCreate}>
            新增材料
          </Button>
          <Button onClick={reload} loading={loading}>
            刷新材料列表
          </Button>
          <Button onClick={syncRaw} loading={submitting}>
            按配方同步原料属性
          </Button>
          <Select
            style={{ width: 160 }}
            value={craftableFilter}
            onChange={setCraftableFilter}
            options={[
              { label: "制造属性：全部", value: "all" },
              { label: "制造属性：可制造", value: "yes" },
              { label: "制造属性：不可制造", value: "no" },
            ]}
          />
          <Select
            style={{ width: 160 }}
            value={rawFilter}
            onChange={setRawFilter}
            options={[
              { label: "原料属性：全部", value: "all" },
              { label: "原料属性：可作原料", value: "yes" },
              { label: "原料属性：非原料", value: "no" },
            ]}
          />
          <Select
            style={{ width: 160 }}
            value={syncFilter}
            onChange={setSyncFilter}
            options={[
              { label: "同步状态：全部", value: "all" },
              { label: "同步状态：需同步", value: "yes" },
              { label: "同步状态：已同步", value: "no" },
            ]}
          />
          <Button onClick={resetFilters}>重置筛选</Button>
        </Space>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredMaterials}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{ emptyText: "还没有材料，先新增一条吧。" }}
        />

        {rawMismatchNames.length > 0 ? (
          <Alert
            type="warning"
            showIcon
            message={`检测到 ${rawMismatchNames.length} 条材料的“原料属性”与配方输入规则不一致，可点击“按配方同步原料属性”修正。`}
          />
        ) : null}

        {message ? <Alert type="info" showIcon message={message} /> : null}
      </Space>

      <Modal
        title={editingId !== null ? "编辑材料" : "新增材料"}
        open={modalOpen}
        onOk={() => form.submit()}
        onCancel={closeModal}
        okText={editingId !== null ? "更新" : "新增"}
        cancelText="取消"
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ name: "", isCraftable: false, isRaw: false, rarity: "一般" }}
          onFinish={submitMaterial}
        >
          <Form.Item
            label="材料名称"
            name="name"
            rules={[{ required: true, message: "请填写材料名称" }]}
          >
            <Input placeholder="例如：铁矿" />
          </Form.Item>
          <Form.Item
            label="可制造（可出现在配方输出产物）"
            name="isCraftable"
            valuePropName="checked"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
          <Form.Item
            label="可作原料"
            name="isRaw"
            valuePropName="checked"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
          <Form.Item label="稀有度" name="rarity">
            <Select options={MATERIAL_RARITY_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

export default MaterialPage;

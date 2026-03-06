import { useState } from "react";
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

function MaterialPage({ apiBaseUrl }) {
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { materials, loading, submitting, message, reload, save, remove } =
    useMaterialsData(apiBaseUrl);

  function resetForm() {
    form.resetFields();
    form.setFieldValue("isCraftable", false);
    form.setFieldValue("rarity", "一般");
    setEditingId(null);
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  function startCreate() {
    setEditingId(null);
    form.setFieldsValue({ name: "", isCraftable: false, rarity: "一般" });
    setModalOpen(true);
  }

  async function submitMaterial(values) {
    const payload = {
      name: (values.name || "").trim(),
      isCraftable: Boolean(values.isCraftable),
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

  return (
    <Card title="材料管理（Antd）">
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Space>
          <Button type="primary" onClick={startCreate}>
            新增材料
          </Button>
          <Button onClick={reload} loading={loading}>
            刷新材料列表
          </Button>
        </Space>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={materials}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{ emptyText: "还没有材料，先新增一条吧。" }}
        />

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
          initialValues={{ name: "", isCraftable: false, rarity: "一般" }}
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
          <Form.Item label="稀有度" name="rarity">
            <Select options={MATERIAL_RARITY_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

export default MaterialPage;

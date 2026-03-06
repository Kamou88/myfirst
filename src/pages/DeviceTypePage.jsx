import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
} from "antd";
import { useDeviceTypesData } from "../hooks/useDeviceTypesData";

function DeviceTypePage({ apiBaseUrl }) {
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { deviceTypes, loading, submitting, message, reload, save, remove } =
    useDeviceTypesData(apiBaseUrl);

  function resetForm() {
    form.resetFields();
    setEditingId(null);
  }

  function openCreateModal() {
    setEditingId(null);
    form.setFieldsValue({ name: "" });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  async function submitDeviceType(values) {
    const item = await save(editingId, values.name || "");
    if (item) {
      closeModal();
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    form.setFieldsValue({ name: item.name });
    setModalOpen(true);
  }

  async function removeDeviceType(id) {
    const shouldReset = await remove(id, editingId);
    if (shouldReset) {
      resetForm();
    }
  }

  const columns = [
    {
      title: "设备种类名称",
      dataIndex: "name",
      key: "name",
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
            title="确认删除该设备种类吗？"
            okText="删除"
            cancelText="取消"
            onConfirm={() => removeDeviceType(item.id)}
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
    <Card title="设备种类管理（Antd）">
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Space>
          <Button type="primary" onClick={openCreateModal}>
            新增设备种类
          </Button>
          <Button onClick={reload} loading={loading}>
            刷新列表
          </Button>
        </Space>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={deviceTypes}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{ emptyText: "还没有设备种类，先新增一条吧。" }}
        />

        {message ? <Alert type="info" showIcon message={message} /> : null}
      </Space>

      <Modal
        title={editingId !== null ? "编辑设备种类" : "新增设备种类"}
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
          initialValues={{ name: "" }}
          onFinish={submitDeviceType}
        >
          <Form.Item
            label="设备种类名称"
            name="name"
            rules={[{ required: true, message: "请输入设备种类名称" }]}
          >
            <Input placeholder="例如：熔炉" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

export default DeviceTypePage;

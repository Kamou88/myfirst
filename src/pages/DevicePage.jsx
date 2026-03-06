import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
} from "antd";
import { useDevicesData } from "../hooks/useDevicesData";

function DevicePage({ apiBaseUrl }) {
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const {
    devices,
    deviceTypes,
    loading,
    submitting,
    message,
    reloadDevices,
    save,
    remove,
  } = useDevicesData(apiBaseUrl);

  function resetForm() {
    form.resetFields();
    setEditingId(null);
  }

  function openCreateModal() {
    setEditingId(null);
    form.setFieldsValue({
      deviceType: undefined,
      name: "",
      efficiencyPercent: 100,
      powerKW: 0,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  async function submitDevice(values) {
    const payload = {
      deviceType: (values.deviceType || "").trim(),
      name: (values.name || "").trim(),
      efficiencyPercent: Number(values.efficiencyPercent),
      powerKW: Number(values.powerKW),
    };
    const item = await save(editingId, payload);
    if (item) {
      closeModal();
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    form.setFieldsValue({
      deviceType: item.deviceType || undefined,
      name: item.name,
      efficiencyPercent: Number(item.efficiencyPercent),
      powerKW: Number(item.powerKW),
    });
    setModalOpen(true);
  }

  async function removeDevice(id) {
    const shouldReset = await remove(id, editingId);
    if (shouldReset) {
      resetForm();
    }
  }

  const columns = [
    {
      title: "设备种类",
      dataIndex: "deviceType",
      key: "deviceType",
      render: (value) => value || "未分类",
    },
    {
      title: "设备型号",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "生产效率(%)",
      dataIndex: "efficiencyPercent",
      key: "efficiencyPercent",
      render: (value) => Math.round(Number(value) || 0),
    },
    {
      title: "功耗(kW)",
      dataIndex: "powerKW",
      key: "powerKW",
      render: (value) => Math.round(Number(value) || 0),
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
            title="确认删除该设备吗？"
            okText="删除"
            cancelText="取消"
            onConfirm={() => removeDevice(item.id)}
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
    <Card title="设备管理（Antd）">
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Space>
          <Button
            type="primary"
            onClick={openCreateModal}
            disabled={deviceTypes.length === 0}
          >
            新增设备
          </Button>
          <Button onClick={reloadDevices} loading={loading}>
            刷新设备列表
          </Button>
        </Space>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={devices}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{ emptyText: "还没有设备，先新增一台吧。" }}
        />

        {deviceTypes.length === 0 ? (
          <Alert
            type="warning"
            showIcon
            message="请先到“设备种类管理”新增设备种类。"
          />
        ) : null}
        {message ? <Alert type="info" showIcon message={message} /> : null}
      </Space>

      <Modal
        title={editingId !== null ? "编辑设备" : "新增设备"}
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
          initialValues={{
            deviceType: undefined,
            name: "",
            efficiencyPercent: 100,
            powerKW: 0,
          }}
          onFinish={submitDevice}
        >
          <Form.Item
            label="设备种类"
            name="deviceType"
            rules={[{ required: true, message: "请选择设备种类" }]}
          >
            <Select
              placeholder="请选择设备种类"
              options={deviceTypes.map((item) => ({
                label: item.name,
                value: item.name,
              }))}
            />
          </Form.Item>
          <Form.Item
            label="设备型号"
            name="name"
            rules={[{ required: true, message: "请输入设备型号" }]}
          >
            <Input placeholder="例如：熔炉 Mk1" />
          </Form.Item>
          <Form.Item
            label="生产效率百分比"
            name="efficiencyPercent"
            rules={[{ required: true, message: "请输入生产效率" }]}
          >
            <InputNumber min={1} step={1} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label="设备功耗（kW）"
            name="powerKW"
            rules={[{ required: true, message: "请输入设备功耗" }]}
          >
            <InputNumber min={0} step={1} precision={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

export default DevicePage;

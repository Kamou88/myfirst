import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  message as antdMessage,
} from "antd";
import { createUser, deleteUserByID, listUsers, updateUserByID } from "../api/users";

function UserPage({ apiBaseUrl, currentUser }) {
  const [form] = Form.useForm();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  async function reloadUsers() {
    try {
      setLoading(true);
      const data = await listUsers(apiBaseUrl);
      setUsers(data || []);
      setMessage("");
    } catch (error) {
      setMessage(`加载用户失败：${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reloadUsers();
  }, [apiBaseUrl]);

  function openCreate() {
    setEditingUser(null);
    form.setFieldsValue({ username: "", password: "", isActive: true });
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditingUser(item);
    form.setFieldsValue({ username: item.username, password: "", isActive: Boolean(item.isActive) });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingUser(null);
    form.resetFields();
  }

  async function submitUser(values) {
    const payload = {
      username: String(values.username || "").trim(),
      password: String(values.password || ""),
      isActive: Boolean(values.isActive),
    };
    if (!payload.username) {
      antdMessage.warning("用户名不能为空");
      return;
    }
    if (!editingUser && !payload.password) {
      antdMessage.warning("新建用户必须设置密码");
      return;
    }
    if (editingUser && !payload.password) {
      delete payload.password;
    }
    try {
      setSubmitting(true);
      if (editingUser) {
        await updateUserByID(apiBaseUrl, editingUser.id, payload);
        antdMessage.success("用户更新成功");
      } else {
        await createUser(apiBaseUrl, payload);
        antdMessage.success("用户新增成功");
      }
      closeModal();
      await reloadUsers();
    } catch (error) {
      antdMessage.error(`保存失败：${error.message}`);
      setMessage(`保存用户失败：${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function removeUser(id) {
    try {
      setSubmitting(true);
      await deleteUserByID(apiBaseUrl, id);
      antdMessage.success("用户删除成功");
      await reloadUsers();
    } catch (error) {
      antdMessage.error(`删除失败：${error.message}`);
      setMessage(`删除用户失败：${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      title: "用户名",
      dataIndex: "username",
      key: "username",
      render: (value, item) => (
        <Space>
          {value}
          {item.id === currentUser?.id ? <Tag color="blue">当前用户</Tag> : null}
        </Space>
      ),
    },
    {
      title: "状态",
      key: "isActive",
      render: (_, item) => (item.isActive ? <Tag color="green">启用</Tag> : <Tag>禁用</Tag>),
    },
    {
      title: "操作",
      key: "actions",
      render: (_, item) => (
        <Space wrap>
          <Button type="link" onClick={() => openEdit(item)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该用户吗？"
            okText="删除"
            cancelText="取消"
            onConfirm={() => removeUser(item.id)}
            disabled={item.id === currentUser?.id}
          >
            <Button type="link" danger disabled={item.id === currentUser?.id}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card title="用户管理">
      <Space direction="vertical" style={{ width: "100%" }} size={16}>
        <Space>
          <Button type="primary" onClick={openCreate}>
            新增用户
          </Button>
          <Button onClick={reloadUsers} loading={loading}>
            刷新
          </Button>
        </Space>
        <Table rowKey="id" columns={columns} dataSource={users} loading={loading} pagination={false} />
        {message ? <Alert type="info" showIcon message={message} /> : null}
      </Space>

      <Modal
        title={editingUser ? "编辑用户" : "新增用户"}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        okText={editingUser ? "保存修改" : "保存"}
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={submitUser} initialValues={{ isActive: true }}>
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            label={editingUser ? "新密码（留空则不修改）" : "密码"}
            name="password"
            rules={editingUser ? [] : [{ required: true, message: "请输入密码" }]}
          >
            <Input.Password placeholder={editingUser ? "留空不修改" : "请输入密码"} />
          </Form.Item>
          <Form.Item label="是否启用" name="isActive" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

export default UserPage;

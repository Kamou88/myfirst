import { Alert, Button, Card, Form, Input, Space, Typography } from "antd";

function LoginPage({ onSubmit, loading, message }) {
  return (
    <div className="login-page">
      <Card className="login-card" title="登录生产工具台">
        <Form
          layout="vertical"
          initialValues={{ username: "hemng", password: "" }}
          onFinish={onSubmit}
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
            <Typography.Text type="secondary">
              仅登录用户可浏览和操作网站
            </Typography.Text>
            {message ? <Alert type="error" showIcon message={message} /> : null}
          </Space>
        </Form>
      </Card>
    </div>
  );
}

export default LoginPage;

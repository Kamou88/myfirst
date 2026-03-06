import {
  Alert,
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Typography,
} from "antd";

function RecipeFormModal({
  open,
  editingRecipeId,
  submitting,
  form,
  onSubmit,
  onCancel,
  deviceTypes,
  materials,
  craftableMaterials,
}) {
  return (
    <Modal
      title={editingRecipeId !== null ? "编辑配方" : "新增配方"}
      open={open}
      onOk={() => form.submit()}
      onCancel={onCancel}
      okText={editingRecipeId !== null ? "更新配方" : "保存配方"}
      cancelText="取消"
      confirmLoading={submitting}
      width={920}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          canSpeedup: true,
          canBoost: true,
          inputs: [{ name: undefined, amount: undefined }],
          outputs: [{ name: undefined, amount: undefined }],
        }}
        onFinish={onSubmit}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Space wrap style={{ width: "100%" }}>
            <Form.Item
              style={{ marginBottom: 0 }}
              name="name"
              rules={[{ required: true, message: "请输入配方名称" }]}
            >
              <Input style={{ width: 220 }} placeholder="配方名称（例如：铁板）" />
            </Form.Item>
            <Form.Item
              style={{ marginBottom: 0 }}
              name="machineName"
              rules={[{ required: true, message: "请选择设备种类" }]}
            >
              <Select
                style={{ width: 220 }}
                placeholder="请选择设备种类"
                options={deviceTypes.map((type) => ({
                  label: type.name,
                  value: type.name,
                }))}
              />
            </Form.Item>
            <Form.Item
              style={{ marginBottom: 0 }}
              name="cycleSeconds"
              rules={[{ required: true, message: "请输入生产周期" }]}
            >
              <InputNumber
                style={{ width: 220 }}
                placeholder="生产周期（秒）"
                min={0.001}
                step={0.001}
              />
            </Form.Item>
          </Space>

          <Space wrap>
            <Form.Item
              style={{ marginBottom: 0 }}
              name="canSpeedup"
              valuePropName="checked"
            >
              <Checkbox>可加速（勾选后额外生成“可加速效果”配方）</Checkbox>
            </Form.Item>
            <Form.Item
              style={{ marginBottom: 0 }}
              name="canBoost"
              valuePropName="checked"
            >
              <Checkbox>可增产（勾选后额外生成“可增产效果”配方）</Checkbox>
            </Form.Item>
          </Space>

          <Typography.Text strong>输入原料（每周期）</Typography.Text>
          <Form.List name="inputs">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: "100%" }}>
                {fields.map((field) => (
                  <Space key={field.key} wrap style={{ width: "100%" }}>
                    <Form.Item
                      style={{ marginBottom: 0 }}
                      name={[field.name, "name"]}
                      rules={[{ required: true, message: "请选择原料" }]}
                    >
                      <Select
                        style={{ width: 280 }}
                        placeholder="请选择原料"
                        options={materials.map((m) => ({
                          label: m.name,
                          value: m.name,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item
                      style={{ marginBottom: 0 }}
                      name={[field.name, "amount"]}
                      rules={[{ required: true, message: "请输入数量" }]}
                    >
                      <InputNumber
                        style={{ width: 160 }}
                        placeholder="数量"
                        min={0.001}
                        step={0.001}
                      />
                    </Form.Item>
                    <Button
                      danger
                      onClick={() => remove(field.name)}
                      disabled={fields.length === 1}
                    >
                      删除
                    </Button>
                  </Space>
                ))}
                <Button onClick={() => add({ name: undefined, amount: undefined })}>
                  + 添加输入原料
                </Button>
              </Space>
            )}
          </Form.List>

          <Typography.Text strong>输出产物（每周期）</Typography.Text>
          <Form.List name="outputs">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: "100%" }}>
                {fields.map((field) => (
                  <Space key={field.key} wrap style={{ width: "100%" }}>
                    <Form.Item
                      style={{ marginBottom: 0 }}
                      name={[field.name, "name"]}
                      rules={[{ required: true, message: "请选择产物" }]}
                    >
                      <Select
                        style={{ width: 280 }}
                        placeholder="请选择产物"
                        options={craftableMaterials.map((m) => ({
                          label: m.name,
                          value: m.name,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item
                      style={{ marginBottom: 0 }}
                      name={[field.name, "amount"]}
                      rules={[{ required: true, message: "请输入数量" }]}
                    >
                      <InputNumber
                        style={{ width: 160 }}
                        placeholder="数量"
                        min={0.001}
                        step={0.001}
                      />
                    </Form.Item>
                    <Button
                      danger
                      onClick={() => remove(field.name)}
                      disabled={fields.length === 1}
                    >
                      删除
                    </Button>
                  </Space>
                ))}
                <Button onClick={() => add({ name: undefined, amount: undefined })}>
                  + 添加输出产物
                </Button>
              </Space>
            )}
          </Form.List>

          {craftableMaterials.length === 0 ? (
            <Alert
              type="warning"
              showIcon
              message="暂无可制造材料，请先在“材料管理”中将材料标记为“可制造”。"
            />
          ) : null}
        </Space>
      </Form>
    </Modal>
  );
}

export default RecipeFormModal;

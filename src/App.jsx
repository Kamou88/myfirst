import { useEffect, useState } from 'react'
import './App.css'

const emptyMaterial = { name: '', amount: '' }

function App() {
  const [page, setPage] = useState('recipes')
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

  return (
    <div className="container">
      <h1>生产工具台</h1>
      <div className="tabs">
        <button
          className={page === 'recipes' ? 'tab active' : 'tab'}
          onClick={() => setPage('recipes')}
        >
          配方管理
        </button>
        <button
          className={page === 'devices' ? 'tab active' : 'tab'}
          onClick={() => setPage('devices')}
        >
          设备管理
        </button>
        <button
          className={page === 'materials' ? 'tab active' : 'tab'}
          onClick={() => setPage('materials')}
        >
          材料管理
        </button>
      </div>

      {page === 'recipes' ? <RecipePage apiBaseUrl={apiBaseUrl} /> : null}
      {page === 'devices' ? <DevicePage apiBaseUrl={apiBaseUrl} /> : null}
      {page === 'materials' ? <MaterialPage apiBaseUrl={apiBaseUrl} /> : null}
    </div>
  )
}

function RecipePage({ apiBaseUrl }) {
  const [recipes, setRecipes] = useState([])
  const [devices, setDevices] = useState([])
  const [materials, setMaterials] = useState([])
  const [name, setName] = useState('')
  const [machineName, setMachineName] = useState('')
  const [cycleSeconds, setCycleSeconds] = useState('')
  const [powerKW, setPowerKW] = useState('')
  const [inputs, setInputs] = useState([{ ...emptyMaterial }])
  const [outputs, setOutputs] = useState([{ ...emptyMaterial }])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function loadRecipes() {
    try {
      setLoading(true)
      const response = await fetch(`${apiBaseUrl}/api/recipes`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = await response.json()
      setRecipes(data)
      setMessage('')
    } catch (error) {
      setMessage(`加载配方失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function loadRecipeOptions() {
    try {
      const [deviceRes, materialRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/devices`),
        fetch(`${apiBaseUrl}/api/materials`),
      ])
      if (!deviceRes.ok) {
        throw new Error(`设备列表加载失败 HTTP ${deviceRes.status}`)
      }
      if (!materialRes.ok) {
        throw new Error(`材料列表加载失败 HTTP ${materialRes.status}`)
      }
      const [deviceData, materialData] = await Promise.all([deviceRes.json(), materialRes.json()])
      setDevices(deviceData)
      setMaterials(materialData)
    } catch (error) {
      setMessage(error.message)
    }
  }

  function updateMaterial(listSetter, index, field, value) {
    listSetter((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    )
  }

  function addMaterial(listSetter) {
    listSetter((prev) => [...prev, { ...emptyMaterial }])
  }

  function removeMaterial(listSetter, index) {
    listSetter((prev) => prev.filter((_, idx) => idx !== index))
  }

  function normalizeMaterials(items) {
    return items
      .map((item) => ({ name: item.name.trim(), amount: Number(item.amount) }))
      .filter((item) => item.name && item.amount > 0)
  }

  async function createRecipe(event) {
    event.preventDefault()
    const payload = {
      name: name.trim(),
      machineName: machineName.trim(),
      cycleSeconds: Number(cycleSeconds),
      powerKW: Number(powerKW || 0),
      inputs: normalizeMaterials(inputs),
      outputs: normalizeMaterials(outputs),
    }

    if (!payload.name || !payload.machineName || payload.cycleSeconds <= 0) {
      setMessage('请完整填写配方名、机器名和生产周期（秒）')
      return
    }

    if (payload.inputs.length === 0 || payload.outputs.length === 0) {
      setMessage('至少填写一条有效输入和一条有效输出')
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`${apiBaseUrl}/api/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `HTTP ${response.status}`)
      }
      const created = await response.json()
      setRecipes((prev) => [...prev, created])
      setName('')
      setMachineName('')
      setCycleSeconds('')
      setPowerKW('')
      setInputs([{ ...emptyMaterial }])
      setOutputs([{ ...emptyMaterial }])
      setMessage('新增成功')
    } catch (error) {
      setMessage(`保存配方失败: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    loadRecipes()
    loadRecipeOptions()
  }, [])

  return (
    <div className="card">
      <h2>添加生产配方</h2>
      <form className="recipe-form" onSubmit={createRecipe}>
        <div className="grid">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="配方名称（例如：铁板）"
          />
          <select value={machineName} onChange={(event) => setMachineName(event.target.value)}>
            <option value="">请选择机器</option>
            {devices.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}（效率 {item.efficiencyPercent}%）
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            step="0.001"
            value={powerKW}
            onChange={(event) => setPowerKW(event.target.value)}
            placeholder="机器功耗（kW）"
          />
          <input
            type="number"
            min="0.001"
            step="0.001"
            value={cycleSeconds}
            onChange={(event) => setCycleSeconds(event.target.value)}
            placeholder="生产周期（秒）"
          />
        </div>

        <h3>输入原料（每周期）</h3>
        {inputs.map((item, index) => (
          <div className="material-row" key={`in-${index}`}>
            <select
              value={item.name}
              onChange={(event) => updateMaterial(setInputs, index, 'name', event.target.value)}
            >
              <option value="">请选择原料</option>
              {materials.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0.001"
              step="0.001"
              value={item.amount}
              onChange={(event) => updateMaterial(setInputs, index, 'amount', event.target.value)}
              placeholder="数量"
            />
            <button
              type="button"
              className="danger"
              onClick={() => removeMaterial(setInputs, index)}
              disabled={inputs.length === 1}
            >
              删除
            </button>
          </div>
        ))}
        <button type="button" onClick={() => addMaterial(setInputs)}>
          + 添加输入原料
        </button>

        <h3>输出产物（每周期）</h3>
        {outputs.map((item, index) => (
          <div className="material-row" key={`out-${index}`}>
            <select
              value={item.name}
              onChange={(event) => updateMaterial(setOutputs, index, 'name', event.target.value)}
            >
              <option value="">请选择产物</option>
              {materials.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0.001"
              step="0.001"
              value={item.amount}
              onChange={(event) => updateMaterial(setOutputs, index, 'amount', event.target.value)}
              placeholder="数量"
            />
            <button
              type="button"
              className="danger"
              onClick={() => removeMaterial(setOutputs, index)}
              disabled={outputs.length === 1}
            >
              删除
            </button>
          </div>
        ))}
        <button type="button" onClick={() => addMaterial(setOutputs)}>
          + 添加输出产物
        </button>

        <div className="actions">
          <button type="submit" disabled={submitting}>
            {submitting ? '保存中...' : '保存配方'}
          </button>
          <button type="button" onClick={loadRecipes} disabled={loading}>
            {loading ? '刷新中...' : '刷新配方列表'}
          </button>
        </div>
      </form>

      <h3>已保存配方</h3>
      <ul className="recipe-list">
        {recipes.map((item) => (
          <li key={item.id}>
            <strong>{item.name}</strong> / {item.machineName} / 周期 {item.cycleSeconds}s / 功耗{' '}
            {item.powerKW}kW
            <div className="sub-line">输入：{item.inputs.map((m) => `${m.name} x${m.amount}`).join('，')}</div>
            <div className="sub-line">输出：{item.outputs.map((m) => `${m.name} x${m.amount}`).join('，')}</div>
          </li>
        ))}
      </ul>

      {!loading && recipes.length === 0 && <p>还没有配方，先新增一条吧。</p>}
      {devices.length === 0 && <p className="hint">还没有设备，请先到“设备管理”新增设备。</p>}
      {materials.length === 0 && <p className="hint">还没有材料，请先到“材料管理”新增材料。</p>}
      {message && <p>{message}</p>}
    </div>
  )
}

function DevicePage({ apiBaseUrl }) {
  const [devices, setDevices] = useState([])
  const [name, setName] = useState('')
  const [efficiencyPercent, setEfficiencyPercent] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  async function loadDevices() {
    try {
      setLoading(true)
      const response = await fetch(`${apiBaseUrl}/api/devices`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = await response.json()
      setDevices(data)
      setMessage('')
    } catch (error) {
      setMessage(`加载设备失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setName('')
    setEfficiencyPercent('')
    setEditingId(null)
  }

  async function submitDevice(event) {
    event.preventDefault()
    const payload = {
      name: name.trim(),
      efficiencyPercent: Number(efficiencyPercent),
    }
    if (!payload.name || payload.efficiencyPercent <= 0) {
      setMessage('请填写设备名称，且生产效率百分比必须大于 0')
      return
    }

    try {
      setSubmitting(true)
      const isEditing = editingId !== null
      const url = isEditing ? `${apiBaseUrl}/api/devices/${editingId}` : `${apiBaseUrl}/api/devices`
      const method = isEditing ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `HTTP ${response.status}`)
      }
      const item = await response.json()

      if (isEditing) {
        setDevices((prev) => prev.map((d) => (d.id === item.id ? item : d)))
        setMessage('设备更新成功')
      } else {
        setDevices((prev) => [...prev, item])
        setMessage('设备新增成功')
      }
      resetForm()
    } catch (error) {
      setMessage(`保存设备失败: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  function startEdit(item) {
    setEditingId(item.id)
    setName(item.name)
    setEfficiencyPercent(String(item.efficiencyPercent))
  }

  async function removeDevice(id) {
    try {
      const response = await fetch(`${apiBaseUrl}/api/devices/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `HTTP ${response.status}`)
      }
      setDevices((prev) => prev.filter((d) => d.id !== id))
      if (editingId === id) {
        resetForm()
      }
      setMessage('设备删除成功')
    } catch (error) {
      setMessage(`删除设备失败: ${error.message}`)
    }
  }

  useEffect(() => {
    loadDevices()
  }, [])

  return (
    <div className="card">
      <h2>设备管理（CRUD）</h2>
      <form className="recipe-form" onSubmit={submitDevice}>
        <div className="grid">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="设备名称（例如：电炉 Mk1）"
          />
          <input
            type="number"
            min="0.001"
            step="0.001"
            value={efficiencyPercent}
            onChange={(event) => setEfficiencyPercent(event.target.value)}
            placeholder="生产效率百分比（例如：100）"
          />
        </div>
        <div className="actions">
          <button type="submit" disabled={submitting}>
            {submitting ? '保存中...' : editingId !== null ? '更新设备' : '新增设备'}
          </button>
          <button type="button" onClick={loadDevices} disabled={loading}>
            {loading ? '刷新中...' : '刷新设备列表'}
          </button>
          {editingId !== null ? (
            <button type="button" onClick={resetForm}>
              取消编辑
            </button>
          ) : null}
        </div>
      </form>

      <h3>已保存设备</h3>
      <ul className="recipe-list">
        {devices.map((item) => (
          <li key={item.id}>
            <strong>{item.name}</strong> / 生产效率 {item.efficiencyPercent}%
            <div className="actions">
              <button type="button" onClick={() => startEdit(item)}>
                编辑
              </button>
              <button type="button" className="danger" onClick={() => removeDevice(item.id)}>
                删除
              </button>
            </div>
          </li>
        ))}
      </ul>
      {!loading && devices.length === 0 && <p>还没有设备，先新增一台吧。</p>}
      {message && <p>{message}</p>}
    </div>
  )
}

function MaterialPage({ apiBaseUrl }) {
  const [materials, setMaterials] = useState([])
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  async function loadMaterials() {
    try {
      setLoading(true)
      const response = await fetch(`${apiBaseUrl}/api/materials`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = await response.json()
      setMaterials(data)
      setMessage('')
    } catch (error) {
      setMessage(`加载材料失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setName('')
    setEditingId(null)
  }

  async function submitMaterial(event) {
    event.preventDefault()
    const payload = { name: name.trim() }
    if (!payload.name) {
      setMessage('请填写材料名称')
      return
    }

    try {
      setSubmitting(true)
      const isEditing = editingId !== null
      const url = isEditing
        ? `${apiBaseUrl}/api/materials/${editingId}`
        : `${apiBaseUrl}/api/materials`
      const method = isEditing ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `HTTP ${response.status}`)
      }
      const item = await response.json()

      if (isEditing) {
        setMaterials((prev) => prev.map((m) => (m.id === item.id ? item : m)))
        setMessage('材料更新成功')
      } else {
        setMaterials((prev) => [...prev, item])
        setMessage('材料新增成功')
      }
      resetForm()
    } catch (error) {
      setMessage(`保存材料失败: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  function startEdit(item) {
    setEditingId(item.id)
    setName(item.name)
  }

  async function removeMaterial(id) {
    try {
      const response = await fetch(`${apiBaseUrl}/api/materials/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `HTTP ${response.status}`)
      }
      setMaterials((prev) => prev.filter((m) => m.id !== id))
      if (editingId === id) {
        resetForm()
      }
      setMessage('材料删除成功')
    } catch (error) {
      setMessage(`删除材料失败: ${error.message}`)
    }
  }

  useEffect(() => {
    loadMaterials()
  }, [])

  return (
    <div className="card">
      <h2>材料管理（CRUD）</h2>
      <form className="recipe-form" onSubmit={submitMaterial}>
        <div className="grid material-grid">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="材料名称（例如：铁矿）"
          />
        </div>
        <div className="actions">
          <button type="submit" disabled={submitting}>
            {submitting ? '保存中...' : editingId !== null ? '更新材料' : '新增材料'}
          </button>
          <button type="button" onClick={loadMaterials} disabled={loading}>
            {loading ? '刷新中...' : '刷新材料列表'}
          </button>
          {editingId !== null ? (
            <button type="button" onClick={resetForm}>
              取消编辑
            </button>
          ) : null}
        </div>
      </form>

      <h3>已保存材料</h3>
      <ul className="recipe-list">
        {materials.map((item) => (
          <li key={item.id}>
            <strong>{item.name}</strong>
            <div className="actions">
              <button type="button" onClick={() => startEdit(item)}>
                编辑
              </button>
              <button type="button" className="danger" onClick={() => removeMaterial(item.id)}>
                删除
              </button>
            </div>
          </li>
        ))}
      </ul>
      {!loading && materials.length === 0 && <p>还没有材料，先新增一条吧。</p>}
      {message && <p>{message}</p>}
    </div>
  )
}

export default App

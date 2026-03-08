import { Button, Drawer, Grid, Layout, Menu, Space, Typography } from "antd";
import "./App.css";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import DevicePage from "./pages/DevicePage";
import DeviceTypePage from "./pages/DeviceTypePage";
import MaterialPage from "./pages/MaterialPage";
import ProductionLinePage from "./pages/ProductionLinePage";
import RequirementPage from "./pages/RequirementPage";
import RecipePage from "./pages/RecipePage";
import { useEffect, useMemo, useState } from "react";
import LoginPage from "./pages/LoginPage";
import UserPage from "./pages/UserPage";
import { getMe, login, logout } from "./api/auth";
import { getAuthToken, setAuthToken } from "./api/http";

const { Sider, Content } = Layout;

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
  const selectedKey = location.pathname.split("/")[1] || "recipes";
  const isMobile = !screens.md;

  const menuItems = useMemo(
    () => [
      { key: "recipes", label: "配方管理" },
      { key: "productionLines", label: "产线管理" },
      { key: "requirements", label: "需求管理" },
      { key: "devices", label: "设备管理" },
      { key: "deviceTypes", label: "设备种类管理" },
      { key: "materials", label: "材料管理" },
      { key: "users", label: "用户管理" },
    ],
    [],
  );

  useEffect(() => {
    async function bootstrap() {
      const token = getAuthToken();
      if (!token) {
        setAuthLoading(false);
        return;
      }
      try {
        const me = await getMe(apiBaseUrl);
        setCurrentUser(me);
      } catch {
        setAuthToken("");
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    }
    bootstrap();
  }, [apiBaseUrl]);

  async function handleLogin(values) {
    try {
      setLoginLoading(true);
      setAuthMessage("");
      const response = await login(apiBaseUrl, values);
      setAuthToken(response.token);
      setCurrentUser(response.user);
      navigate("/recipes");
    } catch (error) {
      setAuthMessage(error.message || "登录失败");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await logout(apiBaseUrl);
    } catch {
      // Ignore logout API errors and clear local token anyway.
    } finally {
      setAuthToken("");
      setCurrentUser(null);
      navigate("/");
    }
  }

  function onMenuClick({ key }) {
    navigate(`/${key}`);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  }

  if (authLoading) {
    return (
      <Layout className="app-layout">
        <div className="login-page">
          <Typography.Text>正在检查登录状态...</Typography.Text>
        </div>
      </Layout>
    );
  }

  if (!currentUser) {
    return (
      <Layout className="app-layout">
        <LoginPage onSubmit={handleLogin} loading={loginLoading} message={authMessage} />
      </Layout>
    );
  }

  return (
    <Layout className="app-layout">
      {isMobile ? (
        <>
          <div className="mobile-header">
            <Button
              type="text"
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="打开导航菜单"
            >
              菜单
            </Button>
            <Typography.Text className="mobile-header-title">
              生产工具台（{currentUser.username}）
            </Typography.Text>
            <Button type="text" className="mobile-menu-btn" onClick={handleLogout}>
              退出
            </Button>
          </div>
          <Drawer
            title="功能导航"
            placement="left"
            width={260}
            open={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            destroyOnClose
          >
            <Menu
              mode="inline"
              selectedKeys={[selectedKey]}
              onClick={onMenuClick}
              style={{ borderInlineEnd: "none" }}
              items={menuItems}
            />
          </Drawer>
        </>
      ) : (
        <Sider width={220} className="app-sider">
          <div className="app-logo">
            <Typography.Title level={4}>生产工具台</Typography.Title>
            <Space direction="vertical" size={2}>
              <Typography.Text style={{ color: "#aaa" }}>当前：{currentUser.username}</Typography.Text>
              <Button type="link" size="small" style={{ padding: 0 }} onClick={handleLogout}>
                退出登录
              </Button>
            </Space>
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[selectedKey]}
            onClick={onMenuClick}
            style={{ borderInlineEnd: "none" }}
            items={menuItems}
          />
        </Sider>
      )}
      <Layout className={isMobile ? "app-layout-mobile-main" : ""}>
        <Content className="app-content">
          <Routes>
            <Route path="/" element={<Navigate to="/recipes" replace />} />
            <Route path="/recipes" element={<RecipePage apiBaseUrl={apiBaseUrl} />} />
            <Route
              path="/productionLines"
              element={<ProductionLinePage apiBaseUrl={apiBaseUrl} />}
            />
            <Route path="/requirements" element={<RequirementPage apiBaseUrl={apiBaseUrl} />} />
            <Route path="/devices" element={<DevicePage apiBaseUrl={apiBaseUrl} />} />
            <Route
              path="/deviceTypes"
              element={<DeviceTypePage apiBaseUrl={apiBaseUrl} />}
            />
            <Route path="/materials" element={<MaterialPage apiBaseUrl={apiBaseUrl} />} />
            <Route
              path="/users"
              element={<UserPage apiBaseUrl={apiBaseUrl} currentUser={currentUser} />}
            />
          </Routes>
        </Content>
      </Layout>
      <a
        className="github-link github-link-corner"
        href="https://github.com/Kamou88/myfirst.git"
        target="_blank"
        rel="noreferrer"
        title="查看前端仓库"
        aria-label="查看前端仓库"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 .5C5.65.5.5 5.66.5 12.02c0 5.1 3.3 9.43 7.88 10.95.58.11.79-.25.79-.56 0-.28-.01-1.03-.02-2.02-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.04-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.02 1.76 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.56-.29-5.25-1.28-5.25-5.72 0-1.27.45-2.31 1.19-3.12-.12-.3-.52-1.48.11-3.08 0 0 .98-.31 3.2 1.19a11.1 11.1 0 0 1 5.82 0c2.22-1.5 3.2-1.19 3.2-1.19.63 1.6.23 2.78.11 3.08.74.81 1.19 1.85 1.19 3.12 0 4.45-2.7 5.43-5.28 5.71.41.36.78 1.07.78 2.16 0 1.56-.01 2.81-.01 3.19 0 .31.21.67.8.56A11.53 11.53 0 0 0 23.5 12.02C23.5 5.66 18.35.5 12 .5Z" />
        </svg>
      </a>
    </Layout>
  );
}

export default App;

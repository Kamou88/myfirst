import { useState } from "react";
import "./App.css";
import DevicePage from "./pages/DevicePage";
import DeviceTypePage from "./pages/DeviceTypePage";
import MaterialPage from "./pages/MaterialPage";
import RecipePage from "./pages/RecipePage";

function App() {
  const [page, setPage] = useState("recipes");
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

  return (
    <div className="container">
      <h1>生产工具台</h1>
      <div className="tabs">
        <button
          className={page === "recipes" ? "tab active" : "tab"}
          onClick={() => setPage("recipes")}
        >
          配方管理
        </button>
        <button
          className={page === "devices" ? "tab active" : "tab"}
          onClick={() => setPage("devices")}
        >
          设备管理
        </button>
        <button
          className={page === "deviceTypes" ? "tab active" : "tab"}
          onClick={() => setPage("deviceTypes")}
        >
          设备种类管理
        </button>
        <button
          className={page === "materials" ? "tab active" : "tab"}
          onClick={() => setPage("materials")}
        >
          材料管理
        </button>
      </div>

      {page === "recipes" ? <RecipePage apiBaseUrl={apiBaseUrl} /> : null}
      {page === "devices" ? <DevicePage apiBaseUrl={apiBaseUrl} /> : null}
      {page === "deviceTypes" ? (
        <DeviceTypePage apiBaseUrl={apiBaseUrl} />
      ) : null}
      {page === "materials" ? <MaterialPage apiBaseUrl={apiBaseUrl} /> : null}
    </div>
  );
}

export default App;

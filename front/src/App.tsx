import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
const Login = lazy(() => import("./pages/login/Login"));
const Experiments = lazy(() => import("./pages/experiments/Experiments"));
const Experiment = lazy(() => import("./pages/experiment/Experiment"));
const Datasets = lazy(() => import("./pages/dataset/Datasets"));
const UploadDatasets = lazy(() => import("./pages/dataset/UploadDatasets"));
const Documentation = lazy(() => import("./pages/documentation/Documentation"));
import "./i18n";
import PrivateRoute from "./components/PrivateRoute";
import { CircularProgress } from "@mui/material";

function App() {

  const basename = import.meta.env.MODE === 'production' ? '/dsgd/' : '/'

  return (
    <BrowserRouter basename={basename}>
      <Suspense fallback={<div style={{display: "flex", justifyContent: "center", alignItems: "center", height: "100vh"}}><CircularProgress /></div>}>
        <Routes>
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<Experiments />} />
            <Route path="/datasets" element={<Datasets />} />
            <Route path="/datasets/upload" element={<UploadDatasets />} />
            <Route path="/experiments" element={<Experiments />} />
            <Route path="/experiment/:id" element={<Experiment />} />
            <Route path="/experiment/:id/:iteration_id" element={<Experiment />} />
            <Route path="/documentation" element={<Documentation />} />
          </Route>
          <Route path="/login" element={<Login />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App

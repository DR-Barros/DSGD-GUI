import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Experiments from "./pages/experiment/Experiments";
import Datasets from "./pages/dataset/Datasets";
import UploadDatasets from "./pages/dataset/UploadDatasets";
import "./i18n";
import PrivateRoute from "./components/PrivateRoute";

function App() {

  const basename = import.meta.env.MODE === 'production' ? '/dsgd/' : '/'

  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<Experiments />} />
          <Route path="/datasets" element={<Datasets />} />
          <Route path="/datasets/upload" element={<UploadDatasets />} />
          <Route path="/experiments" element={<Experiments />} />
        </Route>
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

// src/components/PrivateRoute.js
import { Navigate, Outlet } from "react-router-dom";
import { useAppContext } from "../store/AppContext";
import ResponsiveAppBar from "./ResponsiveAppBar";


const PrivateRoute = () => {
  const { user } = useAppContext();
  const isAuthenticated = user !== null;

  return isAuthenticated ? (
    <>
      <ResponsiveAppBar />
      <main style={{
        overflowY: "auto",
        maxHeight: "calc(100vh - 64px)", // Adjust based on your AppBar height
      }}>
        <Outlet />
      </main>
    </>
  ) : (
    <Navigate to="/login" replace />
  );
};

export default PrivateRoute;
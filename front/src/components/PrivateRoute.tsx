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
      <Outlet />
    </>
  ) : (
    <Navigate to="/login" replace />
  );
};

export default PrivateRoute;
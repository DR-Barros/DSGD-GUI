// src/components/PrivateRoute.js
import { Navigate, Outlet } from "react-router-dom";
import { useAppContext } from "../store/AppContext";


const PrivateRoute = () => {
  const { user } = useAppContext();
  const isAuthenticated = user !== null;

  return isAuthenticated ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace />
  );
};

export default PrivateRoute;
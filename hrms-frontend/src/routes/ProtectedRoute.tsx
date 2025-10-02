import { Navigate } from "react-router-dom";
import { isTokenValid } from "../utils/auth";

interface Props {
  children: JSX.Element;
}

const ProtectedRoute = ({ children }: Props) => {
  if (!isTokenValid()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default ProtectedRoute;

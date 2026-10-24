import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

export default function ProtectedRoute({ children }) {
  const { token } = useSelector((s) => s.auth);
  const location = useLocation();
  // Remember where the person was headed so login can send them back
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

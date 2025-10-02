import { jwtDecode } from "jwt-decode";

interface JwtPayload {
  id: number;
  email: string;
  exp: number;
}

export const setToken = (token: string) => {
  localStorage.setItem("token", token);
};

export const getToken = () => {
  return localStorage.getItem("token");
};

export const logout = () => {
  localStorage.removeItem("token");
};

export const isTokenValid = (): boolean => {
  const token = getToken();
  if (!token) return false;

  try {
    const decoded: JwtPayload = jwtDecode(token);
    return decoded.exp * 1000 > Date.now(); // not expired
  } catch {
    return false;
  }
};

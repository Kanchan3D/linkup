import { createContext, useState, useEffect } from "react";
import API from "../utils/axios";

// 1. Create the context
export const AuthContext = createContext();

// 2. Create the provider
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore user session on refresh
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }

    setLoading(false);
  }, []);

  // Login handler (returns user + token)
  const login = async (email, password) => {
    const res = await API.post("/auth/login", {
      email,
      password,
    });

    const { token, user } = res.data;

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));

    setToken(token);
    setUser(user);

    return { token, user };
  };

  const register = async (name, email, password) => {
    try {
      const res = await API.post("/auth/register", {
        name,
        email,
        password,
      });

      const { token, user } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      setToken(token);
      setUser(user);

      return { token, user };
    } catch (error) {
      console.error("Registration error:", error);
      console.error("Error response:", error.response?.data);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        register,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

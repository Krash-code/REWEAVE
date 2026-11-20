import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('reweave_token');
    if (!token) {
      setLoading(false);
      return;
    }

    api.get('/auth/me')
      .then(({ data }) => setUser(data.data.user))
      .catch(() => localStorage.removeItem('reweave_token'))
      .finally(() => setLoading(false));
  }, []);

  async function saveSession(request) {
    const { data } = await request;
    localStorage.setItem('reweave_token', data.data.token);
    setUser(data.data.user);
    return data.data.user;
  }

  function login(credentials) {
    return saveSession(api.post('/auth/login', credentials));
  }

  function register(details) {
    return saveSession(api.post('/auth/register', details));
  }

  function logout() {
    localStorage.removeItem('reweave_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
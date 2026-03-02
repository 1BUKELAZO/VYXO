import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as SecureStore from 'expo-secure-store';
import { 
  login as apiLogin, 
  register as apiRegister, 
  logout as apiLogout,
  getProfile,
  getTokens,
  clearTokens 
} from "@/lib/api";

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  role?: string;
  emailVerified?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay sesión activa al iniciar
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { accessToken } = await getTokens();
      if (accessToken) {
        await fetchUser();
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setLoading(false);
    }
  };

  const fetchUser = async () => {
    try {
      setLoading(true);
      const userData = await getProfile();
      setUser({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        image: userData.image,
        role: userData.role,
        emailVerified: userData.emailVerified,
      });
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
      await clearTokens();
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      const data = await apiLogin(email, password);
      setUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        image: data.user.image,
      });
    } catch (error: any) {
      console.error("Email sign in failed:", error);
      throw new Error(error.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    try {
      setLoading(true);
      const data = await apiRegister(name || "", email, password);
      setUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        image: data.user.image,
      });
    } catch (error: any) {
      console.error("Email sign up failed:", error);
      throw new Error(error.message || "Error al crear cuenta");
    } finally {
      setLoading(false);
    }
  };

  // TODO: Implementar OAuth con nuestro backend
  const signInWithGoogle = async () => {
    throw new Error("Google sign in not implemented yet");
  };

  const signInWithApple = async () => {
    throw new Error("Apple sign in not implemented yet");
  };

  const signInWithGitHub = async () => {
    throw new Error("GitHub sign in not implemented yet");
  };

  const signOut = async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error("Sign out API failed:", error);
    } finally {
      setUser(null);
      await clearTokens();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithApple,
        signInWithGitHub,
        signOut,
        fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
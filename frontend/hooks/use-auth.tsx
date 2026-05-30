"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { authAPI, type User } from "@/lib/api"
import { useRouter } from "next/navigation"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: Parameters<typeof authAPI.register>[0]) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isReady, setIsReady] = useState(false)

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["auth", "profile"],
    queryFn: async () => {
      const res = await authAPI.getProfile()
      return res.data as User
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (!isLoading) setIsReady(true)
  }, [isLoading])

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authAPI.login({ email, password }),
    onSuccess: (data) => {
      queryClient.setQueryData(["auth", "profile"], data.data.user)
      router.push("/dashboard")
    },
  })

  const registerMutation = useMutation({
    mutationFn: authAPI.register,
    onSuccess: (data) => {
      queryClient.setQueryData(["auth", "profile"], data.data.user)
      router.push("/dashboard")
    },
  })

  const logoutMutation = useMutation({
    mutationFn: authAPI.logout,
    onSuccess: () => {
      queryClient.clear()
      router.push("/login")
    },
  })

  const login = useCallback(
    async (email: string, password: string) => {
      await loginMutation.mutateAsync({ email, password })
    },
    [loginMutation]
  )

  const register = useCallback(
    async (data: Parameters<typeof authAPI.register>[0]) => {
      await registerMutation.mutateAsync(data)
    },
    [registerMutation]
  )

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync()
  }, [logoutMutation])

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading: isLoading && !isReady,
        isAuthenticated: !!user && !error,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

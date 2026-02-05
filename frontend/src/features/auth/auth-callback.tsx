import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api";

export function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuthStore();

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      navigate("/login");
      return;
    }
    handleCallback(code);
  }, [searchParams]);

  const handleCallback = async (code: string) => {
    try {
      const result = await api.post<{ token: string; user: any }>("/auth/google", {
        access_token: code,
      });
      login(result.token, result.user);
      navigate("/dashboard");
    } catch {
      navigate("/login");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-4 text-center">
        <Skeleton className="mx-auto h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-48" />
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}

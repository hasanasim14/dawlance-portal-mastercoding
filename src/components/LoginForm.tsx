"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { rolePages } from "@/lib/rolePages";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("user_role");

    if (token && role && role in rolePages) {
      const firstAccessiblePage =
        rolePages[role as keyof typeof rolePages]?.[0];

      if (firstAccessiblePage) {
        router.push(firstAccessiblePage);
      } else {
        router.push("/unauthorized");
      }
    }
  }, []);

  // Email Validation Function
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Handling Input Changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));

    setErrors((prev) => ({
      ...prev,
      [id]: value.trim() === "" ? "This field is required" : "",
    }));

    if (id === "email" && value.trim() !== "") {
      setErrors((prev) => ({
        ...prev,
        email: isValidEmail(value) ? "" : "Invalid email format",
      }));
    }
  };

  // Handling Login
  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data?.access_token);
        localStorage.setItem("user_name", data?.user_name);
        localStorage.setItem("user_role", data?.user_role);
        localStorage.setItem("branches", data?.branch);
        localStorage.setItem("product", data?.product);

        // Save role in cookie
        document.cookie = `user_role=${data?.user_role}; path=/`;
        type Role = keyof typeof rolePages;
        const role = data?.user_role as Role;
        const firstAccessiblePage = rolePages[role]?.[0];

        setTimeout(() => {
          router.push(firstAccessiblePage || "/unauthorized");
        }, 1000);

        toast.success("Login Successful");
      } else {
        toast.error("Incorrect email or password");
      }
    } catch (error) {
      console.error("Login API failed:", error);
      toast.error("Login Failed. Please try again");
    } finally {
      setIsLoading(false);
    }
  };

  // On Pressing enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLogin();
    }
  };

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      {...props}
      onKeyDown={handleKeyDown}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Login to your account</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Enter your email below to login to your account
        </p>
      </div>
      <div className="grid gap-6">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleChange}
            className={errors.email ? "border-red-500" : ""}
          />

          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
        </div>
        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor="password">Password</Label>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className={`pr-10 ${errors.password ? "border-red-500" : ""}`}
              value={formData.password}
              onChange={handleChange}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-black cursor-pointer"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            {errors.password && (
              <p className="text-red-500 text-sm">{errors.password}</p>
            )}
          </div>
        </div>
        <Button
          type="button"
          onClick={handleLogin}
          className="w-full"
          disabled={
            !formData.email || !formData.password || !!errors.email || isLoading
          }
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin mr-2" size={20} />
              Logging in...
            </>
          ) : (
            "Login"
          )}
        </Button>
      </div>
    </form>
  );
}

export default LoginForm;

import { useState, useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { MainLayout } from "@/components/layouts/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Logo } from "@/components/logo"; // ✅ Fix: ensure logo is imported

// Login schema
const loginSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

// Register schema
const registerSchema = z
  .object({
    username: z.string().min(3, { message: "Username must be at least 3 characters." }),
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z.string().min(6, { message: "Password must be at least 6 characters." }),
    confirmPassword: z.string(),
    fullName: z.string().optional(),
    role: z.enum(["user", "developer", "marketer", "educator", "student", "parent"]).default("user"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      role: "user",
    },
  });

  const onLoginSubmit = (values) => loginMutation.mutate(values);
  const onRegisterSubmit = (values) => {
    const { confirmPassword, ...data } = values;
    registerMutation.mutate(data);
  };

  return (
    <MainLayout showFooter={false}>
      <div className="min-h-screen flex flex-col justify-center items-center py-24 px-4">
        <div className="max-w-5xl w-full grid gap-8 grid-cols-1 lg:grid-cols-2 items-center">
          {/* Logo section */}
          <div className="hidden lg:flex justify-center items-center">
            {/* Animated logo or fallback */}
            {AnimatedLogo ? <AnimatedLogo className="w-48 h-48" /> : <h2 className="text-4xl font-bold">Echoverse</h2>}
          </div>

          {/* Form section */}
          <div className="w-full max-w-md mx-auto">
            <div className="mb-6 text-center">
              <h1 className="text-3xl font-bold mb-2">Welcome to Echoverse</h1>
              <p className="text-gray-400">Sign in or create an account to get started</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Log In</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              {/* Login Form */}
              <TabsContent value="login">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Your username" {...field} disabled={loginMutation.isPending} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Your password" {...field} disabled={loginMutation.isPending} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full shadow-glow" disabled={loginMutation.isPending}>
                        {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Log In
                      </Button>
                    </form>
                  </Form>
                </motion.div>
              </TabsContent>

              {/* Register Form */}
              <TabsContent value="register">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Choose a username" {...field} disabled={registerMutation.isPending} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Your email" {...field} disabled={registerMutation.isPending} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Create password" {...field} disabled={registerMutation.isPending} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Repeat password" {...field} disabled={registerMutation.isPending} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={registerForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Your full name" {...field} disabled={registerMutation.isPending} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <FormControl>
                              <select {...field} disabled={registerMutation.isPending} className="w-full h-10 px-3 border rounded-md">
                                <option value="user">General User</option>
                                <option value="developer">Developer</option>
                                <option value="marketer">Marketer</option>
                                <option value="educator">Educator</option>
                                <option value="student">Student</option>
                                <option value="parent">Parent</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full shadow-glow" disabled={registerMutation.isPending}>
                        {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Account
                      </Button>
                    </form>
                  </Form>
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginCredentials } from "@shared/schema";
import { useLogin } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useUser } from "@/hooks/use-auth";
import logoPngPath from "@assets/shreerath_logo_brown-removebg-preview_1772012426325.png";

export default function Login() {
  const { data: user, isLoading: isUserLoading } = useUser();
  const [, setLocation] = useLocation();
  const login = useLogin();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setLocation("/admin");
    }
  }, [user, setLocation]);

  const form = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginCredentials) => {
    console.log("Login attempt started", { username: data.username });
    try {
      await login.mutateAsync(data);
      console.log("Login mutation successful");
      // Explicit redirect with window.location for mobile reliability
      window.location.href = "/admin";
    } catch (error: any) {
      console.error("Login attempt failed", error);
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: error.message || "Invalid credentials",
      });
    }
  };

  if (isUserLoading || user) return null;

  return (
    <div className="min-h-screen bg-[#E8E8D0] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src={logoPngPath} 
            alt="Shree Rath Logo" 
            className="h-[80px] mx-auto mb-4 object-contain bg-transparent"
          />
          <div className="text-[20px] text-[#5C3317] mb-2">
            <span className="font-bold">Shree Rath</span> — Pure Veg Restaurant
          </div>
          <h1 className="text-3xl font-bold text-secondary font-display">Admin Portal</h1>
          <p className="text-secondary/60">Secure access for management only</p>
        </div>

        <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="h-12 rounded-xl"
                          autoComplete="username"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          {...field} 
                          className="h-12 rounded-xl"
                          autoComplete="current-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  disabled={login.isPending}
                  className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold"
                >
                  {login.isPending ? <Loader2 className="animate-spin" /> : "Sign In"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

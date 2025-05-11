import { useState } from "react";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EchoDevPage() {
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [type, setType] = useState("code");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateCode = async () => {
    if (!prompt) {
      toast({
        title: "Input Required",
        description: "Please enter a prompt to generate code",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/dev/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, language, type })
      });

      if (!response.ok) {
        throw new Error("Failed to generate code");
      }

      const data = await response.json();
      setResult(data.result);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">EchoDevBot</h1>
            <p className="text-muted-foreground">AI-powered code generation and assistance</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Code Generation Section */}
          <Card>
            <CardHeader>
              <CardTitle>Generate Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium">Programming Language</label>
                <Select
                  value={language}
                  onValueChange={setLanguage}
                  options={[
                    { label: "JavaScript", value: "javascript" },
                    { label: "TypeScript", value: "typescript" },
                    { label: "Python", value: "python" },
                    { label: "Java", value: "java" },
                    { label: "C++", value: "cpp" },
                    { label: "Go", value: "go" },
                    { label: "Rust", value: "rust" }
                  ]}
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Generation Type</label>
                <Select
                  value={type}
                  onValueChange={setType}
                  options={[
                    { label: "Code Generation", value: "code" },
                    { label: "Debug Help", value: "debug" },
                    { label: "Architecture Design", value: "architecture" }
                  ]}
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Prompt</label>
                <Textarea
                  placeholder={
                    type === "code" 
                      ? "Describe the code you want to generate..." 
                      : type === "debug"
                      ? "Paste your code and describe the issue..."
                      : "Describe the system architecture you need..."
                  }
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={6}
                />
              </div>

              <Button onClick={generateCode} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Result Output Section */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Output</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative min-h-[400px] rounded-md bg-muted p-4">
                <pre className="overflow-auto">
                  <code className="text-sm">{result || "Output will appear here..."}</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

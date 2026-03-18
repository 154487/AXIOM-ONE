"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("Auth.login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(t("error"));
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <Card className="bg-axiom-card border-axiom-border">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-white">{t("title")}</CardTitle>
        <CardDescription className="text-axiom-muted">
          {t("subtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">{t("emailLabel")}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-axiom-hover border-axiom-border text-white placeholder:text-axiom-muted focus:border-axiom-primary"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">{t("passwordLabel")}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-axiom-hover border-axiom-border text-white placeholder:text-axiom-muted focus:border-axiom-primary"
            />
          </div>

          {error && (
            <p className="text-axiom-expense text-sm">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-axiom-primary hover:bg-axiom-primary/90 text-white font-medium"
          >
            {loading ? t("loadingButton") : t("submitButton")}
          </Button>
        </form>

        <p className="text-center text-axiom-muted text-sm mt-4">
          {t("registerLink")}{" "}
          <Link href="/register" className="text-axiom-primary hover:underline">
            {t("registerLinkText")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

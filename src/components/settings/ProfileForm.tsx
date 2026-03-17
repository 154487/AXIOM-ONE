"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProfileFormProps {
  user: { id: string; name: string | null; email: string };
}

type Message = { type: "success" | "error"; text: string } | null;

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();

  const [name, setName] = useState(user.name ?? "");
  const [email, setEmail] = useState(user.email);
  const [profileMsg, setProfileMsg] = useState<Message>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<Message>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleProfileSave(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfileMsg({ type: "success", text: "Perfil atualizado com sucesso" });
        router.refresh();
      } else {
        setProfileMsg({ type: "error", text: data.error ?? "Erro ao salvar" });
      }
    } catch {
      setProfileMsg({ type: "error", text: "Erro de conexão" });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSave(e: FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "As senhas não coincidem" });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/settings/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMsg({ type: "success", text: "Senha alterada com sucesso" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordMsg({ type: "error", text: data.error ?? "Erro ao alterar senha" });
      }
    } catch {
      setPasswordMsg({ type: "error", text: "Erro de conexão" });
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-8 max-w-lg">
      {/* Informações Pessoais */}
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-6">
        <h2 className="text-white font-semibold text-lg mb-5">Informações Pessoais</h2>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-axiom-muted text-sm">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-axiom-hover border-axiom-border text-white placeholder:text-axiom-muted focus:border-axiom-primary"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-axiom-muted text-sm">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-axiom-hover border-axiom-border text-white placeholder:text-axiom-muted focus:border-axiom-primary"
            />
          </div>

          {profileMsg && (
            <p className={cn("text-sm", profileMsg.type === "success" ? "text-axiom-income" : "text-axiom-expense")}>
              {profileMsg.text}
            </p>
          )}

          <Button
            type="submit"
            disabled={savingProfile}
            className="bg-axiom-primary hover:bg-axiom-primary/90 text-white"
          >
            {savingProfile ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </div>

      {/* Alterar Senha */}
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-6">
        <h2 className="text-white font-semibold text-lg mb-5">Alterar Senha</h2>
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword" className="text-axiom-muted text-sm">Senha atual</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword" className="text-axiom-muted text-sm">Nova senha</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-axiom-muted text-sm">Confirmar nova senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary"
            />
          </div>

          {passwordMsg && (
            <p className={cn("text-sm", passwordMsg.type === "success" ? "text-axiom-income" : "text-axiom-expense")}>
              {passwordMsg.text}
            </p>
          )}

          <Button
            type="submit"
            disabled={savingPassword}
            className="bg-axiom-primary hover:bg-axiom-primary/90 text-white"
          >
            {savingPassword ? "Salvando..." : "Alterar Senha"}
          </Button>
        </form>
      </div>
    </div>
  );
}

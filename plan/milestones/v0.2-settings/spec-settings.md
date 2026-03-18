# SPEC - v0.2 Settings

> Gerado por `/planejar-feature` em 2026-03-17

## Resumo

Implementar a página de Settings com duas abas: **Perfil** (editar nome, email e senha) e **Categorias** (CRUD completo com color picker). Tudo via API Routes, usando o schema Prisma existente sem migrations adicionais.

---

## Arquitetura

```
Browser (Settings page)
   ↓
Tabs: [Perfil] [Categorias]
   ↓
Client Components (ProfileForm, CategoriesManager)
   ↓
API Routes (PATCH /api/settings/profile, PATCH /api/settings/password)
           (GET|POST /api/categories, PATCH|DELETE /api/categories/[id])
   ↓
Prisma → PostgreSQL (models User, Category — sem mudança de schema)
```

---

## Stack de Referência

- Auth: `auth()` do NextAuth v5 (`src/lib/auth.ts`)
- Prisma: `prisma` singleton de `src/lib/prisma.ts` (server-only)
- UI: shadcn/ui (Tabs, Dialog, Input, Button, Label, Badge)
- Senha: `bcryptjs` para verificar senha atual e hashear nova

---

## Mudanças por Arquivo

### MODIFY: `src/app/(dashboard)/settings/page.tsx`

**Responsabilidade:** Server Component — busca dados e renderiza SettingsTabs

**Implementar:**
- [ ] `auth()` → redirecionar se não autenticado
- [ ] `prisma.user.findUnique` (id, name, email)
- [ ] `prisma.category.findMany` ordenado por `name`
- [ ] Renderizar `<SettingsTabs user={...} categories={...} />`

---

### CREATE: `src/components/settings/SettingsTabs.tsx`

**Responsabilidade:** `"use client"` — Tabs container com Perfil e Categorias

**Implementar:**
- [ ] shadcn `Tabs` com `defaultValue="profile"`
- [ ] Tab "Perfil" → `<ProfileForm />`
- [ ] Tab "Categorias" → `<CategoriesManager />`
- [ ] Props: `user: { id, name, email }`, `categories: Category[]`

---

### CREATE: `src/components/settings/ProfileForm.tsx`

**Responsabilidade:** `"use client"` — formulário de nome/email + troca de senha

**Implementar:**
- [ ] Seção "Informações Pessoais": campos name + email → `PATCH /api/settings/profile`
- [ ] Seção "Alterar Senha": campos currentPassword + newPassword + confirmPassword → `PATCH /api/settings/password`
- [ ] Feedback de sucesso/erro inline (sem toast por ora)
- [ ] Validação client-side: confirmPassword === newPassword
- [ ] Chamar `router.refresh()` após salvar perfil com sucesso — atualiza Server Components sem logout (evita sessão JWT desatualizada)

**Nota:** `router.refresh()` é obrigatório após update de nome/email — sem isso a Topbar mostrará dados antigos até o próximo login.

**Snippet base:**
```tsx
const [saving, setSaving] = useState(false);
const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

async function handleProfileSave(e: FormEvent) {
  e.preventDefault();
  setSaving(true);
  const res = await fetch("/api/settings/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email }),
  });
  setMessage(res.ok ? { type: "success", text: "Perfil atualizado" } : { type: "error", text: "Erro ao salvar" });
  setSaving(false);
}
```

---

### CREATE: `src/components/settings/CategoriesManager.tsx`

**Responsabilidade:** `"use client"` — listagem + ações de categorias

**Implementar:**
- [ ] Grid de categorias: círculo colorido + nome + botões editar/deletar
- [ ] Botão "+ Nova Categoria" → abre `CategoryDialog` (mode=create)
- [ ] Botão editar → abre `CategoryDialog` (mode=edit, dados preenchidos)
- [ ] Botão deletar → `DELETE /api/categories/[id]` com confirmação inline
- [ ] Se delete retornar 409 (tem transações): exibir mensagem "Categoria possui transações"
- [ ] Estado local com `useState(categories)` — atualizar após cada operação sem reload

---

### CREATE: `src/components/settings/CategoryDialog.tsx`

**Responsabilidade:** `"use client"` — modal criar/editar categoria

**Implementar:**
- [ ] shadcn `Dialog` com campo name + color picker (`<input type="color">`) + icon (text input opcional)
- [ ] Mode "create" → `POST /api/categories`
- [ ] Mode "edit" → `PATCH /api/categories/[id]`
- [ ] Props: `mode`, `category?`, `onSuccess(category)`, `onClose()`
- [ ] Paleta de 8 cores sugeridas baseada nos tokens Axiom + cores neutras

**Cores sugeridas:**
```tsx
const PALETTE = ["#FF6B35","#10B981","#EF4444","#3B82F6","#8B5CF6","#F59E0B","#AAB2BD","#0D1B2A"];
```

---

### CREATE: `src/app/api/settings/profile/route.ts`

**Responsabilidade:** Atualizar nome e email do usuário autenticado

**Implementar:**
- [ ] `PATCH` — recebe `{ name, email }`
- [ ] `auth()` → 401 se não autenticado
- [ ] Validação server-side: `name` não vazio, `email` contém `@` e `.` → 400
- [ ] Verificar se email já existe em outro usuário → 409
- [ ] `prisma.user.update` → retornar `{ id, name, email }`

---

### CREATE: `src/app/api/settings/password/route.ts`

**Responsabilidade:** Alterar senha do usuário autenticado

**Implementar:**
- [ ] `PATCH` — recebe `{ currentPassword, newPassword }`
- [ ] `auth()` → 401 se não autenticado
- [ ] `prisma.user.findUnique` para pegar hash atual
- [ ] `bcrypt.compare(currentPassword, hash)` → 400 se incorreta
- [ ] `bcrypt.hash(newPassword, 10)` + `prisma.user.update`
- [ ] Retornar 200 `{ ok: true }`

---

### CREATE: `src/app/api/categories/route.ts`

**Responsabilidade:** Listar e criar categorias do usuário autenticado

**Nota:** O `GET` existe como infra para uso futuro (ex: tela de Transactions). O Settings usa dados via props do Server Component.

**Implementar:**
- [ ] `GET` — `prisma.category.findMany({ where: { userId }, orderBy: { name: 'asc' } })`
- [ ] `POST` — recebe `{ name, color, icon? }` → validar `name` não vazio e `color` iniciando com `#` → `prisma.category.create`
- [ ] Ambos requerem `auth()` → 401

---

### CREATE: `src/app/api/categories/[id]/route.ts`

**Responsabilidade:** Editar e deletar categoria específica

**Implementar:**
- [ ] `PATCH` — recebe `{ name?, color?, icon? }` → validar campos presentes → `prisma.category.update`
- [ ] `DELETE` — buscar categoria com `_count` e verificar ownership + transações:
  ```ts
  const cat = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { transactions: true } } },
  });
  if (!cat || cat.userId !== session.user.id) return 403;
  if (cat._count.transactions > 0) return 409;
  ```
- [ ] Verificar que `category.userId === session.user.id` em ambos → 403

---

## Ordem de Implementação

```
1. API: profile + password     → issue 6
2. API: categories CRUD        → issue 7
3. UI: Settings page + Tabs    → issue 8
4. UI: Profile form            → issue 8
5. UI: Categories manager      → issue 9
6. UI: Category dialog         → issue 9
```

---

## Issues

### Issue 6: API — endpoints de perfil e senha
**Arquivos:**
- `src/app/api/settings/profile/route.ts` (CREATE)
- `src/app/api/settings/password/route.ts` (CREATE)

**Tasks:**
- [ ] CREATE `api/settings/profile/route.ts` — PATCH: validar name/email → checar email único → update
- [ ] CREATE `api/settings/password/route.ts` — PATCH: verify currentPassword (bcrypt) + hash + update
- [ ] Auth guard + validação server-side básica em ambos (`auth()` → 401; campos inválidos → 400)

**Critério:** `PATCH /api/settings/profile` retorna 200; `PATCH /api/settings/password` retorna 400 com senha errada e 200 com senha correta

---

### Issue 7: API — categories CRUD
**Arquivos:**
- `src/app/api/categories/route.ts` (CREATE)
- `src/app/api/categories/[id]/route.ts` (CREATE)

**Tasks:**
- [ ] CREATE `api/categories/route.ts` — GET (list, infra futura) + POST (create com validação name/color)
- [ ] CREATE `api/categories/[id]/route.ts` — PATCH (update) + DELETE (ownership 403 + _count 409)
- [ ] Snippet `_count` obrigatório no DELETE (ver seção "Mudanças por Arquivo")

**Critério:** DELETE de categoria com transações retorna 409; sem transações retorna 200

---

### Issue 8: UI — Settings page + aba Perfil
**Arquivos:**
- `src/app/(dashboard)/settings/page.tsx` (MODIFY)
- `src/components/settings/SettingsTabs.tsx` (CREATE)
- `src/components/settings/ProfileForm.tsx` (CREATE)

**Tasks:**
- [ ] MODIFY `settings/page.tsx` — buscar user + categories via Prisma, passar para SettingsTabs
- [ ] CREATE `SettingsTabs.tsx` — shadcn Tabs com abas "Perfil" e "Categorias"
- [ ] CREATE `ProfileForm.tsx` — seção info pessoal + seção alterar senha + `router.refresh()` após salvar

**Critério:** usuário edita nome e salva — Topbar reflete novo nome imediatamente (via router.refresh); senha errada exibe mensagem de erro

---

### Issue 9: UI — aba Categorias (CRUD)
**Arquivos:**
- `src/components/settings/CategoriesManager.tsx` (CREATE)
- `src/components/settings/CategoryDialog.tsx` (CREATE)

**Tasks:**
- [ ] CREATE `CategoriesManager.tsx` — grid com cores, botões editar/deletar, estado local
- [ ] CREATE `CategoryDialog.tsx` — shadcn Dialog com name + color picker (paleta + input) + icon opcional
- [ ] Deletar categoria com transações exibe mensagem "Categoria possui transações vinculadas"

**Critério:** criar categoria aparece na lista imediatamente; editar reflete mudança; deletar categoria com transações bloqueia com mensagem

---

## Complexidade

**Média** — 9 arquivos (2 modify, 7 create), sem migration, sem dependência nova

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Atualizar email para um já existente | Verificar unicidade antes de update → 409 |
| Deletar categoria com transações | Checar `_count.transactions` → 409 com mensagem clara |
| `input type="color"` visual inconsistente por OS | Usar paleta de 8 cores fixas + fallback para o input nativo |
| Senha em branco no PATCH profile | Ignorar campo senha no endpoint `/profile` — rota separada |

---

## Próxima Etapa

1. `/revisar-spec` — revisão crítica
2. `/clear` — limpar contexto
3. `/publicar-milestone` — criar milestone v0.2 + 4 issues no GitHub
4. `/executar-milestone` — implementar issue por issue

# Plano de Testes - Função de Secretária

## Objetivo
Garantir que todo o fluxo de trabalho com secretárias está 100% funcional, incluindo criação, autenticação, troca de senha e gerenciamento de procedimentos.

---

## Regras de Negócio Implementadas

### ✅ Regra de Email Único
- **Um email de anestesista NUNCA pode ser usado como secretária**
- **Um email de secretária NUNCA pode ser usado como anestesista**
- Validação implementada em:
  - `lib/auth.ts` - `register()` - Verifica se email existe em `secretarias`
  - `lib/auth.ts` - `createSecretariaAccount()` - Verifica se email existe em `users`
  - `lib/secretarias.ts` - `createOrLinkSecretaria()` - Verifica se email existe em `users`

---

## Cenários de Teste

### 1. Criação de Secretária por Anestesista

#### 1.1. Criar Nova Secretária (Email Novo)
**Pré-condições:**
- Anestesista logado: `felipemakermoney@gmail.com` / `123456`
- Email da secretária: `brockoriginal@gmail.com` (não cadastrado)

**Passos:**
1. Acessar `/configuracoes`
2. Clicar em "Vincular Secretaria"
3. Preencher:
   - Email: `brockoriginal@gmail.com`
   - Nome: `Brock Original`
   - Telefone: (opcional)
4. Clicar em "Vincular"

**Resultado Esperado:**
- ✅ Secretária criada com sucesso
- ✅ Senha temporária gerada e exibida no console (F12)
- ✅ Email enviado para `brockoriginal@gmail.com` com:
  - Senha temporária destacada
  - Instruções para primeiro login
  - Link para acessar o sistema
- ✅ Mensagem de sucesso exibida na tela
- ✅ Secretária aparece na lista de secretárias vinculadas

**Validações:**
- [ ] Verificar console do navegador para senha temporária
- [ ] Verificar email recebido em `brockoriginal@gmail.com`
- [ ] Verificar se senha temporária está destacada no email
- [ ] Verificar se link de acesso está correto no email

---

#### 1.2. Tentar Criar Secretária com Email de Anestesista
**Pré-condições:**
- Anestesista logado
- Tentar usar email: `felipemakermoney@gmail.com` (já é anestesista)

**Passos:**
1. Acessar `/configuracoes`
2. Clicar em "Vincular Secretaria"
3. Preencher email: `felipemakermoney@gmail.com`
4. Clicar em "Vincular"

**Resultado Esperado:**
- ❌ Erro: "Este email já está cadastrado como anestesista. Um email de anestesista não pode ser usado como secretária."
- ❌ Secretária NÃO é criada

---

#### 1.3. Vincular Secretária Existente
**Pré-condições:**
- Secretária já existe: `brockoriginal@gmail.com`
- Anestesista diferente logado

**Passos:**
1. Acessar `/configuracoes`
2. Clicar em "Vincular Secretaria"
3. Preencher email: `brockoriginal@gmail.com`
4. Clicar em "Vincular"

**Resultado Esperado:**
- ✅ Secretária vinculada com sucesso (sem criar nova conta)
- ✅ Mensagem: "Secretaria vinculada com sucesso!"
- ✅ Secretária aparece na lista

---

### 2. Autenticação da Secretária

#### 2.1. Login com Senha Temporária
**Pré-condições:**
- Secretária criada: `brockoriginal@gmail.com`
- Senha temporária obtida do console/email

**Passos:**
1. Fazer logout do anestesista
2. Acessar `/login`
3. Preencher:
   - Email: `brockoriginal@gmail.com`
   - Senha: [senha temporária do console/email]
4. Clicar em "Entrar"

**Resultado Esperado:**
- ✅ Login bem-sucedido
- ✅ Redirecionamento automático para `/secretaria/change-password`
- ✅ Mensagem: "Por questões de segurança, você precisa trocar sua senha temporária antes de continuar."

**Validações:**
- [ ] Verificar redirecionamento para página de troca de senha
- [ ] Verificar se campo "Senha Atual" está oculto (primeiro login)
- [ ] Verificar mensagem de obrigatoriedade de troca de senha

---

#### 2.2. Tentar Login com Email de Anestesista como Secretária
**Pré-condições:**
- Email: `felipemakermoney@gmail.com` (anestesista)

**Passos:**
1. Acessar `/login`
2. Preencher email de anestesista
3. Tentar fazer login

**Resultado Esperado:**
- ✅ Login como anestesista (não como secretária)
- ✅ Redirecionamento para `/dashboard` (anestesista)

---

### 3. Troca Obrigatória de Senha

#### 3.1. Primeiro Login - Trocar Senha Temporária
**Pré-condições:**
- Secretária logada pela primeira vez
- Redirecionada para `/secretaria/change-password`

**Passos:**
1. Na página de troca de senha:
   - Nova Senha: `NovaSenha123!`
   - Confirmar Nova Senha: `NovaSenha123!`
2. Clicar em "Trocar Senha"

**Resultado Esperado:**
- ✅ Senha alterada com sucesso
- ✅ Mensagem: "Senha alterada com sucesso! Redirecionando..."
- ✅ Redirecionamento para `/secretaria/dashboard`
- ✅ `mustChangePassword` atualizado para `false` nos metadados

**Validações:**
- [ ] Verificar se senha foi atualizada no Supabase Auth
- [ ] Verificar se `mustChangePassword` foi removido dos metadados
- [ ] Verificar redirecionamento para dashboard

---

#### 3.2. Validações de Senha
**Testes de Validação:**
- [ ] Senha com menos de 6 caracteres → Erro
- [ ] Senhas não coincidem → Erro
- [ ] Campos vazios → Erro
- [ ] Senha válida → Sucesso

---

### 4. Dashboard da Secretária

#### 4.1. Acesso ao Dashboard Após Troca de Senha
**Pré-condições:**
- Secretária logada
- Senha alterada com sucesso

**Passos:**
1. Acessar `/secretaria/dashboard`

**Resultado Esperado:**
- ✅ Dashboard carregado com sucesso
- ✅ Lista de anestesistas vinculados visível
- ✅ Estatísticas básicas exibidas
- ✅ Menu de navegação funcional

**Validações:**
- [ ] Verificar se anestesistas vinculados aparecem
- [ ] Verificar se procedimentos dos anestesistas aparecem
- [ ] Verificar se menu está completo

---

### 5. Visualização de Procedimentos

#### 5.1. Ver Procedimentos do Anestesista Vinculado
**Pré-condições:**
- Secretária logada
- Anestesista vinculado com procedimentos

**Passos:**
1. Acessar `/secretaria/dashboard`
2. Clicar em um anestesista vinculado
3. Ver procedimentos

**Resultado Esperado:**
- ✅ Lista de procedimentos do anestesista exibida
- ✅ Procedimentos podem ser visualizados
- ✅ Filtros funcionam corretamente

**Validações:**
- [ ] Verificar se procedimentos aparecem corretamente
- [ ] Verificar se filtros funcionam
- [ ] Verificar se busca funciona

---

#### 5.2. Editar Procedimento
**Pré-condições:**
- Secretária logada
- Procedimento do anestesista vinculado

**Passos:**
1. Acessar procedimento
2. Editar campos permitidos
3. Salvar alterações

**Resultado Esperado:**
- ✅ Procedimento editado com sucesso
- ✅ Alterações salvas no banco
- ✅ Notificação criada para o anestesista

**Validações:**
- [ ] Verificar se alterações foram salvas
- [ ] Verificar se notificação foi criada
- [ ] Verificar se anestesista recebe notificação

---

### 6. Segurança e Validações

#### 6.1. Tentar Editar Procedimento de Anestesista Não Vinculado
**Pré-condições:**
- Secretária logada
- Tentar acessar procedimento de anestesista não vinculado

**Resultado Esperado:**
- ❌ Acesso negado
- ❌ Mensagem de erro apropriada
- ❌ Procedimento não pode ser editado

---

#### 6.2. Tentar Criar Anestesista com Email de Secretária
**Pré-condições:**
- Email: `brockoriginal@gmail.com` (secretária)

**Passos:**
1. Acessar `/register`
2. Tentar criar conta de anestesista com email de secretária

**Resultado Esperado:**
- ❌ Erro: "Este email já está cadastrado como secretária. Um email de secretária não pode ser usado como anestesista."
- ❌ Conta não é criada

---

### 7. Email de Boas-Vindas

#### 7.1. Verificar Conteúdo do Email
**Validações:**
- [ ] Email contém senha temporária destacada
- [ ] Email contém instruções claras para primeiro login
- [ ] Email contém link para acessar o sistema
- [ ] Email contém aviso sobre troca obrigatória de senha
- [ ] Template HTML está formatado corretamente
- [ ] Versão texto do email está completa

---

## Checklist de Testes

### Criação e Vinculação
- [ ] Criar nova secretária com sucesso
- [ ] Tentar criar secretária com email de anestesista → Erro
- [ ] Vincular secretária existente
- [ ] Verificar senha temporária no console
- [ ] Verificar email enviado

### Autenticação
- [ ] Login com senha temporária
- [ ] Redirecionamento para troca de senha
- [ ] Login após troca de senha
- [ ] Tentar login com email de anestesista → Login como anestesista

### Troca de Senha
- [ ] Trocar senha temporária no primeiro login
- [ ] Validações de senha funcionam
- [ ] Redirecionamento após troca de senha

### Dashboard e Funcionalidades
- [ ] Acesso ao dashboard da secretária
- [ ] Visualização de anestesistas vinculados
- [ ] Visualização de procedimentos
- [ ] Edição de procedimentos
- [ ] Criação de notificações

### Segurança
- [ ] Validação de email único funciona
- [ ] Acesso negado a procedimentos não vinculados
- [ ] RLS funcionando corretamente

---

## Próximos Passos Após Testes

1. ✅ Criar secretária no browser
2. ⏳ Verificar email recebido
3. ⏳ Testar login com senha temporária
4. ⏳ Testar troca de senha
5. ⏳ Testar funcionalidades do dashboard
6. ⏳ Validar regras de segurança

---

## Notas Importantes

- **Senha Temporária**: Sempre verificar no console do navegador (F12) após criar secretária
- **Email**: Verificar caixa de entrada e spam de `brockoriginal@gmail.com`
- **Edge Function**: Verificar logs no Supabase Dashboard se email não for recebido
- **Resend**: Se não configurado, email será apenas logado no console


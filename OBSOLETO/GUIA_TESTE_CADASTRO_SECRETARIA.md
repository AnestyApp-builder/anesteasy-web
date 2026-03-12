# 🧪 Guia de Teste - Cadastro de Secretaria

## 📋 Passos para Testar

### **1. Acessar como Anestesista**
1. Abra o navegador em `http://localhost:3000`
2. Faça login com uma conta de anestesista existente
3. Navegue para **Configurações** (menu lateral)

### **2. Vincular Nova Secretaria**
1. Na seção **"Secretaria"**, clique em **"Vincular Secretaria"**
2. Preencha o formulário:
   - **Email da Secretaria** * (obrigatório): `secretaria.teste@exemplo.com`
   - **Nome** (opcional): `Maria Silva`
   - **Telefone** (opcional): `(11) 99999-9999`
3. Clique em **"Vincular"**

### **3. Verificar Resultado**
- ✅ Deve aparecer mensagem: **"Secretaria vinculada com sucesso!"**
- ✅ A secretaria deve aparecer na seção de Secretaria com:
  - Nome
  - Email
  - Telefone (se informado)
  - Botão para desvincular (X)

### **4. Testar Login da Secretaria**
1. Faça logout do anestesista
2. Na tela de login, use:
   - **Email**: `secretaria.teste@exemplo.com`
   - **Senha**: (será gerada automaticamente - verificar console/logs)
3. A secretaria deve ser redirecionada para `/secretaria/dashboard`

### **5. Verificar Dashboard da Secretaria**
- ✅ Deve ver o anestesista que a vinculou
- ✅ Deve ver os procedimentos do anestesista
- ✅ Deve poder editar informações financeiras dos procedimentos

---

## ⚠️ Observações Importantes

### **Senha Temporária**
Quando uma secretaria é criada pelo anestesista, uma senha temporária é gerada automaticamente. 

**Para testar:**
- Verifique o console do navegador (F12) para ver a senha gerada
- Ou use a função de recuperação de senha do Supabase
- Ou acesse o Supabase Dashboard para ver/resetar a senha

### **Confirmação de Email**
- O Supabase pode exigir confirmação de email antes do primeiro login
- Se isso acontecer, verifique a caixa de entrada do email da secretaria
- Ou desative temporariamente a confirmação de email no Supabase Dashboard

---

## 🐛 Problemas Conhecidos e Soluções

### **Problema: "Email já cadastrado"**
- **Solução**: Use um email diferente ou desvincule a secretaria existente primeiro

### **Problema: "Erro ao vincular secretaria"**
- **Solução**: 
  1. Verifique o console do navegador (F12) para ver o erro específico
  2. Verifique se o Supabase está configurado corretamente
  3. Verifique as políticas RLS no Supabase

### **Problema: Secretaria não consegue fazer login**
- **Solução**:
  1. Verifique se o email foi confirmado no Supabase
  2. Verifique se a senha está correta
  3. Use a função de recuperação de senha

---

## ✅ Checklist de Teste

- [ ] Anestesista consegue acessar página de Configurações
- [ ] Formulário de vincular secretaria aparece corretamente
- [ ] Validação de email obrigatório funciona
- [ ] Cadastro de nova secretaria funciona
- [ ] Vinculação de secretaria existente funciona
- [ ] Mensagem de sucesso aparece
- [ ] Secretaria aparece na lista após vinculação
- [ ] Secretaria consegue fazer login
- [ ] Secretaria é redirecionada para dashboard correto
- [ ] Secretaria vê procedimentos do anestesista
- [ ] Desvinculação funciona corretamente

---

## 📝 Notas de Desenvolvimento

- A função `createSecretariaAccount` foi criada em `lib/auth.ts`
- Senha temporária é gerada automaticamente: `Math.random().toString(36).slice(-8) + 'A1!'`
- A conta é criada no Supabase Auth e na tabela `secretarias`
- O vínculo é criado na tabela `anestesista_secretaria`

---

**Data do Teste:** $(date)
**Versão:** 1.0.0


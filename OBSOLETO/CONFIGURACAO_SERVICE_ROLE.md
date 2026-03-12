# Configuração da Service Role Key para Exclusão Completa de Contas

## ⚠️ IMPORTANTE

Atualmente, a exclusão de contas remove **todos os dados da aplicação** mas não exclui o usuário do **Supabase Auth**. 

Isso significa que:
- ✅ Todos os dados (procedimentos, relatórios, etc.) são excluídos
- ✅ Usuário é deslogado da aplicação
- ⚠️ Usuário ainda pode fazer login novamente (mas sem dados)

## 🔑 Para Exclusão COMPLETA

Para que o usuário seja completamente excluído (não conseguindo mais fazer login), você precisa configurar a **Service Role Key**.

### Passos:

1. **Obter a Service Role Key:**
   - Vá para [Supabase Dashboard](https://app.supabase.com)
   - Selecione seu projeto: `zmtwwajyhusyrugobxur`
   - Vá em **Settings** → **API**
   - Copie a **Service Role Key** (NÃO a anon key)

2. **Configurar no projeto:**
   - Crie/edite o arquivo `.env.local` na raiz do projeto
   - Adicione:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://zmtwwajyhusyrugobxur.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
   ```

3. **Reiniciar o servidor:**
   ```bash
   npm run dev
   ```

## 🧪 Como Testar

### Sem Service Role Key (atual):
```
✅ Todos os dados da aplicação foram excluídos
✅ Sessão foi encerrada e usuário foi deslogado
⚠️ Usuário pode fazer login novamente (mas sem dados)
```

### Com Service Role Key configurada:
```
✅ Todos os dados da aplicação foram excluídos
✅ Usuário excluído do Supabase Auth completamente
✅ Usuário NÃO consegue mais fazer login
```

## 🔒 Segurança

- **Service Role Key** tem privilégios administrativos
- Nunca commit ela no git
- Use apenas no servidor (arquivo `.env.local`)
- Mantenha segura e privada

# 🐛 Debug de Erros no Cadastro por Voz

## 🔍 Como Identificar o Erro

### 1. Abra o Console do Navegador
- Pressione `F12` ou `Ctrl+Shift+I`
- Vá para a aba **Console**
- Procure por mensagens com emojis: 🎤, ❌, ⚠️

### 2. Verifique os Logs

Os logs seguem este padrão:
- 🎤 `[VOICE RECORDER]` - Logs do componente de gravação
- 📝 `[VOICE-TO-PROCEDURE]` - Logs da API
- ✅ Sucesso
- ❌ Erro
- ⚠️ Aviso

## 🐛 Erros Comuns e Soluções

### Erro 1: "Erro ao acessar microfone"
**Causa:** Permissões do navegador bloqueadas

**Solução:**
1. Clique no ícone de cadeado na barra de endereços
2. Vá em "Permissões" → "Microfone"
3. Selecione "Permitir"
4. Recarregue a página

### Erro 2: "Não foi possível transcrever o áudio"
**Causa:** Áudio muito baixo ou ruidoso

**Solução:**
- Fale mais alto e mais próximo do microfone
- Reduza ruídos de fundo
- Certifique-se de que o microfone está funcionando
- Tente novamente com frases mais curtas

### Erro 3: "Erro de conexão"
**Causa:** Problema de internet ou API offline

**Solução:**
- Verifique sua conexão com a internet
- Aguarde alguns segundos e tente novamente
- Verifique se as APIs estão configuradas corretamente

### Erro 4: "Campos obrigatórios não foram identificados"
**Causa:** O comando de voz não mencionou todos os campos necessários

**Solução:**
- Certifique-se de mencionar:
  - Nome do paciente
  - Nome do procedimento
  - Data do procedimento
  - Tipo do procedimento
- Seja mais específico e claro
- Exemplo completo:
  > "Procedimento de apendicectomia no paciente João Silva, data 25 de novembro de 2025, tipo cirurgia geral"

### Erro 5: "Erro ao processar comando de voz"
**Causa:** Erro genérico na API

**Solução:**
1. Verifique o console para mais detalhes
2. Verifique se as variáveis de ambiente estão configuradas:
   - `OPENAI_API_KEY`
   - `GOOGLE_APPLICATION_CREDENTIALS`
3. Verifique os logs do servidor

## 🔧 Verificação de Configuração

Execute o script de teste:
```bash
node scripts/test-voice-apis.js
```

Deve retornar:
```
✅ TODAS AS VERIFICAÇÕES PASSARAM!
```

## 📊 Logs Detalhados

### No Console do Navegador

Procure por estas mensagens:

```
🎤 [VOICE RECORDER] Iniciando processamento do áudio...
📤 [VOICE RECORDER] Enviando para API...
📥 [VOICE RECORDER] Resposta recebida: { ok: true, status: 200 }
✅ [VOICE RECORDER] Dados recebidos: { hasTranscription: true, fieldsCount: 15 }
```

### No Servidor (Terminal)

Procure por estas mensagens:

```
🎤 [VOICE-TO-PROCEDURE] Iniciando processamento completo...
🔄 [VOICE-TO-PROCEDURE] Passo 1/2: Transcrevendo áudio...
✅ [VOICE-TO-PROCEDURE] Transcrição: ...
🤖 [VOICE-TO-PROCEDURE] Passo 2/2: Extraindo campos com IA...
✅ [VOICE-TO-PROCEDURE] Campos extraídos: ...
```

## 🚨 Se o Erro Persistir

1. **Copie a mensagem de erro completa** do console
2. **Verifique os logs do servidor** (terminal onde o Next.js está rodando)
3. **Verifique as configurações:**
   - Arquivo `.env.local` existe?
   - `OPENAI_API_KEY` está configurada?
   - `GOOGLE_APPLICATION_CREDENTIALS` aponta para o arquivo correto?
   - O arquivo `keys/google-vision.json` existe e é válido?

## 📝 Exemplo de Comando que Funciona

```
"Procedimento de apendicectomia no paciente João Silva, 
45 anos, data 25 de novembro de 2025, 
no hospital São Lucas, valor 5000 reais, 
anestesia geral, cirurgião Dr. Maria Santos, 
especialidade cirurgia geral"
```

## ✅ Checklist de Debug

- [ ] Console do navegador aberto (F12)
- [ ] Permissões do microfone concedidas
- [ ] Internet funcionando
- [ ] APIs configuradas corretamente
- [ ] Comando de voz menciona campos obrigatórios
- [ ] Áudio está claro e audível
- [ ] Logs do servidor verificados

---

**Última atualização:** 22 de Novembro de 2025


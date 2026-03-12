# Configuração do OCR na Vercel

Este guia explica como configurar o OCR para funcionar em produção na Vercel.

## ⚠️ Problema Comum

Se você receber o erro:
```
Unexpected token 'R', "Request En"... is not valid JSON
```

Isso geralmente significa que:
1. As credenciais do Google Vision não estão configuradas corretamente na Vercel
2. A API está retornando uma página de erro HTML em vez de JSON

## 🔧 Configuração na Vercel

### 1. Obter o Conteúdo do Arquivo JSON de Credenciais

1. Abra o arquivo `keys/google-vision.json` (ou o arquivo JSON que você baixou do Google Cloud)
2. Copie **todo o conteúdo** do arquivo JSON

### 2. Adicionar Variáveis de Ambiente na Vercel

1. Acesse o [Dashboard da Vercel](https://vercel.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** > **Environment Variables**
4. Adicione as seguintes variáveis:

#### Variável 1: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- **Key**: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- **Value**: Cole o conteúdo completo do arquivo `keys/google-vision-oneline.txt` (todo o JSON em uma linha)
- **Environments**: Selecione **Production**, **Preview** e **Development**

**⚠️ CRÍTICO**: 
- Use o arquivo `keys/google-vision-oneline.txt` que já está formatado corretamente
- Copie **TUDO** de uma vez (Ctrl+A, Ctrl+C)
- Cole **TUDO** de uma vez na Vercel (Ctrl+V)
- **NÃO** edite, modifique ou adicione espaços
- A chave privada deve manter os `\n` (escape sequences) como estão no arquivo

**Exemplo do valor:**
```
{"type":"service_account","project_id":"steel-spark-478910-f2","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"...","universe_domain":"googleapis.com"}
```

**❌ NÃO FAÇA:**
- Não adicione quebras de linha reais
- Não remova os `\n` da chave privada
- Não adicione espaços extras
- Não edite o JSON manualmente

#### Variável 2: `PROJECT_ID`
- **Key**: `PROJECT_ID`
- **Value**: O Project ID do seu projeto no Google Cloud (ex: `anesteasy-ocr-123456`)
- **Environments**: Selecione **Production**, **Preview** e **Development**

### 3. Fazer Redeploy

Após adicionar as variáveis de ambiente:

1. Vá em **Deployments**
2. Clique nos três pontos (...) do deployment mais recente
3. Selecione **Redeploy**
4. Ou faça um novo commit e push para trigger um novo deploy

## ⚠️ Erro Específico: "DECODER routines::unsupported"

Se você receber o erro:
```
Error: 2 UNKNOWN: Getting metadata from plugin failed with error: error:1E08010C:DECODER routines::unsupported
```

**Causa**: A chave privada no JSON está mal formatada. Isso geralmente acontece quando:
- O JSON foi editado manualmente
- As quebras de linha `\n` foram removidas ou modificadas
- O JSON foi copiado incorretamente

**Solução**:

1. **Abra o arquivo `keys/google-vision-oneline.txt`**
2. **Selecione TUDO** (Ctrl+A ou Cmd+A)
3. **Copie TUDO** (Ctrl+C ou Cmd+C)
4. Na Vercel, vá em **Settings** > **Environment Variables**
5. **Edite** a variável `GOOGLE_APPLICATION_CREDENTIALS_JSON`
6. **Apague todo o conteúdo antigo**
7. **Cole o novo conteúdo** (Ctrl+V ou Cmd+V) - **NÃO edite nada**
8. **Salve**
9. **Faça um Redeploy**

**Importante**: 
- O arquivo `keys/google-vision-oneline.txt` já está formatado corretamente
- Use esse arquivo, não tente criar o JSON manualmente
- Não adicione ou remova nada do JSON

## 🔍 Verificação

Após o redeploy, teste o OCR:

1. Acesse a página de cadastro de procedimentos
2. Tente fazer upload de uma imagem
3. Verifique se o OCR funciona corretamente

Se ainda houver erro, verifique os logs:

1. Vá em **Deployments** > Selecione o deployment > **Functions**
2. Clique na função `/api/ocr`
3. Veja os logs para identificar o erro específico

## 📝 Notas Importantes

### Diferença entre Desenvolvimento e Produção

- **Desenvolvimento Local**: Usa `GOOGLE_APPLICATION_CREDENTIALS` apontando para o arquivo `keys/google-vision.json`
- **Produção (Vercel)**: Usa `GOOGLE_APPLICATION_CREDENTIALS_JSON` com o conteúdo JSON como string

### Timeout

A rota OCR está configurada com `maxDuration: 30` segundos, que é o máximo permitido no plano Hobby da Vercel. Se precisar de mais tempo, considere:

1. Upgrade para um plano Pro (até 60 segundos)
2. Otimizar o processamento de imagens
3. Usar uma função serverless separada (AWS Lambda, etc.)

### Tamanho Máximo de Arquivo

O limite padrão da Vercel para uploads é 4.5MB. Se precisar de arquivos maiores:

1. Configure `bodyParser` no `next.config.js` (não recomendado para serverless)
2. Ou processe o upload em chunks
3. Ou use um serviço de storage externo (Supabase Storage, AWS S3, etc.)

## 🐛 Troubleshooting

### Erro: "GOOGLE_APPLICATION_CREDENTIALS_JSON inválido"

- Verifique se o JSON está completo e válido
- Certifique-se de que não há quebras de linha no valor da variável
- Tente escapar caracteres especiais se necessário

### Erro: "PROJECT_ID não configurado"

- Verifique se a variável `PROJECT_ID` está configurada na Vercel
- Certifique-se de que o valor está correto (sem espaços extras)

### Erro: Timeout

- Verifique se a imagem não é muito grande
- Considere redimensionar a imagem antes de enviar
- Verifique os logs para ver onde está demorando

### Erro: "Request Entity Too Large"

- O arquivo excede o limite de 4.5MB da Vercel
- Reduza o tamanho da imagem antes de enviar
- Ou implemente upload para storage externo

## 📚 Referências

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Google Cloud Vision API](https://cloud.google.com/vision/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)


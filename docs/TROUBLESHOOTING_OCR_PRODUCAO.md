# Troubleshooting OCR em Produção

Este guia ajuda a resolver problemas comuns do OCR em produção na Vercel.

## 🔍 Como Verificar os Logs

1. Acesse o [Dashboard da Vercel](https://vercel.com/dashboard)
2. Selecione seu projeto
3. Vá em **Deployments** > Selecione o deployment mais recente
4. Clique em **Functions**
5. Encontre a função `/api/ocr`
6. Clique em **View Function Logs**
7. Tente fazer upload de uma imagem novamente
8. Veja os logs que começam com `[OCR]`

## ❌ Erros Comuns e Soluções

### Erro: "Erro ao processar OCR"

Este é um erro genérico. Verifique os logs na Vercel para ver o erro específico. Os logs mostrarão:

- `[OCR] Iniciando processamento...` - Confirma que a requisição chegou
- `[OCR] Variáveis de ambiente:` - Mostra se as variáveis estão configuradas
- `[OCR] Arquivo recebido:` - Confirma que o arquivo foi recebido
- `[OCR] Inicializando cliente do Google Vision...` - Tenta criar o cliente
- `[OCR] Erro no OCR:` - Mostra o erro específico

### Erro: "Configuração do Google Vision não encontrada"

**Causa**: As variáveis de ambiente não estão configuradas na Vercel.

**Solução**:
1. Vá em **Settings** > **Environment Variables** na Vercel
2. Verifique se existem:
   - `GOOGLE_APPLICATION_CREDENTIALS_JSON` (com o JSON completo em uma linha)
   - `PROJECT_ID` (com valor `steel-spark-478910-f2`)
3. Ambas devem estar marcadas para **Production**, **Preview** e **Development**
4. Após adicionar/atualizar, faça um **Redeploy**

### Erro: "Erro de autenticação com Google Vision" (Código: 16 ou 401)

**Causa**: As credenciais estão incorretas ou inválidas.

**Solução**:
1. Verifique se o JSON em `GOOGLE_APPLICATION_CREDENTIALS_JSON` está completo e válido
2. Certifique-se de que não há quebras de linha no JSON (deve ser uma linha só)
3. Verifique se o `PROJECT_ID` está correto (`steel-spark-478910-f2`)
4. Tente copiar o conteúdo do arquivo `keys/google-vision-oneline.txt` novamente
5. Faça um redeploy após atualizar

### Erro: "Erro de permissão com Google Vision" (Código: 7 ou PERMISSION_DENIED)

**Causa**: A Service Account não tem as permissões necessárias.

**Solução**:
1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Vá em **IAM & Admin** > **Service Accounts**
3. Encontre a service account `anesteasy-ocr-service@steel-spark-478910-f2.iam.gserviceaccount.com`
4. Verifique se ela tem a role **"Cloud Vision API User"** ou **"Cloud Vision AI Service Agent"**
5. Se não tiver, adicione a role:
   - Clique na service account
   - Vá em **Permissions**
   - Clique em **Grant Access**
   - Adicione a role **"Cloud Vision API User"**
   - Salve

### Erro: "Cota do Google Vision API excedida" (Código: 8 ou RESOURCE_EXHAUSTED)

**Causa**: Você excedeu o limite de requisições.

**Solução**:
1. Verifique o uso no [Google Cloud Console](https://console.cloud.google.com/)
2. Vá em **APIs & Services** > **Dashboard**
3. Veja o uso da Cloud Vision API
4. O tier gratuito é de 1.000 requisições/mês
5. Se excedeu, aguarde o próximo mês ou habilite faturamento

### Erro: "Faturamento não habilitado no Google Cloud" (Código relacionado a billing)

**Causa**: O projeto não tem uma conta de faturamento vinculada.

**Solução**:
1. Acesse [Google Cloud Billing](https://console.cloud.google.com/billing)
2. Crie uma conta de faturamento ou vincule uma existente ao projeto
3. Adicione um cartão de crédito para verificação
4. Aguarde alguns minutos para a configuração propagar
5. Tente novamente o OCR

**Importante**: 
- Você **não será cobrado** pelas primeiras 1.000 requisições/mês (tier gratuito)
- O cartão é usado apenas para verificação de identidade
- Configure alertas de orçamento para evitar surpresas

### Erro: "GOOGLE_APPLICATION_CREDENTIALS_JSON inválido"

**Causa**: O JSON na variável de ambiente está mal formatado.

**Solução**:
1. Abra o arquivo `keys/google-vision-oneline.txt`
2. Copie todo o conteúdo (deve ser uma única linha)
3. Na Vercel, vá em **Settings** > **Environment Variables**
4. Edite `GOOGLE_APPLICATION_CREDENTIALS_JSON`
5. Cole o conteúdo novamente (certifique-se de que é uma linha só, sem quebras)
6. Salve e faça um redeploy

### Erro: "Unexpected token 'R', "Request En"... is not valid JSON"

**Causa**: A API está retornando HTML (página de erro) em vez de JSON.

**Possíveis causas**:
1. A rota não está sendo encontrada (404)
2. Erro de timeout
3. Erro interno do servidor antes de retornar JSON

**Solução**:
1. Verifique os logs na Vercel para ver o erro específico
2. Verifique se a rota `/api/ocr` existe e está funcionando
3. Verifique se não há timeout (máximo 30 segundos)
4. Tente com uma imagem menor

## 🔧 Checklist de Verificação

Antes de reportar um problema, verifique:

- [ ] As variáveis de ambiente estão configuradas na Vercel?
- [ ] O `GOOGLE_APPLICATION_CREDENTIALS_JSON` está em uma linha só (sem quebras)?
- [ ] O `PROJECT_ID` está correto (`steel-spark-478910-f2`)?
- [ ] As variáveis estão marcadas para Production, Preview e Development?
- [ ] Foi feito um redeploy após configurar as variáveis?
- [ ] A Cloud Vision API está habilitada no Google Cloud?
- [ ] A Service Account tem a role "Cloud Vision API User"?
- [ ] O faturamento está habilitado no projeto (se necessário)?
- [ ] Os logs na Vercel mostram algum erro específico?

## 📝 Informações para Debug

Quando reportar um problema, inclua:

1. **Mensagem de erro completa** (do navegador)
2. **Logs da Vercel** (copie os logs que começam com `[OCR]`)
3. **Tamanho da imagem** que você tentou fazer upload
4. **Tipo de arquivo** (JPEG, PNG, WebP)
5. **Status code** da resposta (se visível no console do navegador)

## 🆘 Ainda com Problemas?

Se nenhuma das soluções acima funcionou:

1. Verifique os logs detalhados na Vercel
2. Verifique se o erro aparece também em desenvolvimento local
3. Teste com uma imagem pequena (menos de 1MB)
4. Verifique se a Cloud Vision API está funcionando no Google Cloud Console
5. Tente criar uma nova Service Account e atualizar as credenciais


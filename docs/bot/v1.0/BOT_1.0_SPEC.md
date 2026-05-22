# AnestEasy Bot WhatsApp - Padrão BOT 1.0

Este documento registra a estrutura e as mensagens do **BOT 1.0**, que implementa um fluxo guiado de extração de dados após o envio de uma foto da ficha anestésica.

## Fluxo de Estados

O bot utiliza a tabela `whatsapp_extractions` para gerenciar o estado da conversa:

1.  **Aguardando Nome (`awaiting_name`)**: Confirmação do nome do paciente.
2.  **Aguardando Anestesia (`awaiting_anesthesia`)**: Confirmação da técnica anestésica.
3.  **Aguardando Procedimento (`awaiting_procedure`)**: Confirmação da cirurgia realizada.
4.  **Aguardando Hospital (`awaiting_hospital`)**: Confirmação do Hospital/Clínica.
5.  **Aguardando Cirurgião (`awaiting_surgeon`)**: Confirmação do médico cirurgião (com opção de deixar vazio).
6.  **Aguardando Secretária (`awaiting_secretary`)**: Opção de vincular ao link seguro da secretária.

## Mensagens do Fluxo

### Início
- **Recepção:** "📸 *Recebi sua ficha!* Já estou analisando os dados com IA..."

### Confirmações (IA Sugere -> Usuário Confirma/Altera)
- **Nome:** "📋 *Ficha Analisada!* *Paciente:* [Nome]. Confirma ou deseja alterar?"
- **Anestesia:** "💉 Identifiquei a anestesia: *[Técnica]*. Confirma ou deseja alterar?"
- **Cirurgia:** "📝 Identifiquei o procedimento: *[Cirurgia]*. Confirma ou deseja alterar?"
- **Hospital:** "🏥 Identifiquei o Hospital: *[Hospital]*. Confirma ou deseja alterar?"
- **Cirurgião:** "👨‍⚕️ Identifiquei o Cirurgião: *[Cirurgião]*. Como deseja prosseguir?"
    - Botões: [✅ Confirmar] [✏️ Digitar nome] [⚪ Deixar vazio]

### Finalização
- **Secretária:** "🤝 *Deseja disponibilizar este procedimento no link seguro da secretária?*"
- **Resumo:** "✅ *PROCEDIMENTO REGISTRADO!* 🚀 [Resumo dos dados]"

## Arquivos de Backup (V1.0)
- `docs/bot/v1.0/backup/route.ts`
- `docs/bot/v1.0/backup/processor.ts`

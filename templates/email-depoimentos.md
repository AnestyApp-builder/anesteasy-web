# 📧 Template de Email para Coletar Depoimentos

## 🎯 OBJETIVO
Coletar 3-5 depoimentos reais de usuários ativos em troca de 1 mês grátis.

---

## 📝 EMAIL TEMPLATE 1 - Personalizado

### Assunto:
```
Dr(a). [Nome], me ajuda com 3 perguntas rápidas? 🎁
```

### Corpo:
```
Olá Dr(a). [Nome],

Tudo bem? Espero que esteja gostando do AnesteAsy! 😊

Vi aqui que você está usando a plataforma há [X semanas/meses] e já cadastrou 
[X procedimentos]. Fico muito feliz em saber que está usando!

Estou melhorando nossa página para ajudar mais anestesiologistas a descobrirem 
a plataforma. Sua experiência real pode ajudar colegas que ainda estão usando 
planilhas e perdendo tempo (e dinheiro).

**Pode me ajudar respondendo 3 perguntas rápidas?** (leva 2 minutos)

1️⃣ **Tempo:** Quanto tempo por mês você economiza usando o AnesteAsy comparado 
   com o método anterior (planilha/caderninho)?

2️⃣ **Dinheiro:** Você já identificou algum procedimento esquecido que recuperou 
   por causa do sistema? Se sim, quanto aproximadamente?

3️⃣ **Favorito:** O que você mais gosta na plataforma? O que facilitou sua rotina?

**💰 EM TROCA: 1 MÊS GRÁTIS** na sua assinatura! (Vou liberar assim que você 
responder)

**📢 Posso usar seu depoimento na página?**
(Escolha uma opção e responda no email)

[ ] Sim, pode usar meu nome completo, cidade e especialidade
[ ] Sim, mas só as iniciais (ex: Dr. A.S. - São Paulo)
[ ] Sim, mas totalmente anônimo (sem nome ou cidade)
[ ] Prefiro não ter meu depoimento publicado (mas respondo as perguntas do mesmo jeito)

Muito obrigado pela ajuda! Sua opinião é muito importante para nós.

Abraço,
[Seu Nome]
[Seu WhatsApp]

P.S.: Se preferir, podemos conversar por WhatsApp rapidinho (2 minutos) ao 
invés de escrever. É só me chamar!
```

---

## 📝 EMAIL TEMPLATE 2 - Mais Direto

### Assunto:
```
1 mês grátis por 2 minutos do seu tempo? 💰
```

### Corpo:
```
Oi Dr(a). [Nome]!

Vou direto ao ponto: 

Estou coletando feedback de quem usa o AnesteAsy para melhorar nossa página.

**Sua parte:** Responder 3 perguntas rápidas (2 minutos)
**Minha parte:** 1 MÊS GRÁTIS na sua assinatura

As perguntas:

1. Quanto tempo você economiza por mês com o AnesteAsy?
2. Já recuperou algum procedimento esquecido? Quanto?
3. O que você mais gosta na plataforma?

Pode usar seu depoimento na página? (Com nome/iniciais/anônimo - você escolhe)

Responda quando puder! 😊

[Seu Nome]
[Email/WhatsApp]
```

---

## 📝 EMAIL TEMPLATE 3 - Follow-up (3 dias depois)

### Assunto:
```
Re: Dr(a). [Nome], me ajuda com 3 perguntas rápidas? 🎁
```

### Corpo:
```
Oi Dr(a). [Nome],

Sei que a rotina de anestesista é corrida! 

Se tiver 2 minutinhos hoje ou amanhã para responder aquelas 3 perguntinhas, 
agradeço muito. Vou liberar 1 mês grátis assim que você responder.

Se preferir conversar rápido por WhatsApp ao invés de escrever, só me chamar: 
[Seu WhatsApp]

Abraço!
[Seu Nome]
```

---

## 🎯 COMO USAR

### Passo 1: Identificar Usuários
Execute no Supabase:

```sql
SELECT 
  a.id,
  a.email,
  a.name,
  a.created_at,
  COUNT(p.id) as procedure_count,
  DATE_PART('day', NOW() - a.created_at) as days_active
FROM anestesiologists a
LEFT JOIN procedures p ON p.anestesiologist_id = a.id
WHERE a.created_at < NOW() - INTERVAL '14 days'  -- Pelo menos 2 semanas de uso
  AND a.subscription_status = 'active'  -- Só assinantes ativos
GROUP BY a.id, a.email, a.name, a.created_at
HAVING COUNT(p.id) >= 5  -- Pelo menos 5 procedimentos cadastrados
ORDER BY COUNT(p.id) DESC
LIMIT 20;
```

### Passo 2: Personalizar Email
Para cada usuário:
1. Copiar Template 1 (mais pessoal) ou Template 2 (mais direto)
2. Substituir:
   - `[Nome]` → Nome do médico
   - `[X semanas/meses]` → Calcular dias_active / 7 ou 30
   - `[X procedimentos]` → procedure_count
3. Enviar manualmente (mais pessoal) ou via ferramenta de email

### Passo 3: Organizar Respostas
Criar planilha ou usar Notion:

| Nome | Cidade | Tempo Economizado | Dinheiro Recuperado | Depoimento | Permissão | Status |
|------|---------|-------------------|---------------------|------------|-----------|--------|
| Dr. X | SP | 8h/mês | R$ 4.200 | "Antes gastava..." | Nome completo | ✅ Aprovado |
| Dra. Y | RJ | 5h/mês | R$ 2.100 | "Identifiquei..." | Iniciais | ✅ Aprovado |

### Passo 4: Implementar
Quando tiver 3+ depoimentos:
1. Atualizar `components/Testimonials.tsx`
2. Substituir placeholders por dados reais
3. Ativar na página: `<Testimonials enabled={true} />`

---

## 💡 DICAS PARA AUMENTAR TAXA DE RESPOSTA

### 1. Melhor Horário para Enviar
- **Terça, Quarta ou Quinta** (evitar segunda e sexta)
- **Entre 19h-21h** (após expediente)
- **Evitar:** Fins de semana, feriados, dezembro

### 2. Personalização é Tudo
- ❌ Email genérico em massa = baixa resposta
- ✅ Email personalizado com dados específicos = alta resposta
- **Incluir:** Nome, tempo de uso, número de procedimentos

### 3. Oferta Clara e Vantajosa
- **1 mês grátis** = R$ 79 de valor
- Deixar claro que vai ganhar independente de publicar
- Não pressionar para aceitar publicação

### 4. Facilitar ao Máximo
- Perguntas diretas e numeradas
- Opção de responder por WhatsApp
- Não pedir mais de 3 informações

### 5. Follow-up Educado
- Aguardar 3 dias para primeiro follow-up
- Se não responder, tentar mais 1 vez após 5 dias
- Depois disso, deixar quieto (não incomodar)

---

## 📊 TAXA DE CONVERSÃO ESPERADA

| Emails Enviados | Taxa de Resposta | Respostas Esperadas | Aceitam Publicar |
|-----------------|------------------|---------------------|------------------|
| 20 emails | 25-35% | 5-7 respostas | 3-5 depoimentos |
| 30 emails | 25-35% | 7-10 respostas | 5-7 depoimentos |
| 50 emails | 20-30% | 10-15 respostas | 7-10 depoimentos |

**Meta inicial:** Enviar para 20 usuários → Conseguir 3-5 depoimentos

---

## ✅ CHECKLIST

Antes de enviar:
- [ ] Identifiquei 10-20 usuários ativos qualificados
- [ ] Personalizei cada email (nome, dados específicos)
- [ ] Testei enviando para mim mesmo (verificar formatação)
- [ ] Preparei planilha para organizar respostas
- [ ] Tenho WhatsApp disponível para conversas rápidas

Após enviar:
- [ ] Respondi todas as perguntas em até 24h
- [ ] Liberei 1 mês grátis para quem respondeu
- [ ] Pedi permissão explícita antes de publicar
- [ ] Organizei depoimentos em planilha
- [ ] Enviei follow-up após 3 dias (para quem não respondeu)

Implementação:
- [ ] Tenho pelo menos 3 depoimentos reais
- [ ] Todos deram permissão para publicar
- [ ] Atualizei `components/Testimonials.tsx`
- [ ] Testei visualmente no ambiente de dev
- [ ] Ativei na produção

---

## 🚨 ERROS COMUNS A EVITAR

### ❌ NÃO FAÇA:
1. Enviar email genérico sem personalização
2. Pedir muitas informações (mais de 3-4 perguntas)
3. Publicar sem permissão explícita
4. Editar ou exagerar depoimentos
5. Oferecer desconto e não cumprir
6. Insistir muito após 2 follow-ups

### ✅ FAÇA:
1. Personalizar cada email
2. Perguntas diretas e fáceis
3. Pedir permissão clara
4. Usar depoimento original (palavra por palavra)
5. Liberar mês grátis imediatamente
6. Respeitar quem não quer participar

---

## 📞 EXEMPLO DE CONVERSA POR WHATSAPP

Se o usuário preferir WhatsApp ao invés de email:

```
Você: Oi Dr(a). [Nome]! Obrigado por aceitar conversar. 
      Vou ser bem rápido, só 3 perguntas:

Você: 1️⃣ Quanto tempo você economiza por mês usando o AnesteAsy 
      comparado com planilha/caderninho?

[Aguardar resposta]

Você: 2️⃣ Você já identificou algum procedimento esquecido que 
      recuperou por causa do sistema?

[Aguardar resposta]

Você: 3️⃣ O que você mais gosta na plataforma?

[Aguardar resposta]

Você: Perfeito! Muito obrigado! 🙏
      Vou liberar 1 mês grátis agora. Você verá no seu painel.
      
      Posso usar seu depoimento na nossa página?
      (1) Nome completo + cidade
      (2) Só iniciais
      (3) Anônimo
      (4) Prefiro não

[Se aceitar]

Você: Ótimo! Muito obrigado pela ajuda! Seu feedback vai 
      ajudar outros colegas a descobrirem a plataforma. 💚
```

---

## 📈 APÓS COLETAR DEPOIMENTOS

### Próximos Passos:
1. ✅ Organizar em planilha
2. ✅ Selecionar os 3-5 melhores
3. ✅ Pedir confirmação final antes de publicar
4. ✅ Atualizar componente Testimonials
5. ✅ Testar em dev
6. ✅ Publicar em produção
7. ✅ Medir impacto na conversão

### Como Medir Impacto:
- Comparar conversão antes vs depois
- Usar Google Analytics para ver tempo na página
- Heatmaps (Clarity) para ver se as pessoas leem os depoimentos
- A/B test: página com vs sem depoimentos

---

**FIM DO TEMPLATE**

*Última atualização: Novembro 2024*


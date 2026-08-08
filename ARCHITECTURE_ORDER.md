# Ordem Arquitetural Oficial — DOD Performance

## Princípio

O projeto possui três domínios distintos:

1. **Cards / evidência**: artigos, resultados e conteúdo editorial curado.
2. **Catálogo clínico**: conceitos, IDs, termos PT-BR/EN, busca e tradução.
3. **ECG**: especialização clínica com contrato próprio de sinal e interpretação.

Cards não definem conceitos clínicos. Eles referenciam `ClinicalTopic.id` por
`clinicalTopicIds`. ECG referencia os mesmos IDs, mas amostras, medidas e
achados de sinal nunca pertencem a `Paper`.

## Fontes oficiais

- `paper-contract.js`: contrato canônico consumido pelas interfaces.
- `clinical-taxonomy.js`: única fonte de conceitos, busca e tradução.
- `scientific-library-data.js`: conteúdo editorial dos cards curados.
- `dodperoformance.main/ECG/ecg-signal.js`: processamento especializado de sinal.

## Fluxo

```text
fontes brutas ── normalizadores ──> Paper ──> cards / leitor / síntese / exportação
                                      │
clinical-taxonomy.js ─────────────────┘
          │
          └──> busca / tradução / ECG.topicIds
```

## Ordem de evolução

1. Preservar os contratos antes de alterar consumidores.
2. Não recriar listas clínicas dentro de páginas ou componentes.
3. Usar IDs estáveis para relações; labels são apresentação.
4. Validar cobertura semântica e imports do pacote antes de publicar.
5. A rota clínica canônica e única é `/clinico/`.

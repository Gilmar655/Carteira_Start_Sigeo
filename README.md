# Dashboard de Análise da Carteira de Projetos — Start Engenharia

Sistema web estático para análise da carteira de projetos e do histórico de programações. A versão entregue já inclui a base `Siga_02-09-2026.xlsx` convertida para carregamento inicial no navegador e permite substituir a base por novos arquivos Excel ou CSV sem alterar o código.

## Recursos principais

- KPIs de projetos, programações, executados, cancelados, parciais, pendentes e reprogramações.
- Dois modos: **Histórico de programações** e **Último status por projeto**.
- Filtros combinados por período, mês, ano, status, intervenção, descrição, contratada, região, área, circuito e modalidade.
- Busca por projeto, Power On, circuito, descrição e equipamentos.
- Gráficos interativos: status, evolução mensal, intervenção, projetos mais reprogramados, descrição e contratada.
- Clique nos gráficos aplica filtros no dashboard.
- Histórico completo de cada projeto em janela modal.
- Tabela completa, paginação, ordenação e exportação XLSX/CSV.
- Validação de nova base antes da substituição.
- Mapeamento automático de cabeçalhos com aliases comuns.
- Armazenamento local da última base importada.
- Qualidade da base e pontos de atenção automáticos.
- Layout responsivo para desktop, tablet e celular.

## Estrutura

```text
carteira-start-dashboard/
├── index.html
├── README.md
├── .nojekyll
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── data.js
│   ├── filtros.js
│   ├── graficos.js
│   ├── tabelas.js
│   ├── importacao.js
│   ├── exportacao.js
│   └── utils.js
├── data/
│   ├── Siga_02-09-2026.xlsx
│   ├── base_inicial.json
│   ├── base_atual.csv
│   ├── exemplo.csv
│   └── MODELO_BASE_CARTEIRA.xlsx
└── assets/
    └── icons/
```

## Como usar localmente

A forma mais confiável é abrir a pasta por um servidor HTTP local, pois o navegador pode bloquear `fetch()` quando o arquivo é aberto diretamente por `file://`.

Com Python instalado:

```bash
python -m http.server 8000
```

Depois abra `http://localhost:8000`.

## Como publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie **todo o conteúdo desta pasta** para a raiz do repositório.
3. Acesse **Settings > Pages**.
4. Em **Build and deployment**, selecione **Deploy from a branch**.
5. Selecione a branch `main` e a pasta `/ (root)`.
6. Salve e aguarde a publicação.
7. Abra o endereço informado pelo GitHub Pages.

O arquivo `.nojekyll` evita processamento desnecessário do Jekyll.

## Atualização da base

No site, clique em **Atualizar base** ou **Importar base** e selecione um `.xlsx`, `.xls` ou `.csv`.

O sistema:

1. lê a primeira aba do Excel;
2. identifica os cabeçalhos;
3. valida campos essenciais;
4. mostra registros, colunas, duplicidades e datas inválidas;
5. permite mapear manualmente campos essenciais que não forem reconhecidos;
6. substitui a base somente após confirmação;
7. recalcula KPIs, gráficos, filtros, tabela e histórico;
8. salva a nova base localmente no navegador.

## Cabeçalhos reconhecidos

O sistema procura os nomes das colunas, não posições fixas. Exemplos de aliases aceitos:

- Projeto / Número do projeto / Nº Projeto
- Data Programação / Data de programação / Data
- Status Programação / Status
- Tipo Intervenção / Tipo de intervenção
- Número Power On / PowerOn / Power On
- Contratada / Parceira
- Descrição do Projeto / Descrição
- Região, Área, Circuito, Modalidade, Equipamentos, Observação

Colunas adicionais são preservadas e exibidas na tabela completa.

## Bibliotecas utilizadas

Para manter o projeto estático e simples de publicar, três bibliotecas são carregadas por CDN na primeira abertura:

- Chart.js 4.4.7 — gráficos.
- SheetJS/XLSX 0.18.5 — leitura e exportação de Excel.
- PapaParse 5.4.1 — leitura de CSV.

Os dados da carteira permanecem no navegador. As bibliotecas são apenas código de interface/processamento e não recebem a base importada.

## Funcionamento offline

O HTML, CSS, JavaScript e a base inicial são locais. Os recursos de gráfico e importação/exportação dependem das bibliotecas acima. Após a primeira abertura, o navegador pode mantê-las em cache, mas funcionamento offline integral depende desse cache. Se o ambiente exigir independência total de internet, baixe as três bibliotecas e altere os `<script src>` do `index.html` para arquivos locais.

## Regras de contagem

- **Projetos únicos:** contagem distinta do campo Projeto.
- **Histórico:** cada linha representa uma programação/registro.
- **Último status por projeto:** usa o registro mais recente pela data de programação; em empate, mantém a última ocorrência da base.
- **Projetos reprogramados:** projetos com 2 ou mais registros.
- **Atenção:** 2 programações.
- **Alerta:** 3 programações.
- **Crítico:** 4 ou mais programações.

## Base incluída nesta entrega

A base fornecida contém 1.399 registros e 617 projetos únicos. O dashboard mantém o histórico integral para consultas e usa uma visão separada para o status mais recente de cada projeto.

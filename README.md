# API - HappLearning

[![Node](https://img.shields.io/badge/Node-16-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4-blue)](https://expressjs.com/)

Na plataforma de treinamentos da Happmobi, tem uma área de gestão completa para acompanhar o desempenho dos colaboradores, tirar relatórios, criar trilhas de conhecimentos e indicar cursos em destaque, entre tantas outras funcionalidades.    

## Execução

### Ambiente de Desenvolvimento
Instalação das dependências: `npm i`

Execução da aplicação: `npm run dev`

### Ambiente de Produção
Execução da aplicação: `npm run start`

## Migrations
Para criar um novo arquivo de migração, utilize o comando:

```bash
npm run migration:create [nome_da_migracao]
```

As migrations serão executadas automaticamente quando o servidor estiver UP.

É possível ver os status das migrations pelo BD, na tabela `migrations`.

## Outros repositorios

- [Front-End](https://github.com/happmobi/happlearning-painel-v2)


  
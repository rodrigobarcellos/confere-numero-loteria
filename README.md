## confere-numero-loteria (CLI em Go)

CLI simples para **comparar apostas de loteria** (Mega-Sena, Lotofácil, Quina etc.) com o **resultado oficial** e mostrar **quantos acertos** cada aposta teve.

Também inclui uma versão **via navegador** (pasta `docs/`), ideal para usar no celular.

### Formato dos arquivos

- **Arquivo de apostas**: 1 aposta por linha; números separados por **espaço** e/ou **vírgula** (também aceita `;`). Linhas vazias e comentários (`# ...`) são ignorados.
- **Arquivo de resultado**: **1 linha** com os números do resultado; mesmos separadores. Linhas vazias e comentários (`# ...`) são ignorados.

### Execução (CLI)

Com Go instalado (recomendado Go 1.22+):

```bash
go run main.go --apostas=apostas.txt --resultado=resultado.txt
```

Ou:

```bash
go run . --apostas=apostas.txt --resultado=resultado.txt
```

### Execução (Navegador / Celular)

Abra `docs/index.html` no navegador, ou publique com GitHub Pages (recomendado para usar no celular).

#### Publicar no GitHub Pages (custo zero)

- **Custo**: normalmente **gratuito** no GitHub Pages (especialmente para repositórios públicos). Sem servidor e sem cobrança por execução.
- **Como ativar**:
  - No GitHub: **Settings → Pages**
  - Em “Build and deployment” escolha:
    - **Source**: “Deploy from a branch”
    - **Branch**: `main`
    - **Folder**: `/docs`
  - Salve. O GitHub vai gerar uma URL do tipo `https://SEU_USUARIO.github.io/SEU_REPO/`.

Depois, no celular, é só abrir essa URL e usar “Selecionar arquivo…” ou colar o conteúdo.

### Saída esperada (CLI)

- Mostra o **Resultado** (ordenado).
- Lista `Aposta N: X acerto(s)`.

### Erros tratados

- Arquivo inexistente / sem permissão
- Linhas com formato inválido (não-inteiro, número <= 0, número repetido)
- Resultado com 0 linhas válidas ou com mais de 1 linha válida



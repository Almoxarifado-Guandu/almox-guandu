// Script de backup automático do Almoxarifado Guandu.
// Roda dentro do GitHub Actions (não no seu computador, não no navegador).
// Usa a service_role key (guardada como Secret do GitHub, nunca aparece no código)
// para ler todas as tabelas do Supabase e salvar um arquivo .json com data.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Faltam as variáveis SUPABASE_URL / SUPABASE_SERVICE_KEY (secrets do GitHub).");
  process.exit(1);
}

const TABELAS = [
  "obras", "fornecedores", "materiais", "estoque", "lotes",
  "requisicoes", "pedidos", "movimentacoes", "programacao", "agendamentos",
];

async function buscarTabela(nome) {
  const url = `${SUPABASE_URL}/rest/v1/${nome}?select=*`;
  const resp = await fetch(url, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
  if (!resp.ok) {
    const texto = await resp.text();
    throw new Error(`Falha ao ler "${nome}": ${resp.status} ${texto}`);
  }
  return resp.json();
}

async function main() {
  const backup = { geradoEm: new Date().toISOString() };
  let totalLinhas = 0;

  for (const tabela of TABELAS) {
    console.log(`Lendo tabela: ${tabela}...`);
    const linhas = await buscarTabela(tabela);
    backup[tabela] = linhas;
    totalLinhas += linhas.length;
    console.log(`  -> ${linhas.length} linha(s)`);
  }

  if (totalLinhas === 0) {
    console.error("Nenhuma linha encontrada em nenhuma tabela — abortando para não sobrescrever backups bons com um arquivo vazio.");
    process.exit(1);
  }

  const fs = await import("node:fs");
  const hoje = new Date().toISOString().slice(0, 10);
  const nomeArquivo = `backups/backup_${hoje}.json`;
  fs.mkdirSync("backups", { recursive: true });
  fs.writeFileSync(nomeArquivo, JSON.stringify(backup, null, 2));
  console.log(`Backup salvo em ${nomeArquivo} (${totalLinhas} linhas no total).`);
}

main().catch((e) => {
  console.error("Backup falhou:", e);
  process.exit(1);
});

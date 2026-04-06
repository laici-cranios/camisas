-- Execute este SQL no Supabase > SQL Editor
-- Acesse: https://supabase.com/dashboard/project/uksnsiscbsblegqdenga/sql

CREATE TABLE IF NOT EXISTS pedidos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  itens JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pendente',
  pagamento_confirmado BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

-- Política: qualquer um pode inserir (clientes fazendo pedido)
CREATE POLICY "Permitir inserção pública"
  ON pedidos FOR INSERT
  TO anon
  WITH CHECK (true);

-- Política: qualquer um pode ler (admin visualiza pedidos)
CREATE POLICY "Permitir leitura pública"
  ON pedidos FOR SELECT
  TO anon
  USING (true);

-- Política: qualquer um pode atualizar (admin atualiza status/pagamento)
CREATE POLICY "Permitir atualização pública"
  ON pedidos FOR UPDATE
  TO anon
  USING (true);

-- Política: qualquer um pode deletar (admin exclui pedido)
CREATE POLICY "Permitir exclusão pública"
  ON pedidos FOR DELETE
  TO anon
  USING (true);

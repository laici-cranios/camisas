import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'

// ─── Constantes ────────────────────────────────────────────────
const MODELOS = [
  { id: 'babylook', nome: 'Baby Look', tamanhos: ['P', 'M', 'G', 'GG'] },
  { id: 'tradicional', nome: 'Tradicional', tamanhos: ['P', 'M', 'G', 'GG', 'XG'] },
]
const PRECO = 55
const ADMIN_PIN = '3169'
const CHAVE_PIX = '79988676777'

// ─── Helpers ───────────────────────────────────────────────────
function gerarId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }
function fmtData(ts) { return new Date(ts).toLocaleString('pt-BR') }
function fmtBRL(v) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }

// ─── Componente Principal ──────────────────────────────────────
export default function Home() {
  const [tela, setTela] = useState('cliente')
  const [step, setStep] = useState('form')
  const [pin, setPin] = useState('')
  const [pinErro, setPinErro] = useState(false)
  const [nome, setNome] = useState('')
  const [tel, setTel] = useState('')
  const [email, setEmail] = useState('')
  const [erros, setErros] = useState({})
  const [itens, setItens] = useState({})
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [pedidoAtual, setPedidoAtual] = useState(null)
  const [aba, setAba] = useState('pedidos')
  const [expandido, setExpandido] = useState(null)
  const [busca, setBusca] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [pixModal, setPixModal] = useState(false)
  const [pixCopiado, setPixCopiado] = useState(false)

  // ── Carregar pedidos ──
  const carregarPedidos = useCallback(async () => {
    try {
      const res = await fetch('/api/pedidos')
      if (!res.ok) throw new Error('Erro ao carregar')
      const data = await res.json()
      setPedidos(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregarPedidos() }, [carregarPedidos])

  // ── Helpers de itens ──
  const getQty = (mid, tam) => itens[mid + '-' + tam] || 0
  const totalItens = () => Object.values(itens).reduce((a, b) => a + b, 0)
  const totalValor = () => totalItens() * PRECO

  // ── Validação ──
  const validarForm = () => {
    const e = {}
    if (!nome.trim()) e.nome = 'Nome é obrigatório'
    if (!tel.trim()) e.tel = 'Telefone é obrigatório'
    if (tel && !/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/.test(tel.replace(/\s/g, ''))) e.tel = 'Telefone inválido'
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'E-mail inválido'
    setErros(e)
    return Object.keys(e).length === 0
  }

  // ── Confirmar pedido ──
  const confirmarPedido = async () => {
    if (totalItens() === 0) return
    setSubmitLoading(true)
    const itensList = []
    MODELOS.forEach(m => m.tamanhos.forEach(t => {
      const q = getQty(m.id, t)
      if (q > 0) itensList.push({ modelo: m.nome, modeloId: m.id, tamanho: t, quantidade: q })
    }))
    const novo = {
      id: gerarId(),
      nome,
      telefone: tel,
      email,
      itens: itensList,
      status: 'pendente',
      pagamento_confirmado: false,
    }
    try {
      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novo),
      })
      const saved = await res.json()
      setPedidos(prev => [saved, ...prev])
      setPedidoAtual(saved)
      setStep('sucesso')
      setPixModal(true)
    } catch (e) {
      alert('Erro ao salvar pedido. Tente novamente.')
    } finally {
      setSubmitLoading(false)
    }
  }

  // ── Atualizar pedido ──
  const atualizarPedido = async (id, updates) => {
    try {
      const res = await fetch(`/api/pedidos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const updated = await res.json()
      setPedidos(prev => prev.map(p => p.id === id ? updated : p))
    } catch (e) { console.error(e) }
  }

  // ── Deletar pedido ──
  const deletarPedido = async (id) => {
    if (!confirm('Remover este pedido?')) return
    try {
      await fetch(`/api/pedidos/${id}`, { method: 'DELETE' })
      setPedidos(prev => prev.filter(p => p.id !== id))
    } catch (e) { console.error(e) }
  }

  // ── Copiar PIX ──
  const copiarPix = () => {
    navigator.clipboard.writeText(CHAVE_PIX).catch(() => {
      const el = document.createElement('textarea')
      el.value = CHAVE_PIX
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    })
    setPixCopiado(true)
    setTimeout(() => setPixCopiado(false), 3000)
  }

  // ── Novo pedido ──
  const novoPedido = () => {
    setNome(''); setTel(''); setEmail(''); setItens({})
    setErros({}); setPedidoAtual(null); setStep('form')
    setPixModal(false); setPixCopiado(false)
  }

  // ── Ajustar quantidade ──
  const ajustarQty = (mid, tam, action) => {
    const key = mid + '-' + tam
    const cur = itens[key] || 0
    const novoVal = action === 'inc' ? cur + 1 : Math.max(0, cur - 1)
    setItens(prev => ({ ...prev, [key]: novoVal }))
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  const Banner = () => (
    <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
      <img
        src="/banner.jpg"
        alt="Nossa Senhora do Rosário"
        style={{ width: '100%', display: 'block', maxHeight: 140, objectFit: 'cover', objectPosition: 'center' }}
      />
    </div>
  )

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #ddd', borderTop: '3px solid #c8402a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#888', marginTop: 16 }}>Carregando...</p>
    </div>
  )

  return (
    <>
      <Head>
        <title>Pedido de Camisas — Nossa Senhora do Rosário</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#f5f0e8" />
      </Head>

      {/* ── Modal PIX ── */}
      {pixModal && pedidoAtual && (() => {
        const totPecas = pedidoAtual.itens.reduce((a, b) => a + b.quantidade, 0)
        const valor = totPecas * PRECO
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
            <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '32px 24px 48px', width: '100%', maxWidth: 560, textAlign: 'center', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)', animation: 'slideUp 0.3s ease' }}>
              <div style={{ width: 48, height: 4, background: '#ddd', borderRadius: 2, margin: '0 auto 24px' }} />
              <div style={{ fontSize: '2.8rem', marginBottom: 8 }}>🎉</div>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: 2, color: '#1a1a1a', marginBottom: 4 }}>Pedido Confirmado!</h2>
              <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: 20 }}>Realize o pagamento via PIX</p>
              <div style={{ background: 'linear-gradient(135deg,#f0faf5,#e8f7f0)', border: '2px solid #2e7d55', borderRadius: 16, padding: 20, marginBottom: 20 }}>
                <div style={{ fontSize: '0.78rem', color: '#2e7d55', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>💰 Valor Total a Pagar</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.8rem', color: '#1a1a1a', lineHeight: 1, marginBottom: 4 }}>{fmtBRL(valor)}</div>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>{totPecas} peça{totPecas > 1 ? 's' : ''} × R$ 55,00</div>
              </div>
              <div style={{ background: '#f5f0e8', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Chave PIX (Celular)</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', color: '#c8402a', letterSpacing: 2 }}>{CHAVE_PIX}</div>
              </div>
              <button onClick={copiarPix} style={{ width: '100%', padding: 15, background: '#c8402a', color: '#fff', border: 'none', borderRadius: 12, fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: 2, cursor: 'pointer', marginBottom: 12 }}>
                {pixCopiado ? '✅ CHAVE COPIADA!' : '📋 COPIAR CHAVE PIX'}
              </button>
              <button onClick={() => setPixModal(false)} style={{ width: '100%', padding: 13, background: 'none', border: '1.5px solid #ddd', borderRadius: 12, fontSize: '0.9rem', color: '#666', cursor: 'pointer' }}>Fechar</button>
            </div>
          </div>
        )
      })()}

      {/* ── Modal PIN ── */}
      {tela === 'pinModal' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '36px 28px', width: 'min(360px, 90vw)', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔐</div>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: 2, marginBottom: 6 }}>Acesso Admin</h2>
            <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 20 }}>Digite o PIN para continuar</p>
            <input
              type="password" maxLength={6} value={pin}
              onChange={e => { setPin(e.target.value); setPinErro(false) }}
              onKeyDown={e => { if (e.key === 'Enter') { if (pin === ADMIN_PIN) { setTela('admin'); setPin(''); setPinErro(false) } else setPinErro(true) } }}
              placeholder="••••"
              style={{ width: '100%', padding: 14, borderRadius: 10, border: `1.5px solid ${pinErro ? '#e53e3e' : '#ddd'}`, fontSize: '1.5rem', textAlign: 'center', letterSpacing: 8, outline: 'none' }}
            />
            {pinErro && <p style={{ color: '#e53e3e', fontSize: '0.8rem', marginTop: 8 }}>PIN incorreto</p>}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => { setTela('cliente'); setPin(''); setPinErro(false) }} style={{ flex: 1, padding: 12, background: 'none', border: '1.5px solid #ddd', borderRadius: 10, cursor: 'pointer', color: '#555' }}>Cancelar</button>
              <button onClick={() => { if (pin === ADMIN_PIN) { setTela('admin'); setPin(''); setPinErro(false) } else setPinErro(true) }} style={{ flex: 1, padding: 12, background: '#c8402a', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: 2 }}>Entrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tela Cliente ── */}
      {tela === 'cliente' && (
        <div style={{ maxWidth: 560, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Banner />

          {/* Header */}
          <div style={{ background: '#f5f0e8', borderBottom: '2px solid #e2d9cc', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
            <div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.9rem', letterSpacing: 3, color: '#888' }}>PEDIDO DE</div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: 2, color: '#c8402a' }}>CAMISAS</div>
            </div>
            {step === 'form' && (
              <button onClick={() => setTela('pinModal')} style={{ background: 'none', border: '1.5px solid #ccc', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: '0.8rem', color: '#666' }}>⚙️ Admin</button>
            )}
            {step === 'pedido' && (
              <div style={{ fontSize: '0.8rem', color: '#555', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>👤 {nome}</div>
            )}
          </div>

          {/* Step: Form */}
          {step === 'form' && (
            <div style={{ background: '#fff', borderRadius: 16, margin: 16, padding: '24px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', animation: 'fadeIn 0.2s ease' }}>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '1.5px', color: '#1a1a1a', marginBottom: 4 }}>📋 Seus Dados</h2>
              <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 20 }}>Preencha para continuar com o pedido</p>

              {[
                { label: 'Nome completo', req: true, id: 'nome', val: nome, set: setNome, ph: 'Ex: Maria Silva', err: erros.nome },
                { label: 'Telefone / WhatsApp', req: true, id: 'tel', val: tel, set: setTel, ph: '(79) 99999-9999', err: erros.tel },
                { label: 'E-mail', req: false, id: 'email', val: email, set: setEmail, ph: 'maria@email.com', err: erros.email },
              ].map(f => (
                <div key={f.id} style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#444', marginBottom: 6 }}>
                    {f.label} {f.req ? <span style={{ color: '#c8402a' }}>*</span> : <span style={{ color: '#aaa', fontWeight: 400 }}>(opcional)</span>}
                  </label>
                  <input
                    value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${f.err ? '#e53e3e' : '#e2d9cc'}`, fontSize: '0.95rem', outline: 'none', background: '#fafaf7' }}
                  />
                  {f.err && <span style={{ color: '#e53e3e', fontSize: '0.78rem', marginTop: 4, display: 'block' }}>{f.err}</span>}
                </div>
              ))}

              <button onClick={() => { if (validarForm()) setStep('pedido') }} style={{ width: '100%', padding: 13, background: '#c8402a', color: '#fff', border: 'none', borderRadius: 10, fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: 2, cursor: 'pointer', marginTop: 8 }}>
                Escolher Camisas →
              </button>
            </div>
          )}

          {/* Step: Pedido */}
          {step === 'pedido' && (
            <>
              {MODELOS.map(m => (
                <div key={m.id} style={{ background: '#fff', borderRadius: 16, margin: '16px 16px 0', padding: '24px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '1.5px', color: '#1a1a1a', marginBottom: 16 }}>
                    {m.nome === 'Baby Look' ? '👕' : '👔'} {m.nome}
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    {m.tamanhos.map(t => {
                      const q = getQty(m.id, t)
                      const ativo = q > 0
                      return (
                        <div key={t} style={{ border: `2px solid ${ativo ? '#2e7d55' : '#e2d9cc'}`, borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, background: ativo ? '#f0faf5' : '#fafaf7' }}>
                          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', color: ativo ? '#2e7d55' : '#1a1a1a', lineHeight: 1 }}>{t}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <button onClick={() => ajustarQty(m.id, t, 'dec')} style={{ width: 28, height: 28, borderRadius: '50%', border: '1.5px solid #ddd', background: '#f5f0e8', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', minWidth: 24, textAlign: 'center' }}>{q}</span>
                            <button onClick={() => ajustarQty(m.id, t, 'inc')} style={{ width: 28, height: 28, borderRadius: '50%', border: '1.5px solid #ddd', background: '#f5f0e8', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              <div style={{ height: 16 }} />

              {/* Barra inferior com total */}
              <div style={{ background: '#fff', borderTop: '2px solid #e2d9cc', padding: '16px 20px', position: 'sticky', bottom: 0 }}>
                {totalItens() > 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, background: '#f5f0e8', borderRadius: 10, padding: '10px 14px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#666' }}>{totalItens()} peça{totalItens() > 1 ? 's' : ''} selecionada{totalItens() > 1 ? 's' : ''}</span>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', color: '#c8402a' }}>{fmtBRL(totalValor())}</span>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: '#888', display: 'block', marginBottom: 10 }}>Nenhum item selecionado</span>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setStep('form')} style={{ padding: '13px 16px', background: 'none', border: '1.5px solid #ddd', borderRadius: 10, cursor: 'pointer', color: '#555', fontSize: '0.9rem' }}>← Voltar</button>
                  <button
                    onClick={confirmarPedido}
                    disabled={totalItens() === 0 || submitLoading}
                    style={{ flex: 1, padding: 13, background: '#c8402a', color: '#fff', border: 'none', borderRadius: 10, fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: 2, cursor: totalItens() === 0 ? 'not-allowed' : 'pointer', opacity: totalItens() === 0 ? 0.4 : 1 }}>
                    {submitLoading ? 'Salvando...' : '✅ Confirmar Pedido'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Step: Sucesso */}
          {step === 'sucesso' && pedidoAtual && (() => {
            const totPecas = pedidoAtual.itens.reduce((a, b) => a + b.quantidade, 0)
            return (
              <div style={{ background: '#fff', borderRadius: 16, margin: 16, padding: '40px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎉</div>
                <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: '1.5px', color: '#1a1a1a', marginBottom: 4 }}>Pedido Confirmado!</h2>
                <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 20 }}>Obrigado, <strong>{pedidoAtual.nome}</strong>!</p>
                <div style={{ background: '#f5f0e8', borderRadius: 10, padding: 16, marginBottom: 20, textAlign: 'left' }}>
                  {pedidoAtual.itens.map((it, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#555', padding: '5px 0' }}>
                      <span>{it.modelo} — {it.tamanho}</span>
                      <span style={{ fontWeight: 600 }}>{it.quantidade} un.</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.9rem', borderTop: '1px solid #ddd', marginTop: 8, paddingTop: 8 }}>
                    <span>TOTAL</span>
                    <span style={{ color: '#c8402a' }}>{totPecas} un. • {fmtBRL(totPecas * PRECO)}</span>
                  </div>
                </div>
                <button onClick={() => setPixModal(true)} style={{ width: '100%', padding: 15, background: '#2e7d55', color: '#fff', border: 'none', borderRadius: 12, fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: 2, cursor: 'pointer', marginBottom: 10 }}>
                  💳 Ver Dados para Pagamento PIX
                </button>
                <button onClick={novoPedido} style={{ width: '100%', padding: 13, background: '#c8402a', color: '#fff', border: 'none', borderRadius: 10, fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: 2, cursor: 'pointer' }}>
                  Fazer outro pedido
                </button>
              </div>
            )
          })()}
        </div>
      )}

      {/* ── Tela Admin ── */}
      {tela === 'admin' && (() => {
        const filtrados = pedidos.filter(p =>
          p.nome.toLowerCase().includes(busca.toLowerCase()) || p.telefone.includes(busca)
        )
        const totalPedidos = pedidos.length
        const totalPecas = pedidos.reduce((a, p) => a + p.itens.reduce((b, it) => b + it.quantidade, 0), 0)
        const pagos = pedidos.filter(p => p.pagamento_confirmado)
        const valorRecebido = pagos.reduce((a, p) => a + p.itens.reduce((b, it) => b + it.quantidade * PRECO, 0), 0)
        const valorTotal = pedidos.reduce((a, p) => a + p.itens.reduce((b, it) => b + it.quantidade * PRECO, 0), 0)
        const pct = valorTotal > 0 ? Math.round((valorRecebido / valorTotal) * 100) : 0

        const consolidado = {}
        pedidos.forEach(p => p.itens.forEach(it => {
          const k = it.modelo + '||' + it.tamanho
          consolidado[k] = (consolidado[k] || 0) + it.quantidade
        }))
        const totalGeral = Object.values(consolidado).reduce((a, b) => a + b, 0)

        return (
          <div style={{ maxWidth: 560, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header Admin */}
            <div style={{ background: '#1a1a1a', borderBottom: '2px solid #333', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
              <button onClick={() => setTela('cliente')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '0.9rem' }}>← Sair</button>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: 2, color: '#f5f0e8' }}>⚙️ PAINEL ADMIN</div>
              <div style={{ color: '#aaa', fontSize: '0.8rem' }}>{pedidos.length} pedidos</div>
            </div>

            {/* Abas */}
            <div style={{ display: 'flex', background: '#fff', borderBottom: '2px solid #e2d9cc' }}>
              {[
                { id: 'pedidos', label: '📋 Pedidos' },
                { id: 'dashboard', label: '📊 Dashboard' },
                { id: 'producao', label: '🏭 Produção' },
                { id: 'conferencia', label: '✅ Conferência' },
              ].map(a => (
                <button key={a.id} onClick={() => setAba(a.id)} style={{ flex: 1, padding: '12px 4px', border: 'none', background: 'none', fontSize: '0.75rem', cursor: 'pointer', color: aba === a.id ? '#c8402a' : '#888', borderBottom: `3px solid ${aba === a.id ? '#c8402a' : 'transparent'}`, fontWeight: aba === a.id ? 600 : 400 }}>
                  {a.label}
                </button>
              ))}
            </div>

            {/* Aba Pedidos */}
            {aba === 'pedidos' && (
              <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍 Buscar por nome ou telefone..." style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e2d9cc', fontSize: '0.95rem', outline: 'none', background: '#fafaf7', marginBottom: 16 }} />
                {filtrados.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#bbb', padding: '32px 0', fontSize: '0.9rem' }}>Nenhum pedido encontrado</div>
                ) : filtrados.map(p => {
                  const pecas = p.itens.reduce((a, b) => a + b.quantidade, 0)
                  const valor = pecas * PRECO
                  const statusColor = p.status === 'confirmado' ? '#2e7d55' : p.status === 'entregue' ? '#1a5276' : '#c8402a'
                  return (
                    <div key={p.id} style={{ background: '#fff', borderRadius: 12, marginBottom: 10, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                      <div onClick={() => setExpandido(expandido === p.id ? null : p.id)} style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1a1a1a' }}>{p.nome}</div>
                          <div style={{ fontSize: '0.78rem', color: '#999', marginTop: 2 }}>{p.telefone}{p.email ? ' • ' + p.email : ''}</div>
                          <div style={{ fontSize: '0.78rem', color: '#999', marginTop: 1 }}>{fmtData(p.created_at)}</div>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', color: '#fff', fontWeight: 600, textTransform: 'uppercase', background: statusColor }}>{p.status}</span>
                          {p.pagamento_confirmado ? <span style={{ fontSize: '0.72rem', color: '#2e7d55', fontWeight: 600 }}>💰 PAGO</span> : <span style={{ fontSize: '0.72rem', color: '#c8402a' }}>⏳ pendente</span>}
                          <div style={{ fontSize: '0.78rem', color: '#999' }}>{pecas} peças • {fmtBRL(valor)}</div>
                          <div style={{ color: '#aaa', fontSize: '0.8rem' }}>{expandido === p.id ? '▲' : '▼'}</div>
                        </div>
                      </div>
                      {expandido === p.id && (
                        <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f0ebe3' }}>
                          {p.itens.map((it, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#555', padding: '4px 0' }}>
                              <span>{it.modelo} — {it.tamanho}</span><span style={{ fontWeight: 600 }}>{it.quantidade} un.</span>
                            </div>
                          ))}
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: p.pagamento_confirmado ? '#2e7d55' : '#c8402a', marginTop: 12 }}>
                            <input type="checkbox" checked={!!p.pagamento_confirmado} onChange={e => atualizarPedido(p.id, { pagamento_confirmado: e.target.checked })} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#2e7d55' }} />
                            {p.pagamento_confirmado ? '💰 Pagamento confirmado' : '⏳ Aguardando pagamento'}
                          </label>
                          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                            <button onClick={() => atualizarPedido(p.id, { status: 'confirmado' })} style={{ padding: '8px 14px', border: 'none', borderRadius: 8, background: '#2e7d55', color: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}>✅ Confirmado</button>
                            <button onClick={() => atualizarPedido(p.id, { status: 'entregue' })} style={{ padding: '8px 14px', border: 'none', borderRadius: 8, background: '#1a5276', color: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}>📦 Entregue</button>
                            <button onClick={() => deletarPedido(p.id)} style={{ padding: '8px 14px', border: 'none', borderRadius: 8, background: '#e53e3e', color: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}>🗑️ Excluir</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Aba Dashboard */}
            {aba === 'dashboard' && (
              <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  {[
                    { label: 'Total pedidos', val: totalPedidos, color: '#1a1a1a', bg: '#fff' },
                    { label: 'Total peças', val: totalPecas, color: '#1a1a1a', bg: '#fff' },
                  ].map(c => (
                    <div key={c.label} style={{ background: c.bg, borderRadius: 12, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.label}</div>
                      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', color: c.color, lineHeight: 1 }}>{c.val}</div>
                    </div>
                  ))}
                  <div style={{ background: '#2e7d55', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor recebido</div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', lineHeight: 1 }}>{fmtBRL(valorRecebido)}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{pagos.length} de {totalPedidos} pagos</div>
                  </div>
                  <div style={{ background: '#c8402a', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor total</div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', lineHeight: 1 }}>{fmtBRL(valorTotal)}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{pct}% recebido</div>
                  </div>
                </div>
                <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 16 }}>
                  <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Peças por modelo</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {MODELOS.map(m => {
                      const total = pedidos.reduce((a, p) => a + p.itens.filter(it => it.modeloId === m.id).reduce((b, it) => b + it.quantidade, 0), 0)
                      return (
                        <div key={m.id} style={{ background: '#f5f0e8', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                          <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.nome}</div>
                          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', color: '#c8402a', lineHeight: 1 }}>{total}</div>
                          <div style={{ fontSize: '0.72rem', color: '#aaa', marginTop: 4 }}>peças</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Progresso de pagamentos</div>
                  <div style={{ background: '#f0ebe3', borderRadius: 100, height: 10, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ background: '#2e7d55', height: '100%', width: `${pct}%`, borderRadius: 100, transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#888' }}>
                    <span>{pagos.length} pagos</span><span>{totalPedidos - pagos.length} pendentes</span>
                  </div>
                </div>
              </div>
            )}

            {/* Aba Produção */}
            {aba === 'producao' && (
              <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
                <div style={{ background: '#fff', borderRadius: 16, padding: '24px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '1.5px', color: '#1a1a1a', marginBottom: 4 }}>📊 Relatório de Produção</h3>
                  <p style={{ fontSize: '0.82rem', color: '#999', marginBottom: 20 }}>Total consolidado de todos os pedidos</p>
                  {MODELOS.map(m => (
                    <div key={m.id} style={{ marginBottom: 20 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#c8402a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                        {m.nome === 'Baby Look' ? '👕' : '👔'} {m.nome}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {m.tamanhos.map(t => {
                          const qty = consolidado[m.nome + '||' + t] || 0
                          return (
                            <div key={t} style={{ background: '#f5f0e8', borderRadius: 10, padding: '12px 16px', minWidth: 60, textAlign: 'center', opacity: qty === 0 ? 0.35 : 1 }}>
                              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#1a1a1a' }}>{t}</div>
                              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', color: '#c8402a', lineHeight: 1 }}>{qty}</div>
                              <div style={{ fontSize: '0.7rem', color: '#aaa' }}>un.</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', letterSpacing: 1, borderTop: '2px solid #f0ebe3', marginTop: 16, paddingTop: 16 }}>
                    <span>TOTAL GERAL</span><span style={{ color: '#c8402a' }}>{totalGeral} peças</span>
                  </div>
                </div>
              </div>
            )}

            {/* Aba Conferência */}
            {aba === 'conferencia' && (
              <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
                <div style={{ background: '#fff', borderRadius: 16, padding: '24px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '1.5px', color: '#1a1a1a', marginBottom: 4 }}>✅ Lista de Conferência</h3>
                  <p style={{ fontSize: '0.82rem', color: '#999', marginBottom: 12 }}>Marque conforme as camisas forem separadas</p>
                  {pedidos.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#bbb', padding: '32px 0', fontSize: '0.9rem' }}>Nenhum pedido ainda</div>
                  ) : pedidos.map(p => {
                    const pecas = p.itens.map(it => `${it.modelo.replace('Baby Look', 'BL')} ${it.tamanho} (${it.quantidade})`).join(' • ')
                    return (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid #f0ebe3' }}>
                        <input type="checkbox" checked={p.status === 'entregue'} onChange={e => atualizarPedido(p.id, { status: e.target.checked ? 'entregue' : 'confirmado' })} style={{ width: 20, height: 20, cursor: 'pointer', accentColor: '#2e7d55', marginTop: 2 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem', ...(p.status === 'entregue' ? { textDecoration: 'line-through', color: '#aaa' } : { color: '#1a1a1a' }) }}>{p.nome}</div>
                          <div style={{ fontSize: '0.78rem', color: '#999', marginTop: 2 }}>{p.telefone}</div>
                          <div style={{ marginTop: 4, fontSize: '0.82rem', color: '#666' }}>{pecas}</div>
                        </div>
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', color: '#fff', fontWeight: 600, background: p.status === 'entregue' ? '#2e7d55' : '#c8402a', alignSelf: 'flex-start' }}>
                          {p.status === 'entregue' ? '✅' : '⏳'}
                        </span>
                      </div>
                    )
                  })}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', letterSpacing: 1, borderTop: '2px solid #f0ebe3', marginTop: 16, paddingTop: 16 }}>
                    <span>Entregues</span>
                    <span style={{ color: '#2e7d55' }}>{pedidos.filter(p => p.status === 'entregue').length} / {pedidos.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })()}
    </>
  )
}

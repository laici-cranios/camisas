import { supabase } from '../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const pedido = req.body
    const { data, error } = await supabase
      .from('pedidos')
      .insert([pedido])
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  res.status(405).json({ error: 'Method not allowed' })
}

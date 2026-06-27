import { supabase } from '../lib/supabase';

async function invokeFunction(name, body = {}) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw new Error(error.message || `Edge Function "${name}" failed`);
  return data;
}

export const api = {
  async getDeals(category) {
    let query = supabase
      .from('deals')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(50);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  },

  async searchDeals(q) {
    if (!q) return [];
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .ilike('title', `%${q}%`)
      .order('published_at', { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data;
  },

  fetchNow() {
    return invokeFunction('fetch-deals');
  },

  async getWatchlist() {
    const { data, error } = await supabase
      .from('watchlist')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },

  async addWatchlistItem(item) {
    const { data, error } = await supabase
      .from('watchlist')
      .insert({
        keyword: item.keyword,
        target_price: item.target_price || null,
        category: item.category || null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateWatchlistItem(id, updates) {
    const { data, error } = await supabase
      .from('watchlist')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async deleteWatchlistItem(id) {
    const { error } = await supabase.from('watchlist').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { message: 'Deleted' };
  },

  async getSettings() {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single();
    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data || { notification_email: null };
  },

  async updateSettings(settings) {
    const { data, error } = await supabase
      .from('settings')
      .update({ notification_email: settings.notification_email || null })
      .eq('id', 1)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  searchColes(q) {
    return invokeFunction('search-coles', { query: q });
  },

  compareSearch(q) {
    return invokeFunction('compare-search', { query: q });
  },
};

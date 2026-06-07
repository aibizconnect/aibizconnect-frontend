import { supabase } from '@/lib/supabase'

export const db = {
  users: {
    all: () => supabase.from('users').select('*'),
    find: (id: string) =>
      supabase.from('users').select('*').eq('id', id).single(),
    create: (payload: any) => supabase.from('users').insert(payload),
  },

  businesses: {
    all: () => supabase.from('businesses').select('*'),
    find: (id: string) =>
      supabase.from('businesses').select('*').eq('id', id).single(),
    create: (payload: any) => supabase.from('businesses').insert(payload),
  },

  clients: {
    all: () => supabase.from('clients').select('*'),
    find: (id: string) =>
      supabase.from('clients').select('*').eq('id', id).single(),
    create: (payload: any) => supabase.from('clients').insert(payload),
  },

  appointments: {
    all: () => supabase.from('appointments').select('*'),
    find: (id: string) =>
      supabase.from('appointments').select('*').eq('id', id).single(),
    create: (payload: any) => supabase.from('appointments').insert(payload),
  },

  messages: {
    all: () => supabase.from('messages').select('*'),
    find: (id: string) =>
      supabase.from('messages').select('*').eq('id', id).single(),
    create: (payload: any) => supabase.from('messages').insert(payload),
  },

  ai_logs: {
    all: () => supabase.from('ai_logs').select('*'),
    find: (id: string) =>
      supabase.from('ai_logs').select('*').eq('id', id).single(),
    create: (payload: any) => supabase.from('ai_logs').insert(payload),
  },
}

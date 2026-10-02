import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  /** undefined mientras se comprueba la sesión guardada. */
  session: Session | null | undefined
  signOut: () => Promise<void>
}
const Ctx = createContext<AuthState>({ session: undefined, signOut: async () => {} })
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null)
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  const signOut = async () => { await supabase?.auth.signOut() }
  return <Ctx.Provider value={{ session, signOut }}>{children}</Ctx.Provider>
}

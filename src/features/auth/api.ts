import * as Linking from "expo-linking";

import { requireSupabase } from "@/src/lib/supabase";

export async function signInWithPassword(email: string, password: string) {
  const client = requireSupabase();
  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }
}

export async function signUpWithPassword(email: string, password: string) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: Linking.createURL("/sign-in"),
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function resetPassword(email: string) {
  const client = requireSupabase();
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: Linking.createURL("/sign-in"),
  });

  if (error) {
    throw error;
  }
}

export async function signOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();

  if (error) {
    throw error;
  }
}

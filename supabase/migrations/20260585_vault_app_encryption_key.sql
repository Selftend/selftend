-- Enable Supabase Vault and create the single app field-encryption key.
-- Vault's root key is held OUTSIDE the database, so a logical dump exposes only
-- the encrypted secret, never the usable key.
create extension if not exists supabase_vault with schema vault;

-- Create the key once (idempotent on name). 32 random bytes, base64-encoded.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'app_field_encryption_key') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'base64'),
      'app_field_encryption_key',
      'Symmetric key for provider-recoverable field encryption'
    );
  end if;
end;
$$;

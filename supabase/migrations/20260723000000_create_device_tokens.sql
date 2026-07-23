-- Criar tabela de tokens
create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  token text not null,
  platform text not null check (platform in ('android', 'ios', 'web')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_user_token unique (user_id, token)
);

-- Habilitar RLS
alter table public.device_tokens enable row level security;

-- Políticas de segurança
create policy "Permitir leitura apenas dos próprios tokens"
  on public.device_tokens for select
  using (auth.uid() = user_id);

create policy "Permitir inserção dos próprios tokens"
  on public.device_tokens for insert
  with check (auth.uid() = user_id);

create policy "Permitir deleção dos próprios tokens"
  on public.device_tokens for delete
  using (auth.uid() = user_id);

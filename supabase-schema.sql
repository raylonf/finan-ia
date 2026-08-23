-- ========================================
-- Finan IA - Schema do Supabase
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- ========================================

-- Tabela de configurações do usuário (token da IA, preferências)
create table if not exists user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  api_key text default '',
  ai_provider text default 'gemini' check (ai_provider in ('gemini', 'openai')),
  ai_model text default 'gemini-3.6-flash',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabela de transações (receitas e despesas)
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  date timestamptz not null default now(),
  created_at timestamptz default now()
);

-- Tabela de mensagens do chat
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  timestamp timestamptz default now()
);

-- Índices para performance
create index if not exists idx_transactions_user_id on transactions(user_id);
create index if not exists idx_transactions_date on transactions(user_id, date desc);
create index if not exists idx_messages_user_id on messages(user_id, timestamp asc);

-- RLS (Row Level Security) - cada usuário só vê seus próprios dados
alter table user_settings enable row level security;
alter table transactions enable row level security;
alter table messages enable row level security;

-- Policies: user_settings
create policy "Users can view own settings"
  on user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on user_settings for update
  using (auth.uid() = user_id);

-- Policies: transactions
create policy "Users can view own transactions"
  on transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own transactions"
  on transactions for update
  using (auth.uid() = user_id);

create policy "Users can delete own transactions"
  on transactions for delete
  using (auth.uid() = user_id);

-- Policies: messages
create policy "Users can view own messages"
  on messages for select
  using (auth.uid() = user_id);

create policy "Users can insert own messages"
  on messages for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own messages"
  on messages for delete
  using (auth.uid() = user_id);

-- Função para criar settings automaticamente ao cadastrar
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_settings (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: cria settings quando novo usuário se cadastra
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

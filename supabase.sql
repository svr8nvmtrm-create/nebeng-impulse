-- Jalankan di Supabase > SQL Editor

create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  password_hash text not null,
  created_at timestamptz default now()
);

create table servers (
  id serial primary key,
  name text not null,
  description text default '',
  price integer not null,          -- rupiah
  active boolean default true
);

create table stock (
  id serial primary key,
  server_id integer references servers(id) on delete cascade,
  account_text text not null,      -- isi akun yang diberikan ke pembeli
  order_id uuid,                   -- null = belum terjual
  created_at timestamptz default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  server_id integer references servers(id),
  amount integer not null,
  status text default 'pending',   -- pending | paid | paid_nostock | failed
  qr_url text,
  reference text,
  account_text text,
  created_at timestamptz default now()
);

-- Ambil 1 stok secara atomik (anti dobel)
create or replace function claim_stock(p_server int, p_order uuid)
returns text language plpgsql as $$
declare v_id int; v_text text;
begin
  select id, account_text into v_id, v_text
  from stock where server_id = p_server and order_id is null
  order by id limit 1 for update skip locked;
  if v_id is null then return null; end if;
  update stock set order_id = p_order where id = v_id;
  return v_text;
end $$;

-- Contoh data
insert into servers (name, description, price) values
 ('Server SG-1', 'Singapore, stabil', 5000),
 ('Server ID-1', 'Indonesia, ping rendah', 7000);

insert into stock (server_id, account_text) values
 (1, E'Host: sg1.contoh.com\nUser: demo1\nPass: rahasia1'),
 (1, E'Host: sg1.contoh.com\nUser: demo2\nPass: rahasia2'),
 (2, E'Host: id1.contoh.com\nUser: demo3\nPass: rahasia3');

-- Keamanan: semua akses lewat API (service key), blokir akses publik
alter table users enable row level security;
alter table servers enable row level security;
alter table stock enable row level security;
alter table orders enable row level security;

-- הריצו פעם אחת ב-Supabase → SQL Editor
create table if not exists kv (
  key text primary key,
  value jsonb not null,
  version bigint not null default 0
);

create table if not exists rate_limits (
  key text primary key,
  count int not null,
  reset_at timestamptz not null
);

-- מונה בקשות אטומי: מוסיף n (0 = קריאה בלבד) ומחזיר את הספירה בחלון הנוכחי
create or replace function rl_hit(k text, add int, window_ms int) returns int
language plpgsql as $$
declare c int;
begin
  if add = 0 then
    select count into c from rate_limits where key = k and reset_at > now();
    return coalesce(c, 0);
  end if;
  insert into rate_limits as r (key, count, reset_at)
  values (k, add, now() + make_interval(secs => window_ms / 1000.0))
  on conflict (key) do update set
    count = case when r.reset_at > now() then r.count + add else add end,
    reset_at = case when r.reset_at > now() then r.reset_at else now() + make_interval(secs => window_ms / 1000.0) end
  returning r.count into c;
  return c;
end $$;

-- הגישה היא רק מהשרת עם service role; חוסמים גישה ציבורית
alter table kv enable row level security;
alter table rate_limits enable row level security;

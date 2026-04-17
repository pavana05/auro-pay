-- Create public bucket for cached OG referral images
insert into storage.buckets (id, name, public)
values ('og-cache', 'og-cache', true)
on conflict (id) do nothing;

-- Public read (anyone, including social crawlers, can fetch images)
create policy "Public read og-cache"
on storage.objects for select
to public
using (bucket_id = 'og-cache');

-- Only service role writes (edge function uses service role key) — no public insert/update/delete policies needed

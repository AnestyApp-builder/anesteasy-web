-- Adiciona campos para armazenar vagas compradas que ainda não foram alocadas a um grupo
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS available_standard_seats INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS available_coord_seats INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.users.available_standard_seats IS 'Quantidade de licenças Standard (Anestesistas extras) pagas que ainda não foram transferidas para um grupo';
COMMENT ON COLUMN public.users.available_coord_seats IS 'Quantidade de licenças Coord (Secretárias extras) pagas que ainda não foram transferidas para um grupo';

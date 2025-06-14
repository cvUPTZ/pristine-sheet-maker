
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='matches' AND column_name='home_team_flag_url') THEN
    ALTER TABLE "public"."matches" ADD COLUMN "home_team_flag_url" text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='matches' AND column_name='away_team_flag_url') THEN
    ALTER TABLE "public"."matches" ADD COLUMN "away_team_flag_url" text;
  END IF;
END $$;

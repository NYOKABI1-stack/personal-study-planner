CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 100)
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_read_own ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE FUNCTION public.create_planner_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.profiles(id, display_name) VALUES (NEW.id, left(coalesce(nullif(btrim(NEW.raw_user_meta_data->>'display_name'), ''), 'Learner'),100));
 RETURN NEW;
END; $$;
CREATE TRIGGER planner_profile_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_planner_profile();
CREATE TABLE public.study_plans (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 saved jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_plans TO authenticated;
GRANT ALL ON public.study_plans TO service_role;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY plans_read_own ON public.study_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY plans_insert_own ON public.study_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY plans_update_own ON public.study_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY plans_delete_own ON public.study_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE FUNCTION public.validate_planner_save() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE t jsonb; h jsonb; v jsonb; i jsonb;
BEGIN
 i := NEW.saved->'input';
 IF pg_column_size(NEW.saved) > 200000 OR jsonb_typeof(NEW.saved) IS DISTINCT FROM 'object' OR jsonb_typeof(i) IS DISTINCT FROM 'object' OR jsonb_typeof(NEW.saved->'done') IS DISTINCT FROM 'object' OR jsonb_typeof(NEW.saved->'isExample') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Invalid study plan'; END IF;
 IF jsonb_typeof(i->'examName') IS DISTINCT FROM 'string' OR length(i->>'examName') > 100 OR coalesce(i->>'startDate','') !~ '^\d{4}-\d{2}-\d{2}$' OR coalesce(i->>'examDate','') !~ '^\d{4}-\d{2}-\d{2}$' OR coalesce(i->>'sessionMinutes','') NOT IN ('30','45','60','90') THEN RAISE EXCEPTION 'Invalid plan inputs'; END IF;
 IF jsonb_typeof(i->'weeklyHours') IS DISTINCT FROM 'array' OR jsonb_array_length(i->'weeklyHours') <> 7 OR jsonb_typeof(i->'topics') IS DISTINCT FROM 'array' OR jsonb_array_length(i->'topics') > 100 THEN RAISE EXCEPTION 'Invalid plan inputs'; END IF;
 FOR h IN SELECT value FROM jsonb_array_elements(i->'weeklyHours') LOOP
 IF jsonb_typeof(h) <> 'number' OR h::text::numeric < 0 OR h::text::numeric > 16 THEN RAISE EXCEPTION 'Hours must be between 0 and 16'; END IF; END LOOP;
 FOR t IN SELECT value FROM jsonb_array_elements(i->'topics') LOOP
 IF jsonb_typeof(t->'id') IS DISTINCT FROM 'string' OR length(t->>'id') NOT BETWEEN 1 AND 100 OR jsonb_typeof(t->'name') IS DISTINCT FROM 'string' OR length(t->>'name') > 300 OR coalesce(t->>'weight','') NOT IN ('light','normal','heavy') OR coalesce(t->>'confidence','') NOT IN ('1','2','3','4','5') OR (t ? 'group' AND (jsonb_typeof(t->'group') <> 'string' OR length(t->>'group') > 150)) THEN RAISE EXCEPTION 'Invalid topic'; END IF; END LOOP;
 FOR v IN SELECT value FROM jsonb_each(NEW.saved->'done') LOOP IF jsonb_typeof(v) <> 'boolean' THEN RAISE EXCEPTION 'Invalid progress'; END IF; END LOOP;
 NEW.updated_at := now(); RETURN NEW;
END; $$;
CREATE TRIGGER validate_study_plan BEFORE INSERT OR UPDATE ON public.study_plans FOR EACH ROW EXECUTE FUNCTION public.validate_planner_save();
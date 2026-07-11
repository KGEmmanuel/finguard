
-- Convert has_role from SECURITY DEFINER to SECURITY INVOKER.
-- All call sites pass auth.uid() as _user_id, and the user_roles RLS policy
-- ("user_roles readable self or ciso") lets the current user read their own
-- rows, so invoker rights are sufficient. This clears linter 0029 without
-- weakening security — an attacker cannot use has_role() to probe other
-- users' roles because RLS filters user_roles by auth.uid().

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

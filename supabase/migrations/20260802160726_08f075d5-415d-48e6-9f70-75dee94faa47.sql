CREATE POLICY "Backend service can read automation secrets"
ON public.automation_secrets
FOR SELECT
TO service_role
USING (true);
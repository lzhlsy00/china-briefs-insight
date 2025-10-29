-- Fix function search path for update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Add missing RLS policies for user_roles table
-- Only service role/triggers can insert roles (users cannot self-assign)
CREATE POLICY "Service role can insert user roles"
ON public.user_roles
FOR INSERT
TO service_role
WITH CHECK (true);

-- Admins can update user roles
CREATE POLICY "Admins can update user roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete user roles
CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add missing RLS policies for subscriptions table
-- Only service role can insert subscriptions (via Stripe webhooks/edge functions)
CREATE POLICY "Service role can insert subscriptions"
ON public.subscriptions
FOR INSERT
TO service_role
WITH CHECK (true);

-- Service role can also delete if needed
CREATE POLICY "Service role can delete subscriptions"
ON public.subscriptions
FOR DELETE
TO service_role
USING (true);

-- Update default downloads_limit from 20 to 10 (Starter default)
ALTER TABLE public.subscriptions ALTER COLUMN downloads_limit SET DEFAULT 10;

-- Update existing subscriptions to new limits
UPDATE public.subscriptions SET downloads_limit = 10 WHERE plan = 'starter' AND downloads_limit = 20;
UPDATE public.subscriptions SET downloads_limit = 17 WHERE plan = 'pro' AND downloads_limit = 100;
UPDATE public.subscriptions SET downloads_limit = 27 WHERE plan = 'master' AND downloads_limit = -1;

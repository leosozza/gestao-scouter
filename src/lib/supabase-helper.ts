// Temporary wrapper to bypass TypeScript errors until migrations are run
import { supabase as baseSupabase } from '@/integrations/supabase/client';

export const supabase = baseSupabase as any;

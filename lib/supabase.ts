
import { createClient } from '@supabase/supabase-js';

// REPLACE THESE WITH YOUR ACTUAL SUPABASE PROJECT DETAILS
const SUPABASE_URL = 'https://vkcgcrwxippesquiibko.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_hiohHuDbffWMxHxUKyxtHA_xrPCCZqx';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

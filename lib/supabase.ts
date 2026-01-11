
import { createClient } from '@supabase/supabase-js';

// REPLACE THESE WITH YOUR ACTUAL SUPABASE PROJECT DETAILS
const SUPABASE_URL = 'https://vkcgcrwxippesquiibko.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_0XhDX7nNvcx6RrQbJIBU1g_bNIsjfcf';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

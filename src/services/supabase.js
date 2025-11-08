import { createClient } from '@supabase/supabase-js';
 
const supabaseUrl = 'https://nibytjdxcezvzsfizvpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pYnl0amR4Y2V6dnpzZml6dnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1ODI4MjgsImV4cCI6MjA3NTE1ODgyOH0.0gNr7VkGRVRFIAMV-AtB3OgtE2bixO9FrsHzchmlI5c';
 
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
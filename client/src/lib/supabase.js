import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://uqnyphmjzxfnwtqdetyw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxbnlwaG1qenhmbnd0cWRldHl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MzI0MjYsImV4cCI6MjA5ODEwODQyNn0.gAEkCPOrbHVLVzXAPpxf0lr2G6CvJ7jcXdARJq471d0'
);

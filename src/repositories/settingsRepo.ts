import { supabase } from '@/integrations/supabase/client';
import type { AppSettings } from './types';

/**
 * Get application settings from Supabase.
 * Returns the first settings row or null if none exists.
 */
export async function getAppSettings(): Promise<AppSettings | null> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching app settings:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getAppSettings:', error);
    return null;
  }
}

/**
 * Save application settings to Supabase.
 * Uses upsert to update existing settings or create new ones.
 */
export async function saveAppSettings(settings: Omit<AppSettings, 'id' | 'updated_at'>): Promise<AppSettings | null> {
  try {
    // First, try to get existing settings to update
    const existing = await getAppSettings();
    
    if (existing) {
      // Update existing settings
      const { data, error } = await supabase
        .from('app_settings')
        .update(settings)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating app settings:', error);
        return null;
      }

      return data;
    } else {
      // Insert new settings
      const { data, error } = await supabase
        .from('app_settings')
        .insert([settings])
        .select()
        .single();

      if (error) {
        console.error('Error inserting app settings:', error);
        return null;
      }

      return data;
    }
  } catch (error) {
    console.error('Error in saveAppSettings:', error);
    return null;
  }
}
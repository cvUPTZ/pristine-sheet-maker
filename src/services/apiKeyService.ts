
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export class ApiKeyService {
  private static instance: ApiKeyService;

  static getInstance(): ApiKeyService {
    if (!ApiKeyService.instance) {
      ApiKeyService.instance = new ApiKeyService();
    }
    return ApiKeyService.instance;
  }

  async getYouTubeApiKey(): Promise<string | null> {
    try {
      const { data: userData, error } = await supabase.auth.getUser();
      
      if (error || !userData.user) {
        toast.error('User not authenticated. Please log in.');
        return null;
      }

      const key = userData.user.user_metadata?.youtube_api_key;
      if (!key) {
        toast.error('YouTube API key not found. Please configure it in Settings.');
        return null;
      }
      return key;
    } catch (error) {
      console.error('Error getting YouTube API key:', error);
      toast.error('Failed to retrieve YouTube API key');
      return null;
    }
  }

  async getGoogleColabApiKey(): Promise<string | null> {
    try {
      const { data: userData, error } = await supabase.auth.getUser();
      
      if (error || !userData.user) {
        toast.error('User not authenticated. Please log in.');
        return null;
      }

      const key = userData.user.user_metadata?.google_colab_api_key;
      if (!key) {
        toast.error('Google Colab API key not found. Please configure it in Settings.');
        return null;
      }
      return key;
    } catch (error) {
      console.error('Error getting Google Colab API key:', error);
      toast.error('Failed to retrieve Google Colab API key');
      return null;
    }
  }

  async getRoboflowApiKey(): Promise<string | null> {
    try {
      const { data: userData, error } = await supabase.auth.getUser();
      
      if (error || !userData.user) {
        toast.error('User not authenticated. Please log in.');
        return null;
      }

      const key = userData.user.user_metadata?.roboflow_api_key;
      if (!key) {
        toast.error('Roboflow API key not found. Please configure it in Settings.');
        return null;
      }
      return key;
    } catch (error) {
      console.error('Error getting Roboflow API key:', error);
      toast.error('Failed to retrieve Roboflow API key');
      return null;
    }
  }

  async hasYouTubeApiKey(): Promise<boolean> {
    try {
      const { data: userData, error } = await supabase.auth.getUser();
      return !error && !!userData.user?.user_metadata?.youtube_api_key;
    } catch (error) {
      console.error('Error checking YouTube API key:', error);
      return false;
    }
  }

  async hasGoogleColabApiKey(): Promise<boolean> {
    try {
      const { data: userData, error } = await supabase.auth.getUser();
      return !error && !!userData.user?.user_metadata?.google_colab_api_key;
    } catch (error) {
      console.error('Error checking Google Colab API key:', error);
      return false;
    }
  }

  async hasRoboflowApiKey(): Promise<boolean> {
    try {
      const { data: userData, error } = await supabase.auth.getUser();
      return !error && !!userData.user?.user_metadata?.roboflow_api_key;
    } catch (error) {
      console.error('Error checking Roboflow API key:', error);
      return false;
    }
  }

  validateApiKey(keyType: 'youtube' | 'googleColab' | 'roboflow', key: string): boolean {
    switch (keyType) {
      case 'youtube':
        return key.startsWith('AIza') && key.length >= 35;
      case 'googleColab':
        return key.includes('ya29') || key.includes('oauth');
      case 'roboflow':
        return key.startsWith('rf_') && key.length >= 20;
      default:
        return false;
    }
  }

  // Method to check if all required keys are available for a feature
  async hasRequiredKeysForFeature(feature: 'youtube-download' | 'colab-processing' | 'roboflow-detection'): Promise<boolean> {
    switch (feature) {
      case 'youtube-download':
        return await this.hasYouTubeApiKey();
      case 'colab-processing':
        return await this.hasGoogleColabApiKey();
      case 'roboflow-detection':
        return await this.hasRoboflowApiKey();
      default:
        return false;
    }
  }

  // Method to get missing keys for a feature
  async getMissingKeysForFeature(feature: 'youtube-download' | 'colab-processing' | 'roboflow-detection'): Promise<string[]> {
    const missing: string[] = [];
    
    switch (feature) {
      case 'youtube-download':
        if (!(await this.hasYouTubeApiKey())) missing.push('YouTube API');
        break;
      case 'colab-processing':
        if (!(await this.hasGoogleColabApiKey())) missing.push('Google Colab API');
        break;
      case 'roboflow-detection':
        if (!(await this.hasRoboflowApiKey())) missing.push('Roboflow API');
        break;
    }
    
    return missing;
  }
}

export const apiKeyService = ApiKeyService.getInstance();

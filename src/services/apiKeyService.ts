
import { toast } from 'sonner';

export class ApiKeyService {
  private static instance: ApiKeyService;

  static getInstance(): ApiKeyService {
    if (!ApiKeyService.instance) {
      ApiKeyService.instance = new ApiKeyService();
    }
    return ApiKeyService.instance;
  }

  getYouTubeApiKey(): string | null {
    const key = localStorage.getItem('youtube_api_key');
    if (!key) {
      toast.error('YouTube API key not found. Please configure it in Settings.');
      return null;
    }
    return key;
  }

  getGoogleColabApiKey(): string | null {
    const key = localStorage.getItem('google_colab_api_key');
    if (!key) {
      toast.error('Google Colab API key not found. Please configure it in Settings.');
      return null;
    }
    return key;
  }

  getRoboflowApiKey(): string | null {
    const key = localStorage.getItem('roboflow_api_key');
    if (!key) {
      toast.error('Roboflow API key not found. Please configure it in Settings.');
      return null;
    }
    return key;
  }

  hasYouTubeApiKey(): boolean {
    return !!localStorage.getItem('youtube_api_key');
  }

  hasGoogleColabApiKey(): boolean {
    return !!localStorage.getItem('google_colab_api_key');
  }

  hasRoboflowApiKey(): boolean {
    return !!localStorage.getItem('roboflow_api_key');
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
  hasRequiredKeysForFeature(feature: 'youtube-download' | 'colab-processing' | 'roboflow-detection'): boolean {
    switch (feature) {
      case 'youtube-download':
        return this.hasYouTubeApiKey();
      case 'colab-processing':
        return this.hasGoogleColabApiKey();
      case 'roboflow-detection':
        return this.hasRoboflowApiKey();
      default:
        return false;
    }
  }

  // Method to get missing keys for a feature
  getMissingKeysForFeature(feature: 'youtube-download' | 'colab-processing' | 'roboflow-detection'): string[] {
    const missing: string[] = [];
    
    switch (feature) {
      case 'youtube-download':
        if (!this.hasYouTubeApiKey()) missing.push('YouTube API');
        break;
      case 'colab-processing':
        if (!this.hasGoogleColabApiKey()) missing.push('Google Colab API');
        break;
      case 'roboflow-detection':
        if (!this.hasRoboflowApiKey()) missing.push('Roboflow API');
        break;
    }
    
    return missing;
  }
}

export const apiKeyService = ApiKeyService.getInstance();

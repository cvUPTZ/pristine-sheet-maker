
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Key, Eye, EyeOff, Save, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState({
    youtube: '',
    googleColab: '',
    roboflow: ''
  });
  const [showKeys, setShowKeys] = useState({
    youtube: false,
    googleColab: false,
    roboflow: false
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState({
    youtube: false,
    googleColab: false,
    roboflow: false
  });

  useEffect(() => {
    if (user) {
      loadApiKeys();
    }
  }, [user]);

  const loadApiKeys = async () => {
    if (!user) return;

    try {
      // Load API keys from Supabase user metadata
      const { data: userData, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Error loading user data:', error);
        return;
      }

      const userMetadata = userData.user?.user_metadata || {};
      
      setApiKeys({
        youtube: userMetadata.youtube_api_key || '',
        googleColab: userMetadata.google_colab_api_key || '',
        roboflow: userMetadata.roboflow_api_key || ''
      });
      
      // Check which keys are saved
      setSaved({
        youtube: !!userMetadata.youtube_api_key,
        googleColab: !!userMetadata.google_colab_api_key,
        roboflow: !!userMetadata.roboflow_api_key
      });
    } catch (error) {
      console.error('Error loading API keys:', error);
      toast.error('Failed to load API keys');
    }
  };

  const saveApiKey = async (keyType: keyof typeof apiKeys) => {
    const keyValue = apiKeys[keyType];
    
    if (!keyValue.trim()) {
      toast.error('Please enter a valid API key');
      return;
    }

    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    setLoading(true);
    
    try {
      // Store in Supabase user metadata
      const metadataKey = `${keyType === 'youtube' ? 'youtube' : keyType === 'googleColab' ? 'google_colab' : 'roboflow'}_api_key`;
      
      const { error } = await supabase.auth.updateUser({
        data: {
          [metadataKey]: keyValue
        }
      });

      if (error) {
        throw error;
      }

      setSaved(prev => ({ ...prev, [keyType]: true }));
      toast.success(`${keyType.charAt(0).toUpperCase() + keyType.slice(1)} API key saved securely`);
    } catch (error) {
      console.error('Error saving API key:', error);
      toast.error('Failed to save API key');
    } finally {
      setLoading(false);
    }
  };

  const clearApiKey = async (keyType: keyof typeof apiKeys) => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    setLoading(true);

    try {
      const metadataKey = `${keyType === 'youtube' ? 'youtube' : keyType === 'googleColab' ? 'google_colab' : 'roboflow'}_api_key`;
      
      const { error } = await supabase.auth.updateUser({
        data: {
          [metadataKey]: null
        }
      });

      if (error) {
        throw error;
      }

      setApiKeys(prev => ({ ...prev, [keyType]: '' }));
      setSaved(prev => ({ ...prev, [keyType]: false }));
      toast.success(`${keyType.charAt(0).toUpperCase() + keyType.slice(1)} API key removed`);
    } catch (error) {
      console.error('Error clearing API key:', error);
      toast.error('Failed to clear API key');
    } finally {
      setLoading(false);
    }
  };

  const toggleShowKey = (keyType: keyof typeof showKeys) => {
    setShowKeys(prev => ({ ...prev, [keyType]: !prev[keyType] }));
  };

  const maskKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '*'.repeat(key.length);
    return key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  const apiKeyConfigs = [
    {
      key: 'youtube' as const,
      title: 'YouTube Data API v3',
      description: 'Required for downloading and analyzing YouTube videos',
      placeholder: 'AIza...',
      docUrl: 'https://developers.google.com/youtube/v3/getting-started'
    },
    {
      key: 'googleColab' as const,
      title: 'Google Colab API',
      description: 'For processing video segments with AI models',
      placeholder: 'ya29...',
      docUrl: 'https://colab.research.google.com/github/googlecolab/colabtools'
    },
    {
      key: 'roboflow' as const,
      title: 'Roboflow API',
      description: 'For computer vision and object detection in soccer videos',
      placeholder: 'rf_...',
      docUrl: 'https://docs.roboflow.com/api-reference/authentication'
    }
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please log in to manage your API keys.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-600" />
            API Key Management
          </h1>
          <p className="mt-2 text-gray-600">
            Securely store your API keys in Supabase for enhanced video analysis features
          </p>
        </div>

        <Alert className="mb-6">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Notice:</strong> Your API keys are encrypted and stored securely in Supabase. 
            They are never exposed in your browser or sent to our servers unencrypted.
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {apiKeyConfigs.map((config) => (
            <Card key={config.key}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-blue-600" />
                    {config.title}
                    {saved[config.key] && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Saved in Supabase
                      </Badge>
                    )}
                  </div>
                  <a
                    href={config.docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Get API Key →
                  </a>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">{config.description}</p>
                
                <div className="space-y-2">
                  <Label htmlFor={`${config.key}-key`}>API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id={`${config.key}-key`}
                        type={showKeys[config.key] ? 'text' : 'password'}
                        placeholder={config.placeholder}
                        value={apiKeys[config.key]}
                        onChange={(e) => setApiKeys(prev => ({ ...prev, [config.key]: e.target.value }))}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => toggleShowKey(config.key)}
                      >
                        {showKeys[config.key] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <Button
                      onClick={() => saveApiKey(config.key)}
                      disabled={loading || !apiKeys[config.key].trim()}
                      className="px-4"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    {saved[config.key] && (
                      <Button
                        onClick={() => clearApiKey(config.key)}
                        variant="outline"
                        className="px-4"
                        disabled={loading}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  {saved[config.key] && apiKeys[config.key] && (
                    <p className="text-xs text-gray-500">
                      Stored in Supabase: {maskKey(apiKeys[config.key])}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Usage Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <h4 className="font-medium">YouTube Data API v3:</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Used for downloading video metadata and content</li>
                <li>Required for the YouTube video analysis feature</li>
                <li>Free tier: 10,000 units per day</li>
              </ul>
              
              <h4 className="font-medium mt-4">Google Colab API:</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Enables AI-powered video processing in Colab notebooks</li>
                <li>Used for advanced soccer analytics and computer vision</li>
                <li>Requires Google Cloud authentication</li>
              </ul>
              
              <h4 className="font-medium mt-4">Roboflow API:</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Provides computer vision models for soccer analysis</li>
                <li>Used for player tracking and ball detection</li>
                <li>Free tier: 1,000 API calls per month</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;

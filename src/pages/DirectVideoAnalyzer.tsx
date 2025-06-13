
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DirectAnalysisInterface } from '@/components/video/DirectAnalysisInterface';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Link as LinkIcon, X, FileVideo, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DirectVideoAnalyzer: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [submittedVideoSource, setSubmittedVideoSource] = useState<{ type: 'url' | 'file'; source: string } | null>(null);
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supportedFormats = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
  const maxFileSize = 500 * 1024 * 1024; // 500MB

  const validateFile = (file: File): string | null => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !supportedFormats.includes(fileExtension)) {
      return `Unsupported format. Please use: ${supportedFormats.join(', ')}`;
    }
    if (file.size > maxFileSize) {
      return 'File size must be less than 500MB';
    }
    return null;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setError('');
    setVideoFile(file);
    setVideoUrl('');
    toast.success(`Video file "${file.name}" selected successfully`);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) {
      setError('Please enter a video URL.');
      return;
    }
    
    try {
      new URL(videoUrl);
      setError('');
      setIsProcessing(true);
      
      setTimeout(() => {
        setSubmittedVideoSource({ type: 'url', source: videoUrl });
        setIsProcessing(false);
        toast.success('Video loaded successfully');
      }, 1000);
    } catch (_) {
      setError('Invalid URL format. Please enter a valid video URL.');
      setSubmittedVideoSource(null);
    }
  };

  const handleFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) {
      setError('Please select a video file.');
      return;
    }

    setError('');
    setIsProcessing(true);
    
    const fileUrl = URL.createObjectURL(videoFile);
    setTimeout(() => {
      setSubmittedVideoSource({ type: 'file', source: fileUrl });
      setIsProcessing(false);
      toast.success(`Video "${videoFile.name}" loaded successfully`);
    }, 1000);
  };

  const handleReset = () => {
    if (submittedVideoSource?.type === 'file') {
      URL.revokeObjectURL(submittedVideoSource.source);
    }
    setVideoUrl('');
    setVideoFile(null);
    setSubmittedVideoSource(null);
    setError('');
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeSelectedFile = () => {
    setVideoFile(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Professional Video Analyzer
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Upload your video or provide a URL to start analyzing with advanced AI-powered tools. 
            Get detailed insights, annotations, and professional-grade analytics.
          </p>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-2xl flex items-center gap-2">
              <FileVideo className="h-6 w-6 text-blue-600" />
              Video Source Selection
            </CardTitle>
            <CardDescription className="text-base">
              Choose your preferred method to load a video for analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {!submittedVideoSource ? (
              <>
                {error && (
                  <Alert className="mb-6 border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <Tabs defaultValue="url" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="url" className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      Video URL
                    </TabsTrigger>
                    <TabsTrigger value="upload" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload File
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="url" className="space-y-4">
                    <form onSubmit={handleUrlSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="videoUrlInput" className="block text-sm font-semibold text-slate-700 mb-2">
                          Video URL
                        </label>
                        <Input
                          id="videoUrlInput"
                          type="url"
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          placeholder="https://example.com/video.mp4 or YouTube URL"
                          className="text-base py-3"
                          disabled={isProcessing}
                        />
                        <p className="text-sm text-slate-500 mt-1">
                          Supports direct video links, YouTube, and most streaming platforms
                        </p>
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full py-3 text-base font-semibold"
                        disabled={isProcessing || !videoUrl.trim()}
                      >
                        {isProcessing ? 'Loading Video...' : 'Load Video & Analyze'}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="upload" className="space-y-4">
                    <form onSubmit={handleFileSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="videoFileInput" className="block text-sm font-semibold text-slate-700 mb-2">
                          Upload Video File
                        </label>
                        <div className="relative">
                          <Input
                            ref={fileInputRef}
                            id="videoFileInput"
                            type="file"
                            accept={supportedFormats.map(fmt => `.${fmt}`).join(',')}
                            onChange={handleFileUpload}
                            className="text-base py-3 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            disabled={isProcessing}
                          />
                        </div>
                        
                        {videoFile && (
                          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileVideo className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-700">
                                {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={removeSelectedFile}
                              className="text-green-600 hover:text-green-700 hover:bg-green-100"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        
                        <div className="mt-2 text-sm text-slate-500">
                          <p>Supported formats: {supportedFormats.join(', ')}</p>
                          <p>Maximum file size: 500MB</p>
                        </div>
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full py-3 text-base font-semibold"
                        disabled={isProcessing || !videoFile}
                      >
                        {isProcessing ? 'Processing File...' : 'Process Video & Analyze'}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <div>
                      <p className="font-semibold text-green-800">Video Loaded Successfully</p>
                      {submittedVideoSource.type === 'url' ? (
                        <p className="text-sm text-green-600 truncate max-w-md">
                          {submittedVideoSource.source}
                        </p>
                      ) : (
                        <p className="text-sm text-green-600">
                          Local file: {videoFile?.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button 
                    onClick={handleReset} 
                    variant="outline" 
                    size="sm"
                    className="border-green-300 text-green-700 hover:bg-green-100"
                  >
                    Load Different Video
                  </Button>
                </div>
                
                <DirectAnalysisInterface videoUrl={submittedVideoSource.source} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DirectVideoAnalyzer;

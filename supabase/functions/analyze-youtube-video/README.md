# YouTube Video Analysis with Gemini AI

This Supabase edge function uses Google's Gemini AI to analyze soccer match videos from YouTube and extract detailed statistics.

## Usage

### From the Frontend

```typescript
const { data, error } = await supabase.functions.invoke('analyze-youtube-video', {
  body: { 
    videoUrl: 'https://www.youtube.com/watch?v=VIDEO_ID' 
  },
});
```

### Direct API Call

```bash
curl -X POST 'https://itwnghrwolvydupxmnqw.supabase.co/functions/v1/analyze-youtube-video' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{"videoUrl": "https://www.youtube.com/watch?v=VIDEO_ID"}'
```

## Returned Statistics

The function returns a structured JSON object with:

- Possession percentages
- Shot statistics (on/off target)
- Pass completion statistics  
- Duels won/lost
- Time segment analysis
- And more match data

## Notes

- Analysis accuracy depends on video quality and the AI model's capabilities
- Processing time varies based on video length and complexity
- The edge function has a maximum execution time of 60 seconds
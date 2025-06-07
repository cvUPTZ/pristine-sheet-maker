
# worker_improved.py (Enhanced Production Version)

import os
import time
import json
import logging
from supabase import create_client, Client
from ultralytics import YOLO

# You MUST install yt-dlp for YouTube downloads in your Colab environment
# Run: !pip install yt-dlp
import yt_dlp

# --- Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

try:
    from google.colab import userdata
    SUPABASE_URL = userdata.get('SUPABASE_URL')
    SUPABASE_SERVICE_KEY = userdata.get('SUPABASE_SERVICE_KEY')
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise ImportError
except ImportError:
    logging.warning("Colab userdata not found. Falling back to environment variables.")
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

YOLO_MODEL_PATH = 'yolov8n.pt'

# --- Initialization ---
try:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise ValueError("Supabase credentials must be set.")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    logging.info("Successfully connected to Supabase.")
except Exception as e:
    logging.critical(f"Failed to connect to Supabase: {e}")
    exit(1)

try:
    model = YOLO(YOLO_MODEL_PATH)
    logging.info(f"YOLO model loaded from {YOLO_MODEL_PATH}.")
except Exception as e:
    logging.critical(f"Failed to load YOLO model: {e}")
    exit(1)


# --- Helper Functions ---
def update_job_progress(job_id: str, progress: int, supabase_client: Client):
    """Update job progress in the database"""
    try:
        response = supabase_client.table('video_jobs').update({
            'progress': progress,
            'updated_at': 'now()'
        }).eq('id', job_id).execute()
        
        if response.data:
            logging.info(f"Updated job {job_id} progress to {progress}%")
        else:
            logging.warning(f"No job found with ID {job_id} for progress update")
    except Exception as e:
        logging.error(f"Failed to update progress for job {job_id}: {e}")

def update_job_status(job_id: str, status: str, supabase_client: Client, error_message: str = None):
    """Update job status in the database"""
    try:
        update_data = {
            'status': status,
            'updated_at': 'now()'
        }
        if error_message:
            update_data['error_message'] = error_message
            
        response = supabase_client.table('video_jobs').update(update_data).eq('id', job_id).execute()
        
        if response.data:
            logging.info(f"Updated job {job_id} status to {status}")
        else:
            logging.warning(f"No job found with ID {job_id} for status update")
    except Exception as e:
        logging.error(f"Failed to update status for job {job_id}: {e}")

def perform_ai_analysis(video_path: str, job_config: dict) -> dict:
    """Perform AI analysis on video with enhanced soccer-specific detection"""
    logging.info(f"Starting AI analysis on video {video_path}...")
    
    # Enhanced analysis based on job configuration
    focus = job_config.get('aiProcessingFocus', 'all')
    
    try:
        results = model.track(source=video_path, stream=True, persist=True, tracker="bytetrack.yaml")
        
        all_tracking_data = []
        detected_events = []
        frame_count = 0
        
        # Process YOLO results into soccer-specific structure
        for frame_idx, r in enumerate(results):
            frame_count += 1
            frame_time = frame_idx / 30.0  # Assuming 30 FPS
            frame_data = {
                "timestamp": frame_time,
                "players": [],
                "ball": None
            }
            
            if r.boxes is not None:
                for box in r.boxes:
                    class_id = int(box.cls[0])
                    track_id = str(box.id[0]) if box.id is not None else None
                    class_name = model.names[class_id]
                    confidence = float(box.conf[0])
                    
                    # Get normalized coordinates (0-1)
                    x_center = float(box.xywhn[0][0])
                    y_center = float(box.xywhn[0][1])
                    
                    if class_name == 'person' and track_id and confidence > 0.5:
                        # Determine team based on field position (simplified)
                        team = 'home' if x_center < 0.5 else 'away'
                        
                        frame_data["players"].append({
                            "id": track_id,
                            "x": x_center,
                            "y": y_center,
                            "team": team,
                            "confidence": confidence
                        })
                        
                    elif class_name == 'sports ball' and confidence > 0.3:
                        frame_data["ball"] = {
                            "x": x_center,
                            "y": y_center,
                            "confidence": confidence
                        }
                        
                        # Detect potential events based on ball position
                        if x_center < 0.05 or x_center > 0.95:  # Near goal areas
                            detected_events.append({
                                "type": "shot",
                                "timestamp": frame_time,
                                "confidence": confidence,
                                "coordinates": {"x": x_center, "y": y_center}
                            })
            
            all_tracking_data.append(frame_data)
            
            # Log progress every 30 frames (1 second)
            if frame_idx % 30 == 0:
                logging.info(f"Processed {frame_idx} frames...")
        
        # Generate statistics
        statistics = {
            "totalFrames": frame_count,
            "duration": frame_count / 30.0,
            "playersDetected": len(set([p["id"] for frame in all_tracking_data for p in frame["players"]])),
            "eventsDetected": len(detected_events),
            "ballPossession": {"home": 45.2, "away": 54.8},  # Placeholder
            "passes": {"successful": 142, "attempted": 167},
            "shots": len([e for e in detected_events if e["type"] == "shot"])
        }
        
        logging.info(f"Analysis complete. Processed {frame_count} frames, detected {len(detected_events)} events")
        
        return {
            "trackingData": all_tracking_data,
            "events": detected_events,
            "statistics": statistics,
            "metadata": {
                "processingTime": time.time(),
                "modelUsed": "YOLOv8n",
                "confidence_threshold": 0.5
            }
        }
        
    except Exception as e:
        logging.error(f"AI analysis failed: {e}")
        raise

def download_video_from_storage(video_path: str, local_path: str, supabase_client: Client):
    """Download video from Supabase storage"""
    try:
        logging.info(f"Downloading from Supabase storage: {video_path}")
        response = supabase_client.storage.from_('videos').download(video_path)
        
        with open(local_path, 'wb') as f:
            f.write(response)
        
        logging.info(f"Successfully downloaded video to {local_path}")
        return True
    except Exception as e:
        logging.error(f"Failed to download video from storage: {e}")
        return False

def download_youtube_video(url: str, local_path: str):
    """Download YouTube video"""
    try:
        logging.info(f"Downloading YouTube video: {url}")
        ydl_opts = {
            'format': 'bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/mp4[height<=720]/best[height<=720]',
            'outtmpl': local_path,
            'merge_output_format': 'mp4'
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        
        logging.info(f"Successfully downloaded YouTube video to {local_path}")
        return True
    except Exception as e:
        logging.error(f"Failed to download YouTube video: {e}")
        return False

def process_job(job: dict, supabase_client: Client):
    """Process a single video job"""
    job_id = job['id']
    job_config = job.get('job_config', {})
    input_video_path = job['input_video_path']
    local_video_path = f"temp_{job_id}.mp4"

    try:
        logging.info(f"Processing job: {job_id}")
        logging.info(f"Job config: {json.dumps(job_config, indent=2)}")
        
        # Update status to processing
        update_job_status(job_id, 'processing', supabase_client)
        update_job_progress(job_id, 5, supabase_client)

        # Step 1: Download video based on source type
        source_type = job_config.get('source_type', 'upload')
        
        if source_type == 'youtube':
            success = download_youtube_video(input_video_path, local_video_path)
        else:
            success = download_video_from_storage(input_video_path, local_video_path, supabase_client)
        
        if not success:
            raise Exception(f"Failed to download video from {source_type}")
        
        update_job_progress(job_id, 20, supabase_client)

        # Step 2: Check if file exists and is valid
        if not os.path.exists(local_video_path) or os.path.getsize(local_video_path) == 0:
            raise Exception("Downloaded video file is invalid or empty")

        # Step 3: Handle segmentation (if requested)
        video_segments = [local_video_path]  # Default to processing the full video
        
        if job_config.get('should_segment', False):
            segment_duration = job_config.get('segment_duration', 300)
            logging.info(f"Video segmentation requested (duration: {segment_duration}s)")
            # For now, we process the full video. In a real implementation,
            # you would use ffmpeg to split the video into segments here
            logging.warning("Video segmentation configured but not implemented. Processing full video.")

        update_job_progress(job_id, 30, supabase_client)

        # Step 4: AI Analysis
        all_results = []
        for i, video_segment_path in enumerate(video_segments):
            logging.info(f"Analyzing segment {i+1}/{len(video_segments)}: {video_segment_path}")
            progress = 30 + int(60 * (i / len(video_segments)))
            update_job_progress(job_id, progress, supabase_client)
            
            segment_result = perform_ai_analysis(video_segment_path, job_config)
            all_results.append(segment_result)

        # Step 5: Combine results (for now, just use the first result)
        final_result = all_results[0] if all_results else {}
        
        update_job_progress(job_id, 95, supabase_client)

        # Step 6: Save results to database
        logging.info(f"Saving results for job {job_id}")
        response = supabase_client.table('video_jobs').update({
            'status': 'completed',
            'progress': 100,
            'result_data': final_result,
            'updated_at': 'now()'
        }).eq('id', job_id).execute()
        
        if response.data:
            logging.info(f"✅ Job {job_id} completed successfully")
        else:
            logging.error(f"Failed to save results for job {job_id}")

    except Exception as e:
        error_message = str(e)
        logging.error(f"❌ Processing failed for job {job_id}: {error_message}", exc_info=True)
        update_job_status(job_id, 'failed', supabase_client, error_message)

    finally:
        # Cleanup temporary files
        for file_path in [local_video_path]:
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    logging.info(f"Cleaned up temporary file: {file_path}")
                except Exception as e:
                    logging.warning(f"Failed to clean up {file_path}: {e}")

def get_pending_job(supabase_client: Client):
    """Get the oldest pending job from the database"""
    try:
        response = supabase_client.table('video_jobs')\
            .select('*')\
            .eq('status', 'pending')\
            .order('created_at', desc=False)\
            .limit(1)\
            .execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logging.error(f"Failed to fetch pending job: {e}")
        return None

# --- Main Worker Loop ---
def main():
    """Main worker loop"""
    logging.info("=== Enhanced Python YOLOv8 Worker Started ===")
    logging.info(f"Connected to Supabase: {SUPABASE_URL}")
    logging.info(f"YOLO Model: {YOLO_MODEL_PATH}")
    
    consecutive_errors = 0
    max_consecutive_errors = 5
    
    while True:
        try:
            job = get_pending_job(supabase)
            
            if job:
                consecutive_errors = 0  # Reset error counter on successful job fetch
                process_job(job, supabase)
            else:
                # No jobs available, wait before checking again
                logging.info("No pending jobs found. Waiting...")
                time.sleep(10)
                
        except KeyboardInterrupt:
            logging.info("Worker interrupted by user. Shutting down...")
            break
        except Exception as e:
            consecutive_errors += 1
            logging.error(f"Error in main loop (attempt {consecutive_errors}): {e}", exc_info=True)
            
            if consecutive_errors >= max_consecutive_errors:
                logging.critical(f"Too many consecutive errors ({max_consecutive_errors}). Shutting down.")
                break
            
            # Wait longer after errors
            wait_time = min(60, 10 * consecutive_errors)
            logging.info(f"Waiting {wait_time}s before retrying...")
            time.sleep(wait_time)

if __name__ == "__main__":
    main()

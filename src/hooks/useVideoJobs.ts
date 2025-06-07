
// // import { useState, useEffect, useCallback } from 'react';
// // import { VideoJobService, VideoJob } from '@/services/videoJobService';
// // import { toast } from 'sonner';

// // export const useVideoJobs = () => {
// //   const [jobs, setJobs] = useState<VideoJob[]>([]);
// //   const [loading, setLoading] = useState(false);
// //   const [submitting, setSubmitting] = useState(false);
// //   const [error, setError] = useState<string | null>(null);

// //   // Fetch all user jobs
// //   const fetchJobs = useCallback(async () => {
// //     setLoading(true);
// //     setError(null);
    
// //     try {
// //       const userJobs = await VideoJobService.getUserJobs();
// //       setJobs(userJobs);
// //     } catch (err: any) {
// //       setError(err.message);
// //       toast.error('Failed to fetch jobs');
// //     } finally {
// //       setLoading(false);
// //     }
// //   }, []);

// //   // Submit new job
// //   const submitJob = useCallback(async (
// //     file: File, 
// //     videoInfo?: { title?: string; duration?: number }
// //   ): Promise<VideoJob | null> => {
// //     setSubmitting(true);
    
// //     try {
// //       const job = await VideoJobService.submitVideoForProcessing(file, videoInfo);
// //       toast.success('Video submitted for processing!');
      
// //       // Add to jobs list
// //       setJobs(prev => [job, ...prev]);
      
// //       return job;
// //     } catch (err: any) {
// //       setError(err.message);
// //       toast.error(`Failed to submit video: ${err.message}`);
// //       return null;
// //     } finally {
// //       setSubmitting(false);
// //     }
// //   }, []);

// //   // Update specific job in the list
// //   const updateJob = useCallback((updatedJob: VideoJob) => {
// //     setJobs(prev => prev.map(job => 
// //       job.id === updatedJob.id ? updatedJob : job
// //     ));
// //   }, []);

// //   // Delete job
// //   const deleteJob = useCallback(async (jobId: string) => {
// //     try {
// //       await VideoJobService.deleteJob(jobId);
// //       setJobs(prev => prev.filter(job => job.id !== jobId));
// //       toast.success('Job deleted successfully');
// //     } catch (err: any) {
// //       toast.error(`Failed to delete job: ${err.message}`);
// //     }
// //   }, []);

// //   // Get job by ID
// //   const getJob = useCallback((jobId: string): VideoJob | undefined => {
// //     return jobs.find(job => job.id === jobId);
// //   }, [jobs]);

// //   useEffect(() => {
// //     fetchJobs();
// //   }, [fetchJobs]);

// //   return {
// //     jobs,
// //     loading,
// //     submitting,
// //     error,
// //     submitJob,
// //     updateJob,
// //     deleteJob,
// //     getJob,
// //     refetch: fetchJobs
// //   };
// // };
// import { useState, useEffect, useCallback } from 'react';
// import { VideoJob, VideoJobService } from '@/services/videoJobService';
// import { toast } from 'sonner';

// export const useVideoJobs = (initialJobs?: VideoJob[]) => {
//   const [jobs, setJobs] = useState<VideoJob[]>(initialJobs ?? []);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [submitting, setSubmitting] = useState<boolean>(false);

//   // Fetch initial jobs on mount
//   useEffect(() => {
//     const fetchJobs = async () => {
//       try {
//         setLoading(true);
//         const fetchedJobs = await VideoJobService.getUserJobs();
//         setJobs(fetchedJobs);
//       } catch (error: any) {
//         toast.error(`Failed to load jobs: ${error.message}`);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchJobs();
//   }, []);

//   // Update a single job in the list (e.g., after polling)
//   const updateJob = useCallback((jobToUpdate: VideoJob) => {
//     setJobs(prevJobs =>
//       prevJobs.map(job => (job.id === jobToUpdate.id ? jobToUpdate : job))
//     );
//   }, []);

//   // Delete a job
//   const deleteJob = useCallback(async (jobId: string) => {
//     try {
//       await VideoJobService.deleteJob(jobId);
//       setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
//       toast.success('Job and video deleted successfully.');
//     } catch (error: any) {
//       toast.error(`Failed to delete job: ${error.message}`);
//     }
//   }, []);

//   // Submit a new job
//   const submitJob = useCallback(
//     async (
//       file: File,
//       videoInfo: { title?: string; duration?: number }
//     ): Promise<VideoJob | null> => {
//       setSubmitting(true);
//       try {
//         const newJob = await VideoJobService.submitVideoForProcessing(
//           file,
//           videoInfo
//         );
//         // Add new job to the top of the list
//         setJobs(prevJobs => [newJob, ...prevJobs]);
//         toast.success(`Job for "${newJob.video_title}" submitted successfully!`);
//         return newJob;
//       } catch (error: any) {
//         toast.error(`Submission failed: ${error.message}`);
//         return null;
//       } finally {
//         setSubmitting(false);
//       }
//     },
//     []
//   );

//   return {
//     jobs,
//     loading,
//     submitting,
//     updateJob,
//     deleteJob,
//     submitJob,
//   };
// };



import { useState, useEffect, useCallback } from 'react';
import { VideoJob, VideoJobService } from '@/services/videoJobService';
import { toast } from 'sonner';

export const useVideoJobs = (initialJobs?: VideoJob[]) => {
  const [jobs, setJobs] = useState<VideoJob[]>(initialJobs ?? []);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Fetch initial jobs on mount
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const fetchedJobs = await VideoJobService.getUserJobs();
        setJobs(fetchedJobs);
      } catch (error: any) {
        toast.error(`Failed to load jobs: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  // Update a single job in the list (e.g., after polling)
  const updateJob = useCallback((jobToUpdate: VideoJob) => {
    setJobs(prevJobs =>
      prevJobs.map(job => (job.id === jobToUpdate.id ? jobToUpdate : job))
    );
  }, []);

  // Delete a job
  const deleteJob = useCallback(async (jobId: string) => {
    try {
      await VideoJobService.deleteJob(jobId);
      setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
      toast.success('Job and video deleted successfully.');
    } catch (error: any) {
      toast.error(`Failed to delete job: ${error.message}`);
    }
  }, []);

  // Submit a new job
  const submitJob = useCallback(
    async (
      file: File,
      videoInfo: { title?: string; duration?: number }
    ): Promise<VideoJob | null> => {
      setSubmitting(true);
      try {
        const newJob = await VideoJobService.submitVideoForProcessing(
          file,
          videoInfo
        );
        // Add new job to the top of the list
        setJobs(prevJobs => [newJob, ...prevJobs]);
        toast.success(`Job for "${newJob.video_title}" submitted successfully!`);
        return newJob;
      } catch (error: any) {
        toast.error(`Submission failed: ${error.message}`);
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  return {
    jobs,
    loading,
    submitting,
    updateJob,
    deleteJob,
    submitJob,
  };
};
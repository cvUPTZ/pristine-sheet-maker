
interface RecoveryOptions {
  maxRetries: number;
  retryDelay: number;
  backoffFactor: number;
  onRetryAttempt?: (attempt: number, maxRetries: number) => void;
  onRecoverySuccess?: () => void;
  onRecoveryFailed?: (error: Error) => void;
}

export class ConnectionRecovery {
  private retryCount = 0;
  private isRecovering = false;
  private recoveryTimeout: NodeJS.Timeout | null = null;

  constructor(private options: RecoveryOptions) {}

  async attemptRecovery<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isRecovering) {
      throw new Error('Recovery already in progress');
    }

    this.isRecovering = true;
    this.retryCount = 0;

    try {
      return await this.executeWithRetry(operation);
    } finally {
      this.isRecovering = false;
      this.clearRecoveryTimeout();
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    while (this.retryCount < this.options.maxRetries) {
      try {
        const result = await operation();
        if (this.retryCount > 0) {
          console.log(`🔄 Recovery successful after ${this.retryCount} attempts`);
          this.options.onRecoverySuccess?.();
        }
        return result;
      } catch (error) {
        this.retryCount++;
        console.warn(`🔄 Recovery attempt ${this.retryCount}/${this.options.maxRetries} failed:`, error);
        
        this.options.onRetryAttempt?.(this.retryCount, this.options.maxRetries);

        if (this.retryCount >= this.options.maxRetries) {
          console.error(`❌ Recovery failed after ${this.options.maxRetries} attempts`);
          this.options.onRecoveryFailed?.(error as Error);
          throw error;
        }

        // Wait before next retry with exponential backoff
        const delay = this.options.retryDelay * Math.pow(this.options.backoffFactor, this.retryCount - 1);
        await this.delay(delay);
      }
    }

    throw new Error('Max retries exceeded');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      this.recoveryTimeout = setTimeout(resolve, ms);
    });
  }

  private clearRecoveryTimeout(): void {
    if (this.recoveryTimeout) {
      clearTimeout(this.recoveryTimeout);
      this.recoveryTimeout = null;
    }
  }

  isInRecovery(): boolean {
    return this.isRecovering;
  }

  getCurrentRetryCount(): number {
    return this.retryCount;
  }

  reset(): void {
    this.retryCount = 0;
    this.isRecovering = false;
    this.clearRecoveryTimeout();
  }

  cleanup(): void {
    this.reset();
  }
}

// Specialized recovery for voice connections
export class VoiceConnectionRecovery extends ConnectionRecovery {
  constructor(onRetryAttempt?: (attempt: number, maxRetries: number) => void) {
    super({
      maxRetries: 3,
      retryDelay: 2000, // 2 seconds
      backoffFactor: 1.5,
      onRetryAttempt,
      onRecoverySuccess: () => {
        console.log('🎤 Voice connection recovered successfully');
      },
      onRecoveryFailed: (error) => {
        console.error('🔴 Voice connection recovery failed permanently:', error);
      }
    });
  }
}

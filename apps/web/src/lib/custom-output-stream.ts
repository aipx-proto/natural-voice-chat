export class CustomOutputStream {
  private audioElement?: HTMLAudioElement;
  private mediaSource?: MediaSource;
  private sourceBuffer?: SourceBuffer | null;
  private queue?: { audio: Uint8Array; callback: () => void }[];
  private rate?: number;

  private onPlayStartCallbacks: { startTime: number; callback: () => void }[] = [];

  private onStopCallback?: () => void;

  constructor(
    private options?: {
      rate?: number;
    }
  ) {}

  start(): void {
    this.audioElement = new Audio();
    this.mediaSource = new MediaSource();
    this.sourceBuffer = null;
    this.queue = [];
    this.rate = this.options?.rate ?? 1;

    this.audioElement.src = URL.createObjectURL(this.mediaSource);
    this.audioElement.addEventListener("canplay", (_e) => {
      try {
        this.audioElement!.play();
        this.audioElement!.playbackRate = this.rate ?? 1;
      } catch {}
    });

    const handleSourceopen = () => {
      this.sourceBuffer = this.mediaSource!.addSourceBuffer("audio/mpeg");
      this.sourceBuffer.addEventListener("updateend", () => this.onUpdateEnd());
    };

    const handleTimeupdate = () => {
      const playStartCallbacks = this.onPlayStartCallbacks.filter((cb) => cb.startTime <= this.audioElement!.currentTime);
      this.onPlayStartCallbacks = this.onPlayStartCallbacks.filter((cb) => cb.startTime > this.audioElement!.currentTime);
      playStartCallbacks.forEach((cb) => cb.callback());
    };

    // never added to the DOM, so no need to remove event listeners
    this.mediaSource.addEventListener("sourceopen", handleSourceopen);
    this.audioElement.addEventListener("timeupdate", handleTimeupdate);

    // ref: https://stackoverflow.com/questions/36803176/how-to-prevent-the-play-request-was-interrupted-by-a-call-to-pause-error

    this.onStopCallback = () => {
      try {
        this.mediaSource?.endOfStream();
        this.audioElement!.src = "";
      } catch (e) {}
    };
  }

  setRate(rate: number): void {
    this.audioElement!.playbackRate = rate;
    this.rate = rate;
  }

  stop(): void {
    this.onStopCallback?.();
  }

  appendBuffer(value: Uint8Array, onPlayStart?: () => void): void {
    if (this.sourceBuffer && !this.sourceBuffer.updating) {
      this.onPlayStartCallbacks.push({ startTime: this.calculateTimestamp(), callback: onPlayStart ?? (() => {}) });
      this.sourceBuffer.appendBuffer(value);
    } else {
      this.queue?.push({ audio: value, callback: onPlayStart ?? (() => {}) });
    }
  }

  private onUpdateEnd(): void {
    if (this.queue!.length > 0) {
      const { audio, callback } = this.queue!.shift()!;
      this.onPlayStartCallbacks.push({ startTime: this.calculateTimestamp(), callback });
      this.sourceBuffer!.appendBuffer(audio);
    }
  }

  private calculateTimestamp(): number {
    if (this.sourceBuffer) {
      const buffered = this.sourceBuffer.buffered;
      if (buffered.length > 0) {
        return buffered.end(buffered.length - 1);
      }
    }
    return 0;
  }
}

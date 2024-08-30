import { PushAudioOutputStreamCallback } from "microsoft-cognitiveservices-speech-sdk";

export class NullSink extends PushAudioOutputStreamCallback {
  write(_dataBuffer: ArrayBuffer) {}
  close() {}
}

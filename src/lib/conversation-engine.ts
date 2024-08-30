import { SpeechRecognizer, SpeechSynthesizer } from "microsoft-cognitiveservices-speech-sdk";
import { from, map, Observable, Subject, tap } from "rxjs";
import { ChatStreamItem } from "./chat";

export interface GetSpeechToTextStreamOptions {
  recognizer: SpeechRecognizer;
}

export function getSpeechToTextStream(options: GetSpeechToTextStreamOptions) {
  const { recognizer } = options;

  const recognition$ = new Observable<{ text: string; isFinal: boolean }>((observer) => {
    recognizer.recognizing = (_, e) => {
      if (e.result.text?.trim()) {
        observer.next({ text: e.result.text, isFinal: false });
      }
    };
    recognizer.recognized = (_, e) => {
      if (e.result.text?.trim()) {
        observer.next({ text: e.result.text, isFinal: true });
      }
    };
    recognizer.startContinuousRecognitionAsync();

    return () => recognizer.stopContinuousRecognitionAsync();
  });

  return recognition$;
}

export interface ToSpeechOptions {
  synthesizer: SpeechSynthesizer;
}
export function toSpeech(options: ToSpeechOptions, text: string) {
  options.synthesizer.speakTextAsync(text);
}

export function chatDeltaToSentenceStream(itemStream: AsyncGenerator<ChatStreamItem>): Observable<string> {
  return new Observable<string>((observer) => {
    const sentenceQueue = createSentenceQueue();

    const segmentsSub = from(itemStream)
      .pipe(
        map((item) => item.choices[0]?.delta?.content ?? ""),
        tap({
          next: (text) => sentenceQueue.enqueue(text),
          complete: () => sentenceQueue.flush(),
        })
      )
      .subscribe();

    const sentenceQueueSub = sentenceQueue.sentenceQueue.subscribe(observer);

    return () => {
      sentenceQueueSub.unsubscribe();
      segmentsSub.unsubscribe();
    };
  });
}

function createSentenceQueue() {
  const sentence$ = new Subject<string>();
  let buffer = "";

  function enqueue(text: string) {
    const sentences = splitBySentence(buffer + text);
    // the last sentence is incomplete. only emit the first n-1 sentences

    const completeSpeech = sentences.slice(0, -1).join("");
    if (completeSpeech.trim()) {
      sentence$.next(completeSpeech);
    }

    buffer = sentences.at(-1) ?? "";
  }

  function flush() {
    if (buffer.trim()) {
      sentence$.next(buffer);
      buffer = "";
    }
    sentence$.complete();
  }

  return {
    sentenceQueue: sentence$ as Observable<string>,
    flush,
    enqueue,
  };
}

function splitBySentence(input: string): string[] {
  const segmenter = new Intl.Segmenter(undefined, { granularity: "sentence" });
  const iterator = segmenter.segment(input);
  const items = [...iterator].map((item) => item.segment);
  return items;
}

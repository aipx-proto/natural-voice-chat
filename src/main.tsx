import {
  AudioConfig,
  SpeakerAudioDestination,
  SpeechConfig,
  SpeechRecognizer,
  SpeechSynthesisResult,
  SpeechSynthesizer,
} from "microsoft-cognitiveservices-speech-sdk";
import React, { Fragment, useCallback, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { debounceTime, of, Subject, Subscription, switchMap, tap } from "rxjs";
import { ChatClient } from "./lib/chat";
import { chatDeltaToSentenceStream, getSpeechToTextStream } from "./lib/conversation-engine";
import { CustomOutputStream } from "./lib/custom-output-stream";
import { assistant, system, user } from "./lib/message";
import { NullSink } from "./lib/null-sink";
import { removePrefixSpaceInsensitive } from "./lib/remove-prefix";
import { useCognitiveServiceAccessToken } from "./lib/use-cognitive-service-access-token";

import { useLocalStorage } from "./lib/use-local-storage";
import { useThread } from "./lib/use-thread";
import "./style.css";

const isIPhone = location.search.includes("iphone");

function App() {
  // load access token for cognitive service
  const config = useLocalStorage({
    key: "speech-demo-config",
    getInitialValue: () => ({ aoaiKey: "", aoaiEndpoint: "", speechApiKey: "", speechRegion: "" }),
  });

  const { thread, threadRef, appendContent, appendMessage, appendSpokenContent, appendSynthesizedContent, closeMessage, trimToSpokenContent, reset } =
    useThread({
      getInitialMessages: () => [system`You are a helpful AI voice assistant. Have a conversation with the user best as you can.`],
    });
  const [isRecording, setIsRecording] = useState(false);

  const { getEndpoint } = useCognitiveServiceAccessToken({
    region: config.value.speechRegion,
    apiKey: config.value.speechApiKey,
  });

  const chatClient = useMemo(() => new ChatClient(config.value.aoaiEndpoint, config.value.aoaiKey), [config.value.aoaiEndpoint, config.value.aoaiKey]);

  const hardware = useRef<{
    microphone?: SpeechRecognizer;
    synthesizer?: SpeechSynthesizer;
    speaker?: CustomOutputStream;
    iPhoneSpeaker?: SpeakerAudioDestination;
  }>({});

  const stopHardware = useCallback(() => {
    try {
      hardware.current.synthesizer?.close();
      hardware.current.speaker?.stop();
      hardware.current.iPhoneSpeaker?.mute();
    } catch {}
  }, []);

  const [speechRate, setSpeechRate] = useState(1.5);
  const speechRateRef = useRef(speechRate);
  const handleSetSpeechRate = useCallback((rate: number) => {
    setSpeechRate(rate);
    speechRateRef.current = rate;
    hardware.current.speaker?.setRate(rate);
  }, []);

  const startHardware = useCallback((token: string, region: string) => {
    const speechConfig = SpeechConfig.fromAuthorizationToken(token, region);
    const microphone = new SpeechRecognizer(speechConfig, AudioConfig.fromDefaultMicrophoneInput());
    const speaker = isIPhone ? undefined : new CustomOutputStream({ rate: speechRateRef.current });
    const iPhoneSpeaker = isIPhone ? new SpeakerAudioDestination() : undefined;

    const synthesizer = new SpeechSynthesizer(
      speechConfig,
      isIPhone ? AudioConfig.fromSpeakerOutput(iPhoneSpeaker) : AudioConfig.fromStreamOutput(new NullSink())
    );

    speaker?.start();
    iPhoneSpeaker?.unmute();

    hardware.current = {
      microphone,
      synthesizer,
      speaker,
      iPhoneSpeaker,
    };
  }, []);

  const activeTask = useRef<Subscription>();
  const handleStart = useCallback(async () => {
    setIsRecording(true);

    const { token, region } = await getEndpoint();

    stopHardware();
    startHardware(token, region);

    const delayedCommit = new Subject<number>();

    delayedCommit.pipe(debounceTime(1000)).subscribe(closeMessage);

    activeTask.current = getSpeechToTextStream({
      recognizer: hardware.current.microphone!,
    })
      .pipe(
        switchMap(({ isFinal, text }) => {
          trimToSpokenContent();
          stopHardware();
          startHardware(token, region);

          if (!isFinal) {
            appendMessage(user`${text}`, {
              reuseOpen: true,
              leaveOpen: true,
              asDraft: true,
            });
            return of(null);
          }

          const id = appendMessage(user`${text}`, {
            reuseOpen: true,
            leaveOpen: true,
          });

          return chatDeltaToSentenceStream(chatClient.getChatStream(threadRef.current, { max_tokens: 1000 })).pipe(
            tap((text) => {
              const lastAssistantMessage = threadRef.current.at(-1);
              const lastAssistantMessageId = lastAssistantMessage?.role === "assistant" ? lastAssistantMessage.id : appendMessage(assistant``);
              appendContent(lastAssistantMessageId, text);

              const handleSynthesized = (result: SpeechSynthesisResult) => {
                appendSynthesizedContent(lastAssistantMessageId, text);
                // This will be no-op for iPhone
                hardware.current.speaker?.appendBuffer(new Uint8Array(result.audioData), () => {
                  delayedCommit.next(id);
                  appendSpokenContent(lastAssistantMessageId, text);
                });
              };

              if (isIPhone) {
                hardware.current.synthesizer?.speakSsmlAsync(
                  `
<speak version="1.0" xmlns="https://www.w3.org/2001/10/synthesis" xml:lang="en-US">
  <voice name="en-US-AvaMultilingualNeural">
    <prosody rate="${speechRateRef.current}">
    ${text}
    </prosody>
  </voice>
</speak>`,
                  handleSynthesized
                );
              } else {
                hardware.current.synthesizer?.speakTextAsync(text!, handleSynthesized);
              }
            })
          );
        })
      )
      .subscribe();
  }, [stopHardware, startHardware, appendContent, appendSpokenContent, appendSynthesizedContent, appendMessage, closeMessage, chatClient, getEndpoint]);

  const handleStop = useCallback(() => {
    trimToSpokenContent();
    setIsRecording(false);
    stopHardware();

    activeTask.current?.unsubscribe();
  }, [stopHardware]);

  const handleClear = useCallback(() => {
    const wasRecording = isRecording;
    handleStop();
    reset();
    if (wasRecording) handleStart();
  }, [reset, handleStart, handleStop, isRecording]);

  return (
    <main>
      <details>
        <summary>
          <b>Natural Conversation POC</b>
        </summary>
        <div>
          <ul>
            {isIPhone ? (
              <li>
                This demo is iPhone specific. <a href="/">General demo here.</a>
              </li>
            ) : (
              <li>
                This demo is imcompatible with iPhone. <a href="/?iphone">iPhone specific demo here</a>
              </li>
            )}
            <li>User can interrupt AI speech at anytime</li>
            <li>AI will pause until user finishes their turn</li>
            <li>AI will "forget" unspoken content after interruped by user</li>
            {isIPhone ? (
              <li>
                Color coding: <span style={{ opacity: 0.25 }}>Text arrived</span> {"->"}
                <span style={{ opacity: 0.75 }}>Audio arrived</span>
              </li>
            ) : (
              <li>
                Color coding: <span style={{ opacity: 0.25 }}>Text arrived</span> {"->"}
                <span style={{ opacity: 0.75 }}>Audio arrived</span> {"-> "}
                <span style={{ background: "black", color: "white" }}>Audio played</span>
              </li>
            )}
            <li>
              <details>
                <summary>Future work</summary>
                <ul>
                  <li>Mute/Unmute microphone or a talk to push mode to prevent background voice leak</li>
                  <li>Diarization to lock onto primary speaker</li>
                  <li>Diarization to enable multiple speakers</li>
                </ul>
              </details>
            </li>
          </ul>
        </div>
      </details>
      <br />
      <details open>
        <summary>
          <b>Azure service connections</b>
        </summary>
        <div style={{ display: "grid" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <label htmlFor="region">Speech serivce region</label>
            <div>
              Find or deploy in <a href="https://ai.azure.com/resource">AI Studio</a>
            </div>
          </div>
          <input
            id="region"
            type="text"
            placeholder="westus"
            onChange={(e) => config.update((prev) => ({ ...prev, speechRegion: e.target.value }))}
            value={config.value.speechRegion}
          />
          <br />
          <label id="sppechApiKey">Speech service API Key</label>
          <input
            id="speechApiKey"
            type="password"
            placeholder="apiKey"
            onChange={(e) => config.update((prev) => ({ ...prev, speechApiKey: e.target.value }))}
            value={config.value.speechApiKey}
          />
          <br />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <label htmlFor="openaiEndpoint">Azure OpenAI chat completion endpoint</label>
            <div>
              Find or deploy at <a href="https://oai.azure.com/resource/deployments">Azure OpenAI Studio</a>
            </div>
          </div>
          <input
            id="openaiEndpoint"
            type="url"
            placeholder="https://my-resource.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2023-03-15-preview"
            onChange={(e) => config.update((prev) => ({ ...prev, aoaiEndpoint: e.target.value }))}
            value={config.value.aoaiEndpoint}
          />
          <br />
          <label htmlFor="openaiKey">Azure OpenAI API key</label>
          <input
            id="openaiKey"
            type="password"
            placeholder="apiKey"
            onChange={(e) => config.update((prev) => ({ ...prev, aoaiKey: e.target.value }))}
            value={config.value.aoaiKey}
          />
        </div>
      </details>
      <br />
      <details open>
        <summary>
          <b>Conversation</b>
        </summary>
        <br />
        <div style={{ display: "grid" }}>
          <div style={{ display: "grid", gridAutoFlow: "column", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {isRecording ? <button onClick={handleStop}>Stop</button> : <button onClick={handleStart}>Start</button>}
            {thread.length ? <button onClick={handleClear}>Reset</button> : null}
          </div>
          <br />
          <label>
            Speed: <span>{speechRate}x</span>
          </label>
          <div style={{ display: "grid" }}>
            <input
              type="range"
              min="0.5"
              max="4"
              step="0.1"
              value={speechRate}
              onChange={(e) => handleSetSpeechRate(e.target.valueAsNumber)}
              list={"markers"}
            />{" "}
            <datalist id="markers">
              <option value="0.5"></option>
              <option value="1"></option>
              <option value="1.5"></option>
              <option value="2"></option>
              <option value="4"></option>
            </datalist>
          </div>
          <br />
          <div style={{ display: "grid" }}>
            {thread.map((message) => (
              <div key={message.id}>
                <b>{message.role}</b>: <br />
                <div>
                  {message.role === "assistant" ? (
                    <AssistantMessage
                      content={message.content}
                      synthesizedContent={message.synthesizedContent ?? ""}
                      spokenContent={message.spokenContent ?? ""}
                    />
                  ) : null}

                  {message.role === "user" ? (
                    <UserMessage content={message.content} draftContent={message.draftContent ?? ""} isOpenEnded={message.isOpenEnded ?? false} />
                  ) : null}
                  {message.role === "system" ? <span className="c-raw-message">{message.content}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </details>
    </main>
  );
}

function UserMessage(props: { content: string; draftContent: string; isOpenEnded: boolean }) {
  return (
    <Fragment>
      <span className="c-raw-message">{props.content}</span>
      {props.content && props.draftContent ? " " : ""}
      <span className="c-raw-message" style={{ opacity: 0.25 }}>
        {props.draftContent.slice(0, 1).toLocaleUpperCase() + props.draftContent.slice(1)}
      </span>
      <span style={{ opacity: 0.25 }}>{props.isOpenEnded ? "..." : ""}</span>
    </Fragment>
  );
}

function AssistantMessage(props: { content: string; spokenContent: string; synthesizedContent: string }) {
  const [spoken, synthesized, remaining] = useMemo(() => {
    const remainingAfterSpoken = removePrefixSpaceInsensitive(props.content, props.spokenContent);
    const spoken = props.content.slice(0, props.content.length - remainingAfterSpoken.length);

    const remainingAfterSynthesized = removePrefixSpaceInsensitive(props.content, props.synthesizedContent);
    const synthesized = props.content.slice(spoken.length, props.content.length - remainingAfterSynthesized.length);

    return [spoken, synthesized, remainingAfterSynthesized];
  }, [props.content, props.spokenContent, props.synthesizedContent]);

  return (
    <Fragment>
      <span className="c-raw-message" style={{ background: "black", color: "white" }}>
        {spoken}
      </span>
      <span className="c-raw-message" style={{ opacity: 0.75 }}>
        {synthesized}
      </span>
      <span className="c-raw-message" style={{ opacity: 0.25 }}>
        {remaining}
      </span>
    </Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

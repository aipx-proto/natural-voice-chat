import { useMemo, useRef, useState } from "react";
import { ChatMessage } from "./chat";

export interface ThreadItem {
  id: number;
  role: ChatMessage["role"];
  content: string;
  spokenContent?: string;
  synthesizedContent?: string;
  draftContent?: string;
  isOpenEnded?: boolean;
}
export interface UseThreadProps {
  getInitialMessages?: () => { role: ChatMessage["role"]; content: string }[];
}
export function useThread(props?: UseThreadProps) {
  const threadIdRef = useRef(0);
  const threadRef = useRef<ThreadItem[]>(props?.getInitialMessages?.().map((message) => ({ ...message, id: ++threadIdRef.current })) ?? []);
  const [threadMutationState, setThreadMutationState] = useState(0);

  function appendMessage(message: { role: ChatMessage["role"]; content: string }, options?: { reuseOpen?: boolean; leaveOpen?: boolean; asDraft?: boolean }) {
    let openMessage = options?.reuseOpen ? threadRef.current.find((maybeOpen) => maybeOpen.role === message.role && maybeOpen.isOpenEnded) : null;
    if (!openMessage && threadRef.current.at(-1)?.role === message.role) openMessage = threadRef.current.at(-1); // ok to merge with last message of the same role

    if (openMessage) {
      // trim after openMessage
      threadRef.current = threadRef.current.slice(0, threadRef.current.indexOf(openMessage) + 1);
      if (options?.asDraft) {
        setDraft(openMessage.id, message.content);
      } else {
        appendContent(openMessage.id, message.content, !options?.asDraft);
      }
      return openMessage.id;
    } else {
      const newId = ++threadIdRef.current;
      if (options?.asDraft) {
        threadRef.current = [
          ...threadRef.current,
          { ...message, content: "", draftContent: message.content, id: newId, isOpenEnded: options?.leaveOpen ?? false },
        ];
        setThreadMutationState((prev) => prev + 1);
      } else {
        threadRef.current = [...threadRef.current, { ...message, id: newId, isOpenEnded: options?.leaveOpen ?? false }];
        setThreadMutationState((prev) => prev + 1);
      }
      return newId;
    }
  }

  function trimToSpokenContent() {
    threadRef.current = threadRef.current
      .filter((message) => message.role !== "assistant" || message.spokenContent?.length)
      .map((message) =>
        message.role !== "assistant"
          ? message
          : {
              ...message,
              content: message.spokenContent!,
              synthesizedContent: message.spokenContent,
            }
      );
    setThreadMutationState((prev) => prev + 1);
  }

  function closeMessage(id: number) {
    threadRef.current = threadRef.current.map((message) => (message.id === id ? { ...message, isOpenEnded: false } : message));
    setThreadMutationState((prev) => prev + 1);
  }

  function appendContent(id: number, content: string, clearDraft?: boolean) {
    threadRef.current = threadRef.current.map((message) =>
      message.id === id
        ? { ...message, content: message.content + (message.content ? " " : "") + content, draftContent: clearDraft ? undefined : message.draftContent }
        : message
    );
    setThreadMutationState((prev) => prev + 1);
  }

  function setDraft(id: number, content: string) {
    threadRef.current = threadRef.current.map((message) => (message.id === id ? { ...message, draftContent: content } : message));
    setThreadMutationState((prev) => prev + 1);
  }

  function appendSpokenContent(id: number, spoken: string) {
    threadRef.current = threadRef.current.map((message) =>
      message.id === id ? { ...message, spokenContent: (message.spokenContent ?? "") + spoken } : message
    );
    setThreadMutationState((prev) => prev + 1);
  }

  function appendSynthesizedContent(id: number, synthesized: string) {
    threadRef.current = threadRef.current.map((message) =>
      message.id === id ? { ...message, synthesizedContent: (message.synthesizedContent ?? "") + synthesized } : message
    );
    setThreadMutationState((prev) => prev + 1);
  }

  function reset() {
    threadRef.current = [...(props?.getInitialMessages?.().map((message) => ({ ...message, id: ++threadIdRef.current })) ?? [])];
    setThreadMutationState((prev) => prev + 1);
  }

  const thread = useMemo(() => threadRef.current, [threadMutationState]);

  return {
    threadRef,
    thread,
    reset,
    appendMessage,
    appendContent,
    appendSpokenContent,
    appendSynthesizedContent,
    closeMessage,
    trimToSpokenContent,
  };
}

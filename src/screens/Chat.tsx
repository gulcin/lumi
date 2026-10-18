import { useEffect, useState } from "react";
import { Shell, TopBar } from "../components/Chrome";
import { Lumi } from "../components/Lumi";
import { moderationReason } from "../lib/moderate";
import { loadSyncMeta, sendChat } from "../lib/syncClient";
import { speak } from "../lib/speech";
import type { Progress } from "../lib/types";

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function recognition(): SpeechRec | null {
  const ctor = (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec; SpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition
    ?? (window as unknown as { SpeechRecognition?: new () => SpeechRec }).SpeechRecognition;
  if (!ctor) return null;
  const rec = new ctor();
  rec.lang = "en-GB";
  rec.interimResults = false;
  return rec;
}

export function ChatScreen({
  progress,
  speechOn,
  topicHint,
  onBack,
}: {
  progress: Progress;
  speechOn: boolean;
  topicHint?: string;
  onBack: () => void;
}) {
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const line = "Hold the button and ask Lumi why.";
  useEffect(() => {
    if (speechOn) speak(line);
  }, [speechOn]);

  async function ask(message: string) {
    const cleaned = message.trim();
    if (!cleaned) return;
    if (moderationReason(cleaned, "input")) {
      const safe = "Let's ask a grown-up about that. What else are you curious about?";
      setReply(safe);
      if (speechOn) speak(safe);
      return;
    }
    const code = loadSyncMeta().familyCode;
    if (!code) {
      setError("A grown-up needs to join a family code before Lumi can answer.");
      return;
    }
    setError("");
    try {
      const next = await sendChat(code, progress.childKey, cleaned, topicHint);
      setReply(next);
      if (speechOn) speak(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Lumi could not answer.");
    }
  }

  return (
    <Shell>
      <TopBar title="Ask Lumi" onBack={onBack} speechOn={speechOn} onReplay={() => speak(reply || line)} />
      <Lumi mood={listening ? "think" : "happy"} wearing={progress.wearing} />
      <h1 data-testid="voice-chat">Why?</h1>
      <button
        type="button"
        className={listening ? "mic live" : "mic"}
        data-testid="mic"
        onPointerDown={() => {
          const rec = recognition();
          if (!rec) {
            setError("This browser has no microphone listening. Type your question instead.");
            return;
          }
          setListening(true);
          rec.onresult = (event) => {
            const said = event.results[0]?.[0]?.transcript ?? "";
            setText(said);
            void ask(said);
          };
          rec.onend = () => setListening(false);
          try {
            rec.start();
          } catch {
            setListening(false);
          }
          (window as unknown as { __lumiRec?: SpeechRec }).__lumiRec = rec;
        }}
        onPointerUp={() => {
          const rec = (window as unknown as { __lumiRec?: SpeechRec }).__lumiRec;
          try {
            rec?.stop();
          } catch {
            /* already stopped */
          }
          setListening(false);
        }}
      >
        {listening ? "Listening" : "Hold to ask"}
      </button>
      <label className="field">
        Or type
        <input value={text} maxLength={240} onChange={(event) => setText(event.target.value)} />
      </label>
      <button type="button" className="primary" data-testid="chat-send" onClick={() => void ask(text)}>
        Ask
      </button>
      {reply ? <p className="lede" data-testid="chat-reply">{reply}</p> : null}
      {error ? <p role="status">{error}</p> : null}
    </Shell>
  );
}

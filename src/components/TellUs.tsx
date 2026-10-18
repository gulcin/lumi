import { useEffect, useState, useSyncExternalStore } from "react";
import { buildInfo } from "../lib/buildInfo";
import { createReport, reportMailto, screenLabel, type FeedbackKind, type FeedbackReport } from "../lib/feedback";
import { closeTell, feedbackPlace, subscribeTell, tellSheetOpen, openTell } from "../lib/feedbackPlace";
import { flushReports, postReport, readReports, rememberReport, subscribeReports } from "../lib/feedbackStore";
import { Lumi } from "./Lumi";

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function recognition(): SpeechRec | null {
  const host = window as unknown as {
    webkitSpeechRecognition?: new () => SpeechRec;
    SpeechRecognition?: new () => SpeechRec;
  };
  const Ctor = host.webkitSpeechRecognition ?? host.SpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "en-GB";
  rec.interimResults = false;
  return rec;
}

export function TellButton() {
  return (
    <button type="button" className="tell-btn" data-testid="tell-us" aria-label="Report a bug / Tell us" onClick={() => openTell()}>
      <Lumi mood="listen" className="lumi-tiny" />
      <span>Tell us</span>
    </button>
  );
}

export function TellUs() {
  const open = useSyncExternalStore(subscribeTell, tellSheetOpen, () => false);
  const place = useSyncExternalStore(subscribeTell, feedbackPlace, feedbackPlace);
  const [kind, setKind] = useState<FeedbackKind | "">("");
  const [note, setNote] = useState("");
  const [listening, setListening] = useState(false);
  const [saved, setSaved] = useState<FeedbackReport | null>(null);
  const [mailed, setMailed] = useState("");

  useEffect(() => {
    void flushReports();
    const onOnline = () => {
      void flushReports();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  useEffect(() => {
    if (!open) {
      setKind("");
      setNote("");
      setListening(false);
      setSaved(null);
      setMailed("");
    }
  }, [open]);

  function dictate() {
    const rec = recognition();
    if (!rec) return;
    setListening(true);
    rec.onresult = (event) => {
      const said = event.results[0]?.[0]?.transcript ?? "";
      if (said) setNote((current) => (current ? `${current} ${said}` : said));
    };
    rec.onend = () => setListening(false);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }

  function submit() {
    if (kind !== "bug" && kind !== "idea") return;
    const report = createReport({
      kind,
      note,
      screen: place.screen,
      lesson: place.lesson,
      skill: place.skill,
      version: buildInfo.version,
      device: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    });
    rememberReport(localStorage, report);
    setSaved(report);
    setMailed(reportMailto(report));
    void postReport(report).then((status) => {
      if (status === "sent") setMailed("");
    });
  }

  if (!open) return null;
  const where = place.lesson || screenLabel(place.screen);
  return (
    <div className="tell-scrim" role="presentation">
      <section className="tell-card" role="dialog" aria-modal="true" aria-labelledby="tell-title" data-testid="tell-card">
        <Lumi mood={saved ? "happy" : "listen"} className="lumi-tiny" />
        {saved ? (
          <>
            <h1 id="tell-title">Lumi heard you.</h1>
            <p>Your note is saved on this device.</p>
            {mailed ? (
              <a className="primary tell-send" data-testid="send-mum" href={mailed}>
                Send to Mum
              </a>
            ) : (
              <p className="muted" data-testid="tell-sent">
                Sent.
              </p>
            )}
            <button type="button" className="secondary" data-testid="tell-done" onClick={() => closeTell()}>
              Done
            </button>
          </>
        ) : (
          <>
            <h1 id="tell-title">Tell us</h1>
            <div className="tell-kinds">
              <button type="button" className={kind === "bug" ? "tell-kind on" : "tell-kind"} data-testid="tell-bug" onClick={() => setKind("bug")}>
                <Lumi mood="think" className="lumi-tiny" />
                Bug
              </button>
              <button type="button" className={kind === "idea" ? "tell-kind on" : "tell-kind"} data-testid="tell-idea" onClick={() => setKind("idea")}>
                <Lumi mood="cheer" className="lumi-tiny" />
                Idea
              </button>
            </div>
            <label className="field">
              <span className="sr">Your note</span>
              <textarea
                data-testid="tell-note"
                rows={3}
                maxLength={1000}
                placeholder="What happened?"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            <button type="button" className="secondary" data-testid="tell-dictate" onClick={dictate}>
              {listening ? "Listening…" : "Say it"}
            </button>
            <p className="tiny muted" data-testid="tell-where">
              This note remembers {where}.
            </p>
            <button type="button" className="primary" data-testid="tell-submit" disabled={!kind} onClick={submit}>
              Send
            </button>
            <button type="button" className="text-btn" onClick={() => closeTell()}>
              Not now
            </button>
          </>
        )}
      </section>
    </div>
  );
}

export function ReportList() {
  const reports = useSyncExternalStore(subscribeReports, () => readReports(), () => []);
  if (!reports.length) return <p className="muted">No notes yet. The Tell us button on each screen saves them here.</p>;
  return (
    <ul className="reason-list" data-testid="report-list">
      {reports.map((report) => (
        <li key={report.id}>
          <strong>{report.kind === "bug" ? "Bug" : "Idea"}</strong>
          <span> · {report.screen}{report.lesson ? ` · ${report.lesson}` : ""}</span>
          <p>{report.note || "(no note)"}</p>
          <small className="muted">
            v{report.version} · {report.viewport} · {new Date(report.createdAt).toLocaleString()} · {report.sentAt ? "Sent" : "On this device"}
          </small>
        </li>
      ))}
    </ul>
  );
}

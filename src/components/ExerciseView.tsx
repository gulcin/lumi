import { useState } from "react";
import { exerciseHint } from "../lib/exerciseHint";
import type { Exercise } from "../lib/generators/types";
import { VisualView } from "./Visuals";

export function ExerciseView({
  exercise,
  e2e,
  disabled,
  onAnswer,
}: {
  exercise: Exercise;
  e2e: boolean;
  disabled?: boolean;
  onAnswer: (correct: boolean) => void;
}) {
  return (
    <div
      className="exercise"
      data-testid="exercise"
      data-kind={exercise.kind}
      data-generator={exercise.generatorId}
      data-topic={exercise.topicId}
      data-answer={e2e ? answerToken(exercise) : undefined}
    >
      <p className="prompt">{exercise.prompt}</p>
      <Hint clue={exerciseHint(exercise)} />
      {exercise.visual?.type === "equation" && exercise.visual.text === exercise.prompt ? null : (
        <VisualView visual={exercise.visual} />
      )}
      {exercise.kind === "choice" ? (
        <ChoiceAnswers exercise={exercise} disabled={disabled} onAnswer={onAnswer} />
      ) : null}
      {exercise.kind === "number" ? (
        <NumberPad
          key={exercise.id}
          mode={exercise.numeric ?? "int"}
          disabled={disabled}
          onSubmit={(value) => {
            const numeric = Number(value);
            onAnswer(exercise.answer != null && Number.isFinite(numeric) && Math.abs(numeric - exercise.answer) < 0.001);
          }}
        />
      ) : null}
      {exercise.kind === "order" ? (
        <OrderAnswer key={exercise.id} exercise={exercise} disabled={disabled} onAnswer={onAnswer} />
      ) : null}
      {exercise.kind === "talk" ? <TalkAnswer exercise={exercise} disabled={disabled} onAnswer={onAnswer} /> : null}
    </div>
  );
}

function Hint({ clue }: { clue: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="hint-row">
      <button type="button" className="hint-btn" data-testid="hint" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        Hint
      </button>
      {open ? (
        <p className="hint-text" data-testid="hint-text">
          {clue}
        </p>
      ) : null}
    </div>
  );
}

function answerToken(exercise: Exercise): string {
  if (exercise.kind === "choice") return exercise.correctId ?? "";
  if (exercise.kind === "number") return String(exercise.answer ?? "");
  if (exercise.kind === "order") return (exercise.correctOrder ?? []).join("|");
  return "talked";
}

function ChoiceAnswers({
  exercise,
  disabled,
  onAnswer,
}: {
  exercise: Exercise;
  disabled?: boolean;
  onAnswer: (correct: boolean) => void;
}) {
  return (
    <div className="choices">
      {exercise.choices?.map((choice) => (
        <button
          key={choice.id}
          type="button"
          className="choice"
          data-choice-id={choice.id}
          disabled={disabled}
          onClick={() => onAnswer(choice.id === exercise.correctId)}
        >
          {choice.emoji ? <span className="choice-emoji">{choice.emoji}</span> : null}
          <span>{choice.label}</span>
        </button>
      ))}
    </div>
  );
}

function NumberPad({
  mode,
  disabled,
  onSubmit,
}: {
  mode: "int" | "decimal" | "negative";
  disabled?: boolean;
  onSubmit: (value: string) => void;
}) {
  const [entry, setEntry] = useState("");
  const [neg, setNeg] = useState(false);
  const shown = `${neg ? "−" : ""}${entry || "0"}`;
  const push = (digit: string) => {
    setEntry((current) => {
      if (digit === ".") {
        if (current.includes(".")) return current;
        return current ? `${current}.` : "0.";
      }
      if (current === "0") return digit;
      if (current.replace(".", "").length >= 6) return current;
      return `${current}${digit}`;
    });
  };
  return (
    <div className="pad">
      <div className="pad-display" aria-live="polite">
        {shown}
      </div>
      <div className="pad-grid">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <button key={digit} type="button" data-testid={`key-${digit}`} disabled={disabled} onClick={() => push(digit)}>
            {digit}
          </button>
        ))}
        {mode === "negative" ? (
          <button type="button" data-testid="key-neg" disabled={disabled} onClick={() => setNeg((value) => !value)}>
            ±
          </button>
        ) : mode === "decimal" ? (
          <button type="button" data-testid="key-dot" disabled={disabled} onClick={() => push(".")}>
            .
          </button>
        ) : (
          <button type="button" data-testid="key-clear" disabled={disabled} onClick={() => { setEntry(""); setNeg(false); }}>
            C
          </button>
        )}
        <button type="button" data-testid="key-0" disabled={disabled} onClick={() => push("0")}>
          0
        </button>
        <button
          type="button"
          className="pad-ok"
          data-testid="key-ok"
          disabled={disabled || entry === "" || entry === "."}
          onClick={() => onSubmit(`${neg ? "-" : ""}${entry}`)}
        >
          OK
        </button>
      </div>
    </div>
  );
}

function OrderAnswer({
  exercise,
  disabled,
  onAnswer,
}: {
  exercise: Exercise;
  disabled?: boolean;
  onAnswer: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const items = exercise.items ?? [];
  const byId = new Map(items.map((item) => [item.id, item]));
  const rest = items.filter((item) => !picked.includes(item.id));
  return (
    <div className="order">
      <div className="order-tray" aria-live="polite">
        {picked.length === 0 ? <span className="muted">Tap the words in order</span> : null}
        {picked.map((id, index) => (
          <button
            key={id}
            type="button"
            className="chip chip-on"
            disabled={disabled}
            onClick={() => setPicked((current) => current.filter((item) => item !== id))}
          >
            {index + 1}. {byId.get(id)?.label}
          </button>
        ))}
      </div>
      <div className="order-bank">
        {rest.map((item) => (
          <button
            key={item.id}
            type="button"
            className="chip"
            data-order-id={item.id}
            disabled={disabled}
            onClick={() => setPicked((current) => [...current, item.id])}
          >
            {item.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="primary"
        data-testid="order-done"
        disabled={disabled || picked.length !== items.length}
        onClick={() => onAnswer(picked.join("|") === (exercise.correctOrder ?? []).join("|"))}
      >
        That's my order
      </button>
    </div>
  );
}

function TalkAnswer({
  exercise,
  disabled,
  onAnswer,
}: {
  exercise: Exercise;
  disabled?: boolean;
  onAnswer: (correct: boolean) => void;
}) {
  return (
    <div className="talk">
      <p>Show a grown-up and talk about one of these.</p>
      <ul>
        {exercise.talkPoints?.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <button type="button" className="primary" data-testid="talk-yes" disabled={disabled} onClick={() => onAnswer(true)}>
        We talked about it
      </button>
      <button type="button" className="ghost" data-testid="talk-no" disabled={disabled} onClick={() => onAnswer(false)}>
        Not yet
      </button>
    </div>
  );
}

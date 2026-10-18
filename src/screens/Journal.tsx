import { useEffect, useState } from "react";
import { Shell, TopBar } from "../components/Chrome";
import { deleteJournalPhoto, FACE_REMINDER, listJournalPhotos, saveJournalPhoto, downscaleImage, type JournalPhoto } from "../lib/journal";
import { speak } from "../lib/speech";

export function JournalScreen({
  speechOn,
  onBack,
  topicId,
  topicName,
  grownup,
}: {
  speechOn: boolean;
  onBack: () => void;
  topicId?: string;
  topicName?: string;
  grownup?: boolean;
}) {
  const [photos, setPhotos] = useState<JournalPhoto[]>([]);
  const [caption, setCaption] = useState("");
  const [cheer, setCheer] = useState("");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const line = grownup ? "Photos stay on this device. They are not synced." : FACE_REMINDER;
  useEffect(() => {
    if (speechOn) speak(line);
  }, [speechOn, line]);
  useEffect(() => {
    let cancel = false;
    void listJournalPhotos().then((rows) => {
      if (cancel) return;
      setPhotos(rows);
      const next: Record<string, string> = {};
      for (const row of rows) next[row.id] = URL.createObjectURL(row.blob);
      setUrls(next);
    });
    return () => {
      cancel = true;
    };
  }, []);
  return (
    <Shell>
      <TopBar title={grownup ? "Photo journal" : "Show Lumi"} onBack={onBack} speechOn={speechOn} onReplay={() => speak(line)} />
      <h1 data-testid="journal">{grownup ? "On this device" : "Show what you made"}</h1>
      <p className="lede">{line}</p>
      <label className="field">
        A few words
        <input value={caption} maxLength={80} onChange={(event) => setCaption(event.target.value)} placeholder={topicName ?? "What is it?"} />
      </label>
      <label className="field">
        Photo
        <input
          data-testid="journal-file"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const blob = await downscaleImage(file);
            const photo: JournalPhoto = {
              id: `j_${Date.now().toString(36)}`,
              topicId: topicId ?? "home",
              topicName: topicName ?? "Something I made",
              caption: caption.trim() || topicName || "Something I made",
              createdAt: Date.now(),
              blob,
            };
                await saveJournalPhoto(photo);
                setPhotos((current) => [photo, ...current]);
                setUrls((current) => ({ ...current, [photo.id]: URL.createObjectURL(blob) }));
                setCaption("");
                const praise = "I can see what you made. That is a real thing, not only a screen.";
                setCheer(praise);
                if (speechOn) speak(praise);
          }}
        />
      </label>
      {cheer ? <p className="lede" data-testid="journal-cheer">{cheer}</p> : null}
      <div className="journal-grid">
        {photos.length === 0 ? <p className="muted">No photos yet. They stay in this browser and are never uploaded.</p> : null}
        {photos.map((photo) => (
          <article key={photo.id} className="card">
            {urls[photo.id] ? <img src={urls[photo.id]} alt="" /> : null}
            <p>
              <strong>{photo.caption}</strong>
            </p>
            <p className="tiny muted">{photo.topicName}</p>
            {grownup ? (
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  void deleteJournalPhoto(photo.id);
                  setPhotos((current) => current.filter((item) => item.id !== photo.id));
                }}
              >
                Remove from this device
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </Shell>
  );
}

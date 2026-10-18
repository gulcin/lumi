import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { isFamilyCode, normalizeFamilyCode } from "../lib/familyCode";
import { createFamily, joinUrl, loadSyncMeta, lookupFamily, saveSyncMeta, syncConfigured, type SyncMeta } from "../lib/syncClient";
import type { Progress } from "../lib/types";

export function SyncPanel({
  progress,
  onJoin,
}: {
  progress: Progress;
  onJoin: (code: string, childKey: string | null) => void;
}) {
  const [meta, setMeta] = useState<SyncMeta>(() => loadSyncMeta());
  const [join, setJoin] = useState("");
  const [qr, setQr] = useState("");
  const [message, setMessage] = useState(meta.lastError ?? meta.status ?? "");
  const configured = syncConfigured();
  useEffect(() => {
    if (!meta.familyCode) {
      setQr("");
      return;
    }
    void QRCode.toDataURL(joinUrl(meta.familyCode), { margin: 1, width: 280 }).then(setQr);
  }, [meta.familyCode]);
  if (!configured) return null;
  return (
    <section data-testid="sync-settings">
      <h2>Family sync</h2>
      <p>
        Optional. A secret code lets this nickname and lesson progress follow Aida to another device. Nothing else is stored. The code is the key. It cannot be listed or guessed from the family book.
      </p>
      {meta.familyCode ? (
        <article className="card">
          <p>
            Family code
          </p>
          <p className="prompt" data-testid="family-code">
            {meta.familyCode}
          </p>
          {qr ? <img className="qr" alt="QR code for this family" src={qr} /> : null}
          <p className="tiny muted">Scan on the other device, or type the code in Join.</p>
        </article>
      ) : (
        <button
          type="button"
          className="primary"
          onClick={() => {
            void createFamily()
              .then((code) => {
                const next = { ...loadSyncMeta(), familyCode: code, dirty: true, status: "Code ready on this device." };
                saveSyncMeta(next);
                setMeta(next);
                setMessage("Code ready. Open Lumi on the other device and join.");
                onJoin(code, null);
              })
              .catch((error: unknown) => {
                setMessage(
                  `${error instanceof Error ? error.message : "Offline."} Try again when this device is online, or type a code you already have.`,
                );
              });
          }}
        >
          Create a family sync code
        </button>
      )}
      <label className="field">
        Join this family on another device
        <input
          value={join}
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="apple-river-maple-otter-0123abcd"
          onChange={(event) => setJoin(event.target.value)}
        />
      </label>
      <button
        type="button"
        className="secondary"
        onClick={() => {
          const code = normalizeFamilyCode(join);
          if (!isFamilyCode(code)) {
            setMessage("Enter the four words and the ending from the other device.");
            return;
          }
          void lookupFamily(code)
            .then((children) => {
              const match =
                children.find((child) => child.nickname.toLowerCase() === progress.childName.toLowerCase()) ??
                (children.length === 1 ? children[0] : undefined);
              saveSyncMeta({ familyCode: code, dirty: true, status: "Joined. Syncing this device." });
              setMeta(loadSyncMeta());
              setMessage("Joined. Progress will merge, keeping the strongest mastery.");
              onJoin(code, match?.childKey ?? null);
            })
            .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Could not join."));
        }}
      >
        Join
      </button>
      {meta.lastSyncedAt ? <p className="tiny muted">Last sync {new Date(meta.lastSyncedAt).toLocaleString("en-GB")}</p> : null}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}

import Link from "next/link";
import { Badge, StepBadge } from "@/components/Badge";
import { Blocks } from "@/components/uve";
import { getFieldLabels, getLanguages, getLocalisedFor, getSourceVersions } from "@/lib/dotcms";
import { CHANNEL_LABELS, EXTERNAL_CHANNELS, REGION_LABELS, formatDate, languageName, topicName } from "@/lib/format";
import type { MessagingSot } from "@/lib/types";

/** A source of truth: its key messages, versions, owner, and every localised
 * message made from it with its workflow status. */
export async function TopicView({ sot }: { sot: MessagingSot }) {
  const [versions, owners, languages] = await Promise.all([
    getSourceVersions(sot.sotKey),
    getFieldLabels("PdMessagingSot", "owner"),
    getLanguages(),
  ]);
  const current = versions.find((v) => v.status === "current");
  const superseded = sot.status === "superseded";
  const localised = await getLocalisedFor(versions.map((v) => v.identifier));
  const owner = owners[sot.owner] ?? sot.owner;

  return (
    <div className="container-page py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/hub">Messaging Hub</Link> <span aria-hidden>›</span> {topicName(sot.topic)}
      </nav>

      {superseded && current && (
        <div role="status" className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-red/30 bg-red-soft p-4">
          <Badge tone="danger">Superseded</Badge>
          <span>
            This is version {sot.version}. Don&apos;t use it for new content.{" "}
            <Link href={`/topics/${current.urlTitle}`} className="font-semibold">
              Go to the current version (v{current.version}) →
            </Link>
          </span>
        </div>
      )}

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <p className="eyebrow">Source of truth · {topicName(sot.topic)}</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight">{sot.title}</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone={superseded ? "danger" : "success"}>{superseded ? "Superseded" : "Current"}</Badge>
            <Badge>Version {sot.version}</Badge>
            {sot.approvedDate && <Badge>Approved {formatDate(sot.approvedDate)}</Badge>}
            {sot.reviewByDate && <Badge tone="warning">Review by {formatDate(sot.reviewByDate)}</Badge>}
          </div>

          <section className="mt-10" aria-labelledby="key-messages">
            <h2 id="key-messages" className="sr-only">Key messages</h2>
            <Blocks value={sot.keyMessages} className="prose-ui text-[17px]" />
          </section>

          <section className="mt-10 rounded-lg border border-line p-6" aria-labelledby="proof">
            <h2 id="proof" className="text-lg font-bold">Approved proof points</h2>
            <Blocks value={sot.proofPoints} className="prose-ui mt-3" />
          </section>

          {sot.doNotSay && (
            <section className="mt-6 rounded-lg border border-red/25 bg-red-soft/50 p-6" aria-labelledby="dns">
              <h2 id="dns" className="text-lg font-bold">Do-not-say list</h2>
              <p className="mt-1 text-sm text-muted">A manual reference for writers and reviewers.</p>
              <ul className="mt-3 space-y-2">
                {sot.doNotSay.split(/\r?\n/).filter(Boolean).map((line) => {
                  const [avoid, instead] = line.split("→").map((s) => s.trim());
                  return (
                    <li key={line} className="text-[15px]">
                      <span className="font-semibold text-red line-through decoration-1">{avoid}</span>
                      {instead && <> → <span>{instead}</span></>}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="mt-12" aria-labelledby="localised">
            <h2 id="localised" className="text-2xl font-bold">Localised messages</h2>
            <p className="mt-1 text-muted">Every regional version made from this topic, and where it is in review.</p>
            {localised.length === 0 ? (
              <p className="mt-6 rounded-lg bg-warm p-5 text-muted">No localised messages yet.</p>
            ) : (
              <ul className="mt-6 space-y-4">
                {localised.map(({ message, state, lastComment }) => {
                  const rejected = state?.step === "Draft" && lastComment !== undefined && state.assignedTo === "CMS Owner";
                  const external = EXTERNAL_CHANNELS.includes(message.targetChannel);
                  const parentVersion = versions.find((v) => v.identifier === (Array.isArray(message.parentSot) ? message.parentSot[0] : message.parentSot)?.identifier);
                  return (
                    <li key={`${message.identifier}-${message.languageId}`} className="rounded-lg border border-line p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">{message.title}</h3>
                          <p className="mt-1 text-sm text-muted">
                            {REGION_LABELS[message.region] ?? message.region} · {languageName(languages[message.languageId])} ·{" "}
                            {CHANNEL_LABELS[message.targetChannel] ?? message.targetChannel}
                            {message.smeNeeded === "yes" && " · SME review needed"}
                            {parentVersion && ` · from v${parentVersion.version}`}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StepBadge step={state?.step} rejected={rejected} />
                          {external && state?.step === "Ready for External Channel" && <Badge tone="external">Publish in Sprinklr</Badge>}
                        </div>
                      </div>
                      <Blocks value={message.body} className="prose-ui mt-3 text-[15px] text-ink-soft" />
                      {lastComment && (
                        <p className={`mt-4 rounded p-3 text-sm ${rejected ? "bg-red-soft" : "bg-warm"}`}>
                          <strong>{lastComment.postedBy}:</strong> {lastComment.commentDescription}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <div className="rounded-lg bg-ink p-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Who do I ask?</p>
            <p className="mt-2 text-lg font-semibold">{owner.split(",")[0]}</p>
            <p className="text-sm text-white/80">{owner.split(",").slice(1).join(",").trim()}</p>
            <a href={`mailto:${sot.owner}`} className="mt-4 inline-block text-sm font-semibold text-white underline">
              {sot.owner}
            </a>
          </div>
          <div className="rounded-lg border border-line p-6">
            <h2 className="font-semibold">Versions</h2>
            <ol className="mt-3 space-y-3 text-sm">
              {versions.map((v) => (
                <li key={v.identifier} className="flex items-center justify-between gap-2">
                  {v.identifier === sot.identifier ? (
                    <strong>Version {v.version} (this page)</strong>
                  ) : (
                    <Link href={`/topics/${v.urlTitle}`}>Version {v.version}</Link>
                  )}
                  <Badge tone={v.status === "current" ? "success" : "danger"}>{v.status === "current" ? "Current" : "Superseded"}</Badge>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}

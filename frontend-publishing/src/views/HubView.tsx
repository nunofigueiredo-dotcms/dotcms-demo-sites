import Link from "next/link";
import { Badge, StepBadge } from "@/components/Badge";
import {
  currentUser, getFieldLabels, getGovernedItems, getSchemeId, getSources, tasksForUser,
} from "@/lib/dotcms";
import { firstParagraph, formatDate, topicName } from "@/lib/format";
import { hubSession, readerName } from "@/lib/session";
import type { HubUser, MessagingSot } from "@/lib/types";
import { first } from "@/lib/types";

const TOPICS = [
  { key: "pdResearchIntegrity", name: "Research integrity" },
  { key: "pdOpenAccess", name: "Open access" },
  { key: "pdAiInResearch", name: "AI in research" },
  { key: "pdResearchFundingImpact", name: "Research funding impact" },
];

interface HubViewProps {
  q?: string;
  topic?: string;
  signInFailed?: boolean;
}

/** The intranet-style Messaging Hub: approved messaging only, who owns it,
 * and what's waiting in review for the signed-in user. */
export async function HubView({ q, topic, signInFailed }: HubViewProps) {
  const session = await hubSession();
  const reader = session ? await readerName() : undefined;
  const [current, superseded, owners, user] = await Promise.all([
    getSources({ status: "current", q, topic }),
    q ? getSources({ status: "superseded", q, topic }) : Promise.resolve([] as MessagingSot[]),
    getFieldLabels("PdMessagingSot", "owner"),
    session ? currentUser(session) : Promise.resolve(null),
  ]);
  const allCurrent = superseded.length ? await getSources({ status: "current" }) : current;
  const currentFor = (key: string) => allCurrent.find((s) => s.sotKey === key);

  return (
    <div>
      <section className="bg-ink text-white">
        <div className="container-page py-12 md:py-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-white/70">Academic &amp; Government · internal</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold md:text-5xl">Messaging Hub</h1>
          <p className="mt-3 max-w-2xl text-lg text-white/85">
            The approved, current messaging for every topic, who owns it, and where each regional version is in review.
          </p>
          <form action="/hub" method="get" role="search" className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
            <label htmlFor="q" className="sr-only">Search messaging</label>
            <input
              id="q" name="q" defaultValue={q} placeholder="Search key messages, proof points, phrases…"
              className="h-12 flex-1 rounded-full border-0 bg-white px-5 text-ink placeholder:text-muted"
            />
            {topic && <input type="hidden" name="topic" value={topic} />}
            <button className="btn h-12 justify-center !border-orange !bg-orange !text-ink hover:!bg-[#ff7a4d]">Search</button>
          </form>
        </div>
      </section>

      <div className="container-page grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <nav aria-label="Filter by topic" className="flex flex-wrap gap-2">
            <TopicChip label="All topics" href={q ? `/hub?q=${encodeURIComponent(q)}` : "/hub"} active={!topic} />
            {TOPICS.map((t) => (
              <TopicChip
                key={t.key}
                label={t.name}
                active={topic === t.key}
                href={`/hub?topic=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              />
            ))}
          </nav>

          <section id="sources" className="mt-8" aria-labelledby="sources-heading">
            <h2 id="sources-heading" className="text-2xl font-bold">
              {q ? `Current messaging matching “${q}”` : "Current sources of truth"}
            </h2>
            <p className="mt-1 text-sm text-muted">Only the current, approved version of each topic is listed.</p>
            {current.length === 0 ? (
              <p className="mt-6 rounded-lg bg-warm p-5 text-muted">Nothing current matches. Try another word or topic.</p>
            ) : (
              <ul className="mt-6 grid gap-5">
                {current.map((s) => (
                  <SourceCard key={s.identifier} sot={s} owner={owners[s.owner] ?? s.owner} />
                ))}
              </ul>
            )}
          </section>

          {superseded.length > 0 && (
            <section className="mt-10" aria-labelledby="old-heading">
              <h2 id="old-heading" className="text-lg font-bold">Also found in superseded versions</h2>
              <ul className="mt-4 space-y-3">
                {superseded.map((s) => {
                  const now = currentFor(s.sotKey);
                  return (
                    <li key={s.identifier} className="flex flex-wrap items-center gap-3 rounded-lg border border-red/25 bg-red-soft/40 p-4">
                      <Badge tone="danger">Superseded</Badge>
                      <Link href={`/topics/${s.urlTitle}`} className="text-ink">{s.title} (v{s.version})</Link>
                      {now && (
                        <Link href={`/topics/${now.urlTitle}`} className="ml-auto font-semibold">
                          Use the current version (v{now.version}) →
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          {reader && !user ? <ReaderPanel name={reader} /> : <MyItems user={user} signInFailed={signInFailed} session={session} />}
          <div id="about" className="rounded-lg bg-warm p-6 text-sm text-ink-soft">
            <h2 className="font-semibold text-ink">How this hub works</h2>
            <p className="mt-2">
              Every message here is approved through the <strong>Governed Content</strong> workflow in dotCMS. Content for
              LinkedIn and social is approved here and published in Sprinklr.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function TopicChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`rounded-full border px-4 py-1.5 text-sm font-medium no-underline ${
        active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:bg-warm"
      }`}
    >
      {label}
    </Link>
  );
}

function SourceCard({ sot, owner }: { sot: MessagingSot; owner: string }) {
  const previous = first(sot.supersedes);
  const summary = firstParagraph(sot.keyMessages);
  return (
    <li className="rounded-xl border border-line bg-white p-6 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow">{topicName(sot.topic)}</span>
        <Badge tone="success">Current · v{sot.version}</Badge>
        {sot.reviewByDate && <Badge tone="warning">Review by {formatDate(sot.reviewByDate)}</Badge>}
      </div>
      <h3 className="mt-3 text-xl font-semibold">
        <Link href={`/topics/${sot.urlTitle}`} className="text-ink no-underline hover:underline">
          {sot.title}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-3 text-[15px] text-ink-soft">{summary}</p>
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-4 text-sm">
        <span>
          <span className="text-muted">Who do I ask?</span>{" "}
          <a href={`mailto:${sot.owner}`} className="font-semibold">{owner.split(",")[0]}</a>
          <span className="text-muted">{owner.includes(",") ? `, ${owner.split(",").slice(1).join(",").trim()}` : ""}</span>
        </span>
        {previous && (
          <span className="flex items-center gap-2">
            <span className="text-muted">Replaces</span>
            <Link href={`/topics/${previous.urlTitle}`} className="text-muted">v{previous.version}</Link>
            <Badge tone="danger">Superseded</Badge>
          </span>
        )}
      </div>
    </li>
  );
}

async function MyItems({ user, session, signInFailed }: { user: HubUser | null; session?: string; signInFailed?: boolean }) {
  if (!user || !session) {
    return (
      <div id="sign-in" className="rounded-lg border border-line p-6">
        <h2 className="text-lg font-semibold">My items in review</h2>
        <p className="mt-1 text-sm text-muted">Sign in with your dotCMS account to see what&apos;s waiting for you.</p>
        {signInFailed && (
          <p role="alert" className="mt-3 rounded bg-red-soft p-2 text-sm text-red">That email and password didn&apos;t work.</p>
        )}
        <form action="/api/hub/login" method="post" className="mt-4 space-y-3">
          <div>
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input id="email" name="email" type="email" autoComplete="username" required className="mt-1 h-10 w-full rounded border border-line px-3" />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required className="mt-1 h-10 w-full rounded border border-line px-3" />
          </div>
          <button className="btn w-full justify-center">Sign in</button>
        </form>
      </div>
    );
  }

  const [schemeId, items] = await Promise.all([getSchemeId(), getGovernedItems()]);
  const myTaskIds = await tasksForUser(session, schemeId);
  const waiting = items.filter(({ state }) => state?.taskId && myTaskIds.has(state.taskId) && !state.resolved);
  const mine = items.filter(
    ({ state }) => state?.createdBy === user.roleId && !state.resolved && !(state.taskId && myTaskIds.has(state.taskId)),
  );

  return (
    <div id="my-items" className="rounded-lg border border-line p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">My items in review</h2>
          <p className="text-sm text-muted">Signed in as {user.name}</p>
        </div>
        <form action="/api/hub/logout" method="post">
          <button className="text-sm font-semibold text-blue underline">Sign out</button>
        </form>
      </div>
      <ItemList title="Waiting for you" empty="Nothing is waiting for you." items={waiting} />
      <ItemList title="Your items in progress" empty="You have nothing in progress." items={mine} />
    </div>
  );
}

/** Field teams: read-only access, nothing to review. */
function ReaderPanel({ name }: { name: string }) {
  return (
    <div id="my-items" className="rounded-lg border border-line p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">My items in review</h2>
          <p className="text-sm text-muted">Signed in as {name}</p>
        </div>
        <form action="/api/hub/logout" method="post">
          <button className="text-sm font-semibold text-blue underline">Sign out</button>
        </form>
      </div>
      <p className="mt-4 rounded bg-warm p-3 text-sm">
        <strong>Read-only access.</strong> You can read and share the current approved messaging. To change it, ask the
        owner listed on each topic.
      </p>
    </div>
  );
}

type GovernedItem = Awaited<ReturnType<typeof getGovernedItems>>[number];

function ItemList({ title, empty, items }: { title: string; empty: string; items: GovernedItem[] }) {
  return (
    <section className="mt-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {items.map(({ item, state }) => (
            <li key={`${item.identifier}-${item.languageId}`} className="text-sm">
              <p className="font-medium leading-snug">{item.title}</p>
              <div className="mt-1">
                <StepBadge step={state?.step} rejected={state?.step === "Draft" && state.assignedTo === "CMS Owner"} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

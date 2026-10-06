"use client";

import { useState } from "react";
import Image from "next/image";
import { Captions, ChevronDown, Hand, Play } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { EditableText } from "@/components/site/EditableText";
import { useIsEditing } from "@/hooks/useIsEditing";
import { isChecked, paragraphs } from "@/utils/content";
import { youtubeId } from "@/utils/youtube";

type TsdVideoProps = DotCMSBasicContentlet & {
  title: string;
  eyebrow?: string;
  text?: string;
  youtubeUrl?: string;
  /** Checkbox: "captions", "asl", "transcript". */
  videoAccessibility?: unknown;
  transcript?: string;
  layout?: "split" | "full";
  theme?: "white" | "mist" | "navy";
};

/**
 * A YouTube video. Nothing loads from YouTube until the visitor presses play
 * (then from youtube-nocookie.com), so the page stays fast and visitors
 * aren't tracked just for opening it. Badges say whether it's captioned or
 * signed in ASL; publishing is refused unless it's one or the other.
 */
export default function TsdVideo(props: TsdVideoProps) {
  const { eyebrow, youtubeUrl, videoAccessibility, transcript, layout = "split", theme = "white" } = props;
  const editing = useIsEditing();
  const [playing, setPlaying] = useState(false);
  const id = youtubeId(youtubeUrl);
  const captions = isChecked(videoAccessibility, "captions");
  const asl = isChecked(videoAccessibility, "asl");
  const light = theme === "navy";

  const video = (
    <div className="video">
      <div className="video__frame">
        {id && playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0${captions ? "&cc_load_policy=1" : ""}`}
            title={props.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : id ? (
          <button type="button" className="video__poster" onClick={() => setPlaying(true)}>
            {/* YouTube's thumbnail, through this site (app/api/video-thumbnail). */}
            <Image src={`/api/video-thumbnail?id=${id}`} alt="" fill unoptimized sizes="(min-width: 1024px) 50vw, 100vw" />
            <span className="video__play">
              <Play aria-hidden className="h-7 w-7" fill="currentColor" />
            </span>
            <span className="sr-only">Play video: {props.title}</span>
          </button>
        ) : (
          <p className="video__missing">{editing ? "Add a YouTube link to show the video." : "Video unavailable."}</p>
        )}
      </div>
      {(captions || asl) && (
        <p className="video__badges">
          {asl && (
            <span>
              <Hand aria-hidden className="h-4 w-4" /> Signed in ASL
            </span>
          )}
          {captions && (
            <span>
              <Captions aria-hidden className="h-4 w-4" /> Captioned
            </span>
          )}
        </p>
      )}
      {transcript && isChecked(videoAccessibility, "transcript") && (
        <details className="video__transcript">
          <summary>
            Transcript <ChevronDown aria-hidden className="h-4 w-4" />
          </summary>
          {paragraphs(transcript).map((p) => (
            <p key={p}>{p}</p>
          ))}
        </details>
      )}
    </div>
  );

  return (
    <section className={`section section--${theme}`}>
      <div className={`container-tsd video-section video-section--${layout}`}>
        <div className="video-section__text">
          {eyebrow && <p className={light ? "eyebrow eyebrow--light" : "eyebrow"}>{eyebrow}</p>}
          <h2 className="section__title">
            <EditableText contentlet={props} field="title" />
          </h2>
          {paragraphs(props.text).map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        {video}
      </div>
    </section>
  );
}

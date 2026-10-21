"use client";

import { useState } from "react";
import Image from "next/image";
import { Captions, ChevronDown, Hand, Play } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { EditableText } from "@/components/site/EditableText";
import { useIsEditing } from "@/hooks/useIsEditing";
import { isChecked, paragraphs } from "@/utils/content";
import { imageSrc, type DotCMSImageField } from "@/utils/images";
import { youtubeId } from "@/utils/youtube";

type TsdVideoProps = DotCMSBasicContentlet & {
  title: string;
  eyebrow?: string;
  text?: string;
  /** "youtube" (default) or "file": a video file hosted on Google Cloud Storage or any https link. */
  videoSource?: "youtube" | "file" | "";
  youtubeUrl?: string;
  /** Hosted file: an .mp4 or .webm, e.g. https://storage.googleapis.com/bucket/video.mp4 */
  videoFileUrl?: string;
  /** Hosted file: its WebVTT captions, picked from the media library (a File field). */
  captionsFile?: string | { identifier?: string } | null;
  /** Hosted file: a link to captions kept elsewhere. Cross-origin, so their host must allow this site (CORS). */
  captionsUrl?: string;
  poster?: DotCMSImageField;
  /** Checkbox: "captions", "asl", "transcript". */
  videoAccessibility?: unknown;
  transcript?: string;
  layout?: "split" | "full";
  theme?: "white" | "mist" | "navy";
};

/**
 * A video from YouTube or a hosted file (Google Cloud Storage, or any https
 * .mp4/.webm). Nothing loads until the visitor presses play: YouTube then
 * comes from youtube-nocookie.com; a hosted file plays in the browser's own
 * player, captions on by default. Badges say whether it's captioned or signed
 * in ASL; publishing is refused unless it's one or the other.
 */
export default function TsdVideo(props: TsdVideoProps) {
  const { eyebrow, youtubeUrl, videoFileUrl, captionsUrl, videoAccessibility, transcript, layout = "split", theme = "white" } = props;
  const editing = useIsEditing();
  const [playing, setPlaying] = useState(false);
  const hosted = props.videoSource === "file";
  // A captions file picked from the media library (or a link to this site's
  // /api/captions route) is served as text/vtt from the page's own origin.
  // A link to captions elsewhere (e.g. next to the video on Cloud Storage)
  // loads cross-origin, which needs crossOrigin — and that makes the browser
  // ask for the video with CORS too, so that host must allow this site.
  const pickedId = typeof props.captionsFile === "string" ? props.captionsFile : props.captionsFile?.identifier;
  const linkedPath = captionsUrl?.match(/^https?:\/\/[^/]+(\/api\/captions\/[0-9a-f]{32}\.vtt)$/)?.[1];
  const captionsPath = pickedId && /^[0-9a-f]{32}$/.test(pickedId) ? `/api/captions/${pickedId}.vtt` : linkedPath;
  const captionsSrc = captionsPath ?? captionsUrl;
  const id = hosted ? undefined : youtubeId(youtubeUrl);
  const posterSrc = imageSrc(props.poster);
  const captions = isChecked(videoAccessibility, "captions");
  const asl = isChecked(videoAccessibility, "asl");
  const light = theme === "navy";

  const video = (
    <div className="video">
      <div className="video__frame">
        {hosted && videoFileUrl ? (
          // The browser's own player: keyboard and screen-reader accessible, captions
          // selectable. preload="none" so nothing downloads until Play.
          <video
            controls
            preload="none"
            playsInline
            poster={posterSrc ? `${posterSrc.split("?")[0].replace(/\/[^/]+\.[a-z0-9]+$/i, "")}/1280w/80q` : undefined}
            crossOrigin={captionsSrc && !captionsPath ? "anonymous" : undefined}
            aria-label={props.title}
          >
            <source src={videoFileUrl} type={videoFileUrl.split("?")[0].toLowerCase().endsWith(".webm") ? "video/webm" : "video/mp4"} />
            {captionsSrc && <track kind="captions" src={captionsSrc} srcLang="en" label="English" default />}
            <p>
              Your browser can&rsquo;t play this video. <a href={videoFileUrl}>Download it</a>.
            </p>
          </video>
        ) : hosted ? (
          <p className="video__missing">{editing ? "Add the video file's address to show the video." : "Video unavailable."}</p>
        ) : id && playing ? (
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

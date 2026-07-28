"use client";

import React, { useEffect, useRef } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";

interface FilebucketPlayerProps {
  src: string;
  type?: string;
  isVideo?: boolean;
}

export function FilebucketPlayer({ src, type, isVideo = true }: FilebucketPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    // Initialize Video.js
    const player = videojs(videoRef.current, {
      controls: true,
      autoplay: false,
      preload: "auto",
      fluid: isVideo,
      responsive: true,
      controlBar: {
        volumePanel: {
          inline: false,
        },
      },
    });

    playerRef.current = player;

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [isVideo]);

  // Update source when src or type changes
  useEffect(() => {
    const player = playerRef.current;
    if (player && !player.isDisposed() && src) {
      player.src({ src, type });
    }
  }, [src, type]);

  const customStyles = `
    /* Premium sleek, borderless dark theme for Video.js */
    .video-js.vjs-theme-filebucket {
      font-family: inherit;
      color: #f1f5f9;
      background-color: transparent;
      border-radius: 8px;
    }

    .video-js.vjs-theme-filebucket .vjs-control-bar {
      background-color: rgba(15, 17, 23, 0.85) !important;
      backdrop-filter: blur(12px);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      height: 48px;
      align-items: center;
      border-bottom-left-radius: 8px;
      border-bottom-right-radius: 8px;
    }

    .video-js.vjs-theme-filebucket .vjs-big-play-button {
      background-color: rgba(99, 102, 241, 0.85) !important;
      border: none !important;
      border-radius: 50% !important;
      width: 64px !important;
      height: 64px !important;
      line-height: 64px !important;
      margin-top: -32px !important;
      margin-left: -32px !important;
      font-size: 24px !important;
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.4) !important;
      transition: all 0.2s ease-in-out !important;
    }

    .video-js.vjs-theme-filebucket:hover .vjs-big-play-button,
    .video-js.vjs-theme-filebucket .vjs-big-play-button:focus {
      background-color: #6366f1 !important;
      transform: scale(1.1);
      box-shadow: 0 0 30px rgba(99, 102, 241, 0.6) !important;
    }

    .video-js.vjs-theme-filebucket .vjs-play-progress {
      background-color: #8b5cf6 !important;
    }

    .video-js.vjs-theme-filebucket .vjs-slider {
      background-color: rgba(255, 255, 255, 0.15);
      border-radius: 2px;
    }

    .video-js.vjs-theme-filebucket .vjs-volume-level {
      background-color: #8b5cf6 !important;
    }

    .video-js.vjs-theme-filebucket .vjs-load-progress {
      background-color: rgba(255, 255, 255, 0.1);
    }
  `;

  return (
    <div className="w-full max-w-4xl mx-auto rounded-lg overflow-hidden bg-black shadow-2xl border border-slate-800">
      <div data-vjs-player className="w-full">
        {isVideo ? (
          <video
            ref={videoRef as React.RefObject<HTMLVideoElement>}
            className="video-js vjs-big-play-centered vjs-theme-filebucket w-full"
          />
        ) : (
          <audio
            ref={videoRef as React.RefObject<HTMLAudioElement>}
            className="video-js vjs-theme-filebucket w-full"
            style={{ height: "54px" }}
          />
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
    </div>
  );
}

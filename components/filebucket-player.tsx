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
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any previous elements in container
    containerRef.current.innerHTML = "";

    // Create media element dynamically to prevent React reconciliation issues when Video.js modifies the DOM
    const el = document.createElement(isVideo ? "video" : "audio");
    el.className = "video-js vjs-theme-filebucket w-full h-full";
    if (isVideo) {
      el.classList.add("vjs-big-play-centered");
    } else {
      el.classList.add("vjs-audio");
    }

    containerRef.current.appendChild(el);

    // Initialize Video.js with fill: true to scale to container
    const player = videojs(el, {
      controls: true,
      autoplay: false,
      preload: "auto",
      fluid: false, // Sizing is fully driven by container classes
      fill: true,   // Let player fill the container dimensions exactly
      responsive: true,
      controlBar: {
        volumePanel: {
          inline: false,
        },
      },
    });

    playerRef.current = player;

    if (src) {
      player.src({ src, type });
    }

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [isVideo]);

  // Update player source when src or type changes
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

    /* Audio specific override to fill the entire player block */
    .video-js.vjs-theme-filebucket.vjs-audio .vjs-control-bar {
      height: 100% !important;
      border-top: none;
      border-radius: inherit;
    }

    .video-js.vjs-theme-filebucket.vjs-audio .vjs-big-play-button {
      display: none !important;
    }

    /* Custom big play button */
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

  // Explicit aspect ratio classes prevent collapsing in flex containers
  const containerClasses = isVideo
    ? "w-full max-w-4xl aspect-video mx-auto rounded-lg overflow-hidden bg-black shadow-2xl border border-slate-800 relative"
    : "w-full max-w-2xl h-[48px] mx-auto rounded-lg overflow-hidden bg-black shadow-lg border border-slate-800 relative";

  return (
    <div className={containerClasses}>
      <div ref={containerRef} className="w-full h-full absolute inset-0" />
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
    </div>
  );
}

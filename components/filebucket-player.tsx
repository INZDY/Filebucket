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
  const playerRef = useRef<ReturnType<typeof videojs> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // Clear any previous elements in container
    container.innerHTML = "";

    // Create media element dynamically to prevent React reconciliation issues when Video.js modifies the DOM
    const el = document.createElement(isVideo ? "video" : "audio");
    el.className = "video-js vjs-default-skin w-full";
    if (isVideo) {
      el.classList.add("vjs-big-play-centered");
    }

    container.appendChild(el);

    // Initialize Video.js with standard configuration
    const player = videojs(el, {
      controls: true,
      autoplay: false,
      preload: "auto",
      fluid: isVideo, // fluid sizing for video, standard sizing for audio (which uses CSS defaults)
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
      if (container) {
        container.innerHTML = "";
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideo]);

  // Update player source when src or type changes
  useEffect(() => {
    const player = playerRef.current;
    if (player && !player.isDisposed() && src) {
      player.src({ src, type });
    }
  }, [src, type]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div ref={containerRef} className="w-full" />
    </div>
  );
}

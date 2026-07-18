import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, SkipBack, SkipForward, Disc3, Loader2 } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

interface Song {
  id: string;
  title: string;
  artist: string;
  cover: string | null;
  /** Direct stream URL (local music) */
  url?: string;
  /** GD API song ID for URL resolution (netease music) */
  _songId?: string;
}

const GD_API = "https://music-api.gdstudio.xyz/api.php";

async function resolveGdUrl(songId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${GD_API}?types=url&source=netease&id=${songId}&br=999`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.url) return null;
    // Proxy through our server to avoid CORS issues
    return `/api/music/proxy-stream?url=${encodeURIComponent(data.url)}`;
  } catch {
    return null;
  }
}

export function MusicPlayer() {
  const { settings } = useSettings();
  const enabled = settings.music_player_enabled === "true";
  const source = settings.music_player_source || "local";
  const neteaseId = settings.music_player_netease_id || "";
  const opacity = parseFloat(settings.music_player_opacity || "1");

  const [expanded, setExpanded] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hoveringCover, setHoveringCover] = useState(false);
  const [resolving, setResolving] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  // Ref mirror of songs — used in playCurrent to avoid dependency on songs state
  const songsRef = useRef<Song[]>([]);
  // Track whether playCurrent is already in progress to avoid concurrent calls
  const playingRef = useRef(false);

  // Keep songsRef in sync
  useEffect(() => {
    songsRef.current = songs;
  }, [songs]);

  const fetchLocal = useCallback(async () => {
    try {
      const res = await fetch("/api/music/playlist");
      const data = await res.json();
      setSongs(data);
      setError("");
    } catch {
      setError("无法加载本地音乐列表");
    }
  }, []);

  const fetchNetease = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/music/netease-playlist/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setError("歌单为空或 ID 无效");
        setSongs([]);
        return;
      }

      const result: Song[] = data.map((item: any) => ({
        id: String(item.id),
        title: item.title || "未知歌曲",
        artist: item.artist || "未知艺术家",
        cover: item.cover || null, // already base64 from server
        _songId: item._songId,
      }));
      setSongs(result);
    } catch (e: any) {
      setError("无法加载网易云歌单: " + (e.message || ""));
      setSongs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    setCurrentIndex(0);
    setPlaying(false);
    playingRef.current = false;
    if (source === "local") {
      fetchLocal();
    } else if (source === "netease" && neteaseId) {
      fetchNetease(neteaseId);
    } else {
      setSongs([]);
    }
  }, [enabled, source, neteaseId, fetchLocal, fetchNetease]);

  const currentSong = songs[currentIndex];

  // Play the song at currentIndex. Uses songsRef to avoid depending on `songs` state
  // (which changes during background cover resolution, causing unwanted re-triggers).
  const playCurrent = useCallback(async () => {
    if (playingRef.current) return; // prevent concurrent calls
    playingRef.current = true;

    try {
      const audio = audioRef.current;
      const song = songsRef.current[currentIndex];
      if (!audio || !song) return;

      // Local music: use direct url
      if (song.url) {
        audio.src = song.url;
        audio.load();
        await audio.play().catch(() => {});
        setPlaying(true);
        return;
      }

      // NetEase music: resolve via GD API (from browser)
      if (song._songId) {
        setResolving(true);
        try {
          const proxyUrl = await resolveGdUrl(song._songId);
          if (!proxyUrl) {
            setError("无法获取播放地址");
            setPlaying(false);
            return;
          }
          audio.src = proxyUrl;
          audio.load();
          await audio.play().catch(() => {});
          setPlaying(true);
          setError("");
        } catch {
          setPlaying(false);
        } finally {
          setResolving(false);
        }
      }
    } finally {
      playingRef.current = false;
    }
  }, [currentIndex]);

  // Play when currentIndex changes
  useEffect(() => {
    playCurrent();
  }, [currentIndex, playCurrent]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch(() => {});
      setPlaying(true);
    }
  }, [playing]);

  const prev = useCallback(() => {
    if (songs.length === 0) return;
    setCurrentIndex(i => (i === 0 ? songs.length - 1 : i - 1));
  }, [songs.length]);

  const next = useCallback(() => {
    if (songs.length === 0) return;
    setCurrentIndex(i => (i + 1) % songs.length);
  }, [songs.length]);

  const onEnded = useCallback(() => next(), [next]);

  if (!enabled) return null;

  const hasSongs = songs.length > 0;
  const isLoading = (source === "netease" && (loading || resolving));

  return (
    <motion.div
      initial={{ x: -80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="fixed bottom-6 left-6 z-50"
    >
      <audio ref={audioRef} onEnded={onEnded} />

      {/* Collapsed button */}
      {!expanded && (
        <motion.button
          onClick={() => setExpanded(true)}
          style={{ opacity }}
          className="w-12 h-12 rounded-[20px] bg-surface-container shadow-lg border border-outline-variant/10 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors backdrop-blur-sm"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.93 }}
          title="展开播放器"
        >
          <Disc3 className="w-5 h-5" />
        </motion.button>
      )}

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={() => setExpanded(false)}
            style={{ opacity }}
            className="relative bg-surface-container rounded-[20px] shadow-lg border border-outline-variant/10 p-2 flex items-center gap-2.5 cursor-pointer select-none backdrop-blur-sm"
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-4 px-2">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : error ? (
              <div className="text-xs text-error py-2 px-1">{error}</div>
            ) : !hasSongs ? (
              <div className="text-xs text-on-surface-variant py-2 px-1">
                {source === "netease" ? "输入歌单 ID" : "暂无音乐"}
              </div>
            ) : (
              <>
                {/* Cover */}
                <motion.div
                  key={currentSong?.id}
                  initial={{ scale: 0.8, opacity: 0, rotate: -15 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  onClick={e => { e.stopPropagation(); togglePlay(); }}
                  onMouseEnter={() => setHoveringCover(true)}
                  onMouseLeave={() => setHoveringCover(false)}
                  className="relative w-28 h-28 rounded-[20px] bg-surface-container-high border border-outline-variant/10 overflow-hidden flex-shrink-0 shadow-sm group cursor-pointer"
                >
                  {currentSong?.cover ? (
                    <img src={currentSong.cover} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Disc3 className="w-12 h-12 text-on-surface-variant/30" />
                    </div>
                  )}
                  <motion.div
                    animate={{ opacity: hoveringCover ? 1 : 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center"
                  >
                    <motion.div
                      key={playing ? "pause" : "play"}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                    >
                      {playing ? (
                        <Pause className="w-10 h-10 text-white drop-shadow-lg" />
                      ) : (
                        <Play className="w-10 h-10 text-white drop-shadow-lg ml-1.5" />
                      )}
                    </motion.div>
                  </motion.div>
                </motion.div>

                {/* Right: Info + Controls */}
                <div className="min-w-0 flex-1 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-on-surface truncate">{currentSong?.title || "—"}</div>
                    <div className="text-xs text-on-surface-variant truncate">{currentSong?.artist || "—"}</div>
                  </div>

                  {/* Large pill buttons */}
                  <div className="flex items-center gap-2">
                    <motion.button
                      onClick={prev}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface hover:bg-primary-container text-on-surface-variant hover:text-on-primary-container transition-colors"
                      whileTap={{ scale: 0.95 }}
                    >
                      <SkipBack className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      onClick={next}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface hover:bg-primary-container text-on-surface-variant hover:text-on-primary-container transition-colors"
                      whileTap={{ scale: 0.95 }}
                    >
                      <SkipForward className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import {
  Film,
  Upload,
  Trash2,
  Download,
  Link2,
  Loader2,
  Check,
} from 'lucide-react';
import { playKawaiiPop } from '../../utils/audio';
import {
  saveVideoToIndexedDB,
  getVideoFromIndexedDB,
  deleteVideoFromIndexedDB,
  getPersistedVideoFromLocalStorage,
  savePersistedVideoToLocalStorage,
  removePersistedVideoFromLocalStorage,
} from '../../utils/videoStorage';

interface VideoShowcaseViewProps {
  onBackToGame: () => void;
}

interface SavedVideoState {
  type: 'file' | 'url';
  url: string;
  name: string;
  size?: number;
  uploadedAt: string;
}

// Check if a video entry is any residual news video so we can purge it
function isOldNewsVideo(v: any): boolean {
  if (!v) return false;
  const str = JSON.stringify(v);
  return (
    str.includes('_HHZWmEm9K4') ||
    str.includes('TVBS') ||
    str.includes('新聞') ||
    str.includes('news') ||
    str.includes('台北捷運孕婦負重體驗') ||
    str.includes('實測！ 孕婦挺肚搭捷運')
  );
}

export function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch && shortsMatch[1]) {
    return `https://www.youtube.com/embed/${shortsMatch[1]}?autoplay=0&rel=0`;
  }
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([a-zA-Z0-9_-]{11})/
  );
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}?autoplay=0&rel=0`;
  }
  return null;
}

export function getGoogleDriveEmbedUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return null;
}

export const VideoShowcaseView: React.FC<VideoShowcaseViewProps> = ({ onBackToGame }) => {
  // Check localStorage for previously saved video - actively PURGE any residual news video
  const [videoData, setVideoData] = useState<SavedVideoState | null>(() => {
    const cached = getPersistedVideoFromLocalStorage();
    if (cached) {
      if (isOldNewsVideo(cached)) {
        removePersistedVideoFromLocalStorage();
        try {
          localStorage.removeItem('team_persisted_video');
          localStorage.removeItem('team_persisted_video_meta');
        } catch (_) {}
        return null;
      }
      if (cached.url || cached.fileUrl || cached.videoUrl) {
        return {
          type: cached.type || 'url',
          url: cached.fileUrl || cached.videoUrl || cached.url,
          name: cached.originalName || cached.title || cached.name || '小組實測影片',
          size: cached.size,
          uploadedAt: cached.uploadedAt || new Date().toISOString(),
        };
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // URL Input modal tab states
  const [showUrlModal, setShowUrlModal] = useState<boolean>(false);
  const [inputUrl, setInputUrl] = useState<string>('');
  const [inputTitle, setInputTitle] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Sync saved video from server or IndexedDB on mount
  useEffect(() => {
    let isMounted = true;

    // Purge any news video lingering in localStorage
    try {
      const raw = localStorage.getItem('team_persisted_video_meta') || localStorage.getItem('team_persisted_video');
      if (raw && (raw.includes('_HHZWmEm9K4') || raw.includes('TVBS') || raw.includes('台北捷運孕婦負重體驗'))) {
        localStorage.removeItem('team_persisted_video_meta');
        localStorage.removeItem('team_persisted_video');
        if (isMounted) {
          setVideoData(null);
        }
      }
    } catch (_) {}

    async function loadSavedVideo() {
      // 1. Check server API
      try {
        const res = await fetch('/api/video-info');
        if (res.ok) {
          const json = await res.json();
          if (json.exists && json.video && isMounted) {
            const v = json.video;
            // Ignore news video
            if (!isOldNewsVideo(v)) {
              const syncedState: SavedVideoState = {
                type: v.type,
                url: v.fileUrl || v.videoUrl || v.url,
                name: v.originalName || v.title || v.name || '小組實測影片',
                size: v.size,
                uploadedAt: v.uploadedAt,
              };
              setVideoData(syncedState);
              savePersistedVideoToLocalStorage(syncedState);
              setIsLoading(false);
              return;
            } else {
              // Delete old news video from server
              fetch('/api/video', { method: 'DELETE' }).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.warn('Sync server video failed:', err);
      }

      // 2. Check client-side IndexedDB if a local file was saved
      try {
        const idbRecord = await getVideoFromIndexedDB();
        if (idbRecord && isMounted) {
          if (!isOldNewsVideo(idbRecord)) {
            if (blobUrlRef.current) {
              URL.revokeObjectURL(blobUrlRef.current);
            }
            const blobUrl = URL.createObjectURL(idbRecord.blob);
            blobUrlRef.current = blobUrl;
            const idbState: SavedVideoState = {
              type: 'file',
              url: blobUrl,
              name: idbRecord.name,
              size: idbRecord.size,
              uploadedAt: new Date(idbRecord.savedAt).toISOString(),
            };
            setVideoData(idbState);
            savePersistedVideoToLocalStorage(idbState);
            setIsLoading(false);
            return;
          } else {
            deleteVideoFromIndexedDB().catch(() => {});
          }
        }
      } catch (idbErr) {
        console.warn('IndexedDB check error:', idbErr);
      }

      if (isMounted) {
        setVideoData(null);
        setIsLoading(false);
      }
    }

    loadSavedVideo();

    return () => {
      isMounted = false;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  // Handle local file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playKawaiiPop();
    setUploadProgress(15);
    setStatusMessage('準備儲存影片中...');

    // 1. Immediately create local blob URL for instant display
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
    }
    const localBlobUrl = URL.createObjectURL(file);
    blobUrlRef.current = localBlobUrl;

    const newVideoState: SavedVideoState = {
      type: 'file',
      url: localBlobUrl,
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };
    setVideoData(newVideoState);
    savePersistedVideoToLocalStorage(newVideoState);

    // 2. Save directly to IndexedDB
    try {
      await saveVideoToIndexedDB(file, {
        name: file.name,
        size: file.size,
        type: file.type || 'video/mp4',
      });
    } catch (err) {
      console.warn('IndexedDB save failed:', err);
    }

    // 3. Upload to server
    try {
      setStatusMessage('正在儲存影片至網站...');
      setUploadProgress(40);

      const formData = new FormData();
      formData.append('video', file);

      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 55) + 40;
          setUploadProgress(Math.min(percent, 95));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const resp = JSON.parse(xhr.responseText);
            if (resp.success && resp.video) {
              setUploadProgress(100);
              setStatusMessage('影片儲存完成！');
              const finalState: SavedVideoState = {
                type: 'file',
                url: resp.video.fileUrl,
                name: resp.video.originalName,
                size: resp.video.size,
                uploadedAt: resp.video.uploadedAt,
              };
              setVideoData(finalState);
              savePersistedVideoToLocalStorage(finalState);
              setTimeout(() => {
                setUploadProgress(null);
                setStatusMessage('');
              }, 2500);
              return;
            }
          } catch (_) {}
        }
        setUploadProgress(null);
        setStatusMessage('影片已保存在本機！');
        setTimeout(() => setStatusMessage(''), 2500);
      };

      xhr.onerror = () => {
        setUploadProgress(null);
        setStatusMessage('影片已保存在本機！');
        setTimeout(() => setStatusMessage(''), 2500);
      };

      xhr.open('POST', '/api/upload-video');
      xhr.send(formData);
    } catch (uploadErr) {
      console.warn('Server upload error:', uploadErr);
      setUploadProgress(null);
      setStatusMessage('影片已保存在本機！');
      setTimeout(() => setStatusMessage(''), 2500);
    }

    if (e.target) {
      e.target.value = '';
    }
  };

  // Handle saving cloud URL (YouTube, Google Drive, MP4 URL)
  const handleSaveUrl = async () => {
    if (!inputUrl.trim()) return;

    playKawaiiPop();
    setIsLoading(true);

    try {
      const res = await fetch('/api/save-video-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: inputUrl.trim(),
          title: inputTitle.trim() || '小組實測影片',
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.video) {
          const updatedState: SavedVideoState = {
            type: 'url',
            url: json.video.videoUrl,
            name: json.video.title,
            uploadedAt: json.video.uploadedAt,
          };
          setVideoData(updatedState);
          savePersistedVideoToLocalStorage(updatedState);
          setShowUrlModal(false);
          setInputUrl('');
          setInputTitle('');
          setIsLoading(false);
          setStatusMessage('影片網址已儲存！');
          setTimeout(() => setStatusMessage(''), 2500);
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to save URL to server:', err);
    }

    const localFallbackState: SavedVideoState = {
      type: 'url',
      url: inputUrl.trim(),
      name: inputTitle.trim() || '小組影片',
      uploadedAt: new Date().toISOString(),
    };
    setVideoData(localFallbackState);
    savePersistedVideoToLocalStorage(localFallbackState);
    setShowUrlModal(false);
    setIsLoading(false);
    setStatusMessage('影片網址已儲存！');
    setTimeout(() => setStatusMessage(''), 2500);
  };

  // Delete saved video
  const handleClearVideo = async () => {
    if (!window.confirm('確定要移除此影片嗎？')) return;

    playKawaiiPop();
    setIsLoading(true);

    try {
      await fetch('/api/video', { method: 'DELETE' });
    } catch (err) {
      console.warn('Server delete error:', err);
    }

    try {
      await deleteVideoFromIndexedDB();
    } catch (err) {
      console.warn('IndexedDB delete error:', err);
    }

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    removePersistedVideoFromLocalStorage();
    try {
      localStorage.removeItem('team_persisted_video');
      localStorage.removeItem('team_persisted_video_meta');
    } catch (_) {}

    setVideoData(null);
    setIsLoading(false);
    setStatusMessage('影片已移除');
    setTimeout(() => setStatusMessage(''), 2000);
  };

  // Render video or embedded player
  const renderVideoPlayer = () => {
    if (!videoData) return null;

    if (videoData.type === 'url') {
      const ytEmbed = getYouTubeEmbedUrl(videoData.url);
      if (ytEmbed) {
        return (
          <iframe
            src={ytEmbed}
            title={videoData.name}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
      }

      const driveEmbed = getGoogleDriveEmbedUrl(videoData.url);
      if (driveEmbed) {
        return (
          <iframe
            src={driveEmbed}
            title={videoData.name}
            className="w-full h-full border-0"
            allow="autoplay"
            allowFullScreen
          />
        );
      }

      return (
        <video
          src={videoData.url}
          controls
          playsInline
          className="w-full h-full object-contain"
        />
      );
    }

    return (
      <video
        src={videoData.url}
        controls
        playsInline
        className="w-full h-full object-contain"
      />
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2.5 sm:px-4 py-3 space-y-3 overflow-hidden">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Clean Header - perfectly responsive, zero overflow */}
      <div className="bg-[#FFFCF4] rounded-2xl border-2 border-[#FFBCBD] p-3 sm:p-4 shadow-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="p-1.5 sm:p-2 bg-[#FFE0E6] text-[#E85D75] rounded-xl shrink-0">
            <Film className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-xl font-black text-[#4A3337] font-serif-tc truncate">
              小組妊娠體驗實測短片
            </h1>
            {videoData && (
              <p className="text-[11px] sm:text-xs text-[#E85D75] font-bold truncate">
                {videoData.name}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onBackToGame}
          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-[#FFFCF4] text-[#4A3337] rounded-xl text-xs font-black border border-[#FFBCBD] hover:bg-[#FFE0E6] shadow-xs cursor-pointer shrink-0 transition-colors whitespace-nowrap"
        >
          ← 返回遊戲
        </button>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-2 rounded-xl text-xs font-bold animate-in fade-in flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">{statusMessage}</span>
        </div>
      )}

      {/* Upload progress indicator */}
      {uploadProgress !== null && (
        <div className="bg-[#FFFCF4] border border-[#FFBCBD] p-2.5 rounded-xl space-y-1 shadow-xs">
          <div className="flex justify-between items-center text-xs font-bold text-[#4A3337]">
            <span className="flex items-center gap-1 text-[11px]">
              <Loader2 className="w-3 h-3 text-[#E85D75] animate-spin" />
              正在儲存影片...
            </span>
            <span className="font-mono text-[#E85D75] text-[11px]">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#E85D75] h-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Online / Cloud Link Input Modal Panel */}
      {showUrlModal && (
        <div className="bg-[#FFFCF4] rounded-2xl border-2 border-[#BCDDF0] p-3 sm:p-4 shadow-sm animate-in fade-in space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-[#30556E]" />
              <h3 className="font-bold text-[#30556E] text-xs">
                貼上線上影片網址（YouTube / Google 雲端硬碟 / 直連）
              </h3>
            </div>
            <button
              onClick={() => setShowUrlModal(false)}
              className="text-stone-400 hover:text-stone-600 text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="貼上網址：https://youtu.be/... 或 雲端連結"
                className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-[#E85D75] bg-white font-mono"
              />
            </div>
            <div>
              <input
                type="text"
                value={inputTitle}
                onChange={(e) => setInputTitle(e.target.value)}
                placeholder="影片名稱 (選填，如：第一組實測短片)"
                className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-[#E85D75] bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-0.5">
            <button
              onClick={() => setShowUrlModal(false)}
              className="px-3 py-1 text-xs text-stone-600 hover:bg-stone-100 rounded-lg"
            >
              取消
            </button>
            <button
              onClick={handleSaveUrl}
              disabled={!inputUrl.trim()}
              className="px-3 py-1 text-xs bg-[#30556E] hover:bg-[#233F53] disabled:opacity-50 text-white rounded-lg font-bold cursor-pointer"
            >
              確認儲存
            </button>
          </div>
        </div>
      )}

      {/* Video Player Display Screen */}
      <div className="bg-stone-950 rounded-2xl border-2 border-[#FFBCBD] overflow-hidden shadow-md aspect-video w-full relative flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 text-stone-300">
            <Loader2 className="w-6 h-6 text-[#FFBCBD] animate-spin" />
            <p className="text-xs font-bold">載入中...</p>
          </div>
        ) : videoData ? (
          renderVideoPlayer()
        ) : (
          /* Empty State: Clean upload prompt */
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-full flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:bg-stone-900 transition-colors group"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#FFE0E6]/20 border border-[#FFBCBD] group-hover:scale-105 transition-transform flex items-center justify-center mb-2.5 shadow-sm">
              <Upload className="w-6 h-6 text-[#FFBCBD]" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-[#FFE0E6] mb-1">
              點擊上傳小組實測影片
            </h3>
            <p className="text-[11px] text-stone-400 max-w-xs mb-3">
              支援手機錄影檔 (.mp4, .mov, .webm) 或線上連結
            </p>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 bg-[#E85D75] group-hover:bg-[#D44763] text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1">
                <Upload className="w-3 h-3" />
                <span>選擇影片檔案</span>
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUrlModal(true);
                }}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl font-bold text-xs border border-stone-600 flex items-center gap-1"
              >
                <Link2 className="w-3 h-3" />
                <span>貼上網址</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Simple Action Bar under Video */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs pt-0.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-[#E85D75] hover:bg-[#D44763] text-white rounded-lg font-bold cursor-pointer flex items-center gap-1 shadow-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{videoData ? '更換影片' : '上傳影片檔案'}</span>
          </button>

          <button
            onClick={() => {
              playKawaiiPop();
              setShowUrlModal(!showUrlModal);
            }}
            className="px-3 py-1.5 bg-[#FFFCF4] hover:bg-[#FFE0E6] text-[#4A3337] rounded-lg font-bold cursor-pointer flex items-center gap-1 border border-[#FFBCBD] transition-colors"
          >
            <Link2 className="w-3.5 h-3.5 text-[#E85D75]" />
            <span>貼上線上網址</span>
          </button>
        </div>

        {videoData && (
          <div className="flex items-center gap-1.5">
            {videoData.type === 'file' && (
              <a
                href={videoData.url}
                download={videoData.name}
                className="px-2 py-1 text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg font-medium flex items-center gap-1"
                title="下載影片"
              >
                <Download className="w-3 h-3" />
                <span>下載</span>
              </a>
            )}
            <button
              onClick={handleClearVideo}
              className="px-2 py-1 text-stone-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg font-medium flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>移除</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

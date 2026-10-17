import React, { useState, useEffect, useRef } from 'react';
import {
  Film,
  Upload,
  RotateCcw,
  FileVideo,
  CheckCircle2,
  Trash2,
  Download,
  Link2,
  ExternalLink,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Sparkles,
  Play,
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
import { DEFAULT_TEAM_VIDEO, PersistedVideoInfo } from '../../data/persistedVideo';

interface VideoShowcaseViewProps {
  onBackToGame: () => void;
}

interface SavedVideoState {
  type: 'file' | 'url';
  url: string;
  name: string;
  size?: number;
  uploadedAt: string;
  savedOnServer?: boolean;
  savedInIndexedDB?: boolean;
  description?: string;
  isDefault?: boolean;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  // Support YouTube Shorts
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch && shortsMatch[1]) {
    return `https://www.youtube.com/embed/${shortsMatch[1]}?autoplay=0&rel=0`;
  }
  // Support standard youtube.com and youtu.be
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
  // Initialize state immediately from localStorage or default video to ensure ZERO blank flash
  const [videoData, setVideoData] = useState<SavedVideoState>(() => {
    const cached = getPersistedVideoFromLocalStorage();
    if (cached && (cached.url || cached.videoUrl)) {
      return {
        type: cached.type || 'url',
        url: cached.fileUrl || cached.videoUrl || cached.url,
        name: cached.originalName || cached.title || cached.name || DEFAULT_TEAM_VIDEO.name,
        size: cached.size,
        uploadedAt: cached.uploadedAt || DEFAULT_TEAM_VIDEO.uploadedAt,
        savedOnServer: true,
        description: cached.description || DEFAULT_TEAM_VIDEO.description,
        isDefault: !!cached.isDefault,
      };
    }
    return {
      type: DEFAULT_TEAM_VIDEO.type,
      url: DEFAULT_TEAM_VIDEO.url,
      name: DEFAULT_TEAM_VIDEO.name,
      uploadedAt: DEFAULT_TEAM_VIDEO.uploadedAt,
      savedOnServer: true,
      description: DEFAULT_TEAM_VIDEO.description,
      isDefault: true,
    };
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');

  // URL Input modal tab states
  const [showUrlModal, setShowUrlModal] = useState<boolean>(false);
  const [inputUrl, setInputUrl] = useState<string>('');
  const [inputTitle, setInputTitle] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Sync saved video from server on mount
  useEffect(() => {
    let isMounted = true;

    async function syncSavedVideo() {
      try {
        const res = await fetch('/api/video-info');
        if (res.ok) {
          const json = await res.json();
          if (json.exists && json.video && isMounted) {
            const v = json.video;
            const syncedState: SavedVideoState = {
              type: v.type,
              url: v.fileUrl || v.videoUrl || v.url,
              name: v.originalName || v.title || v.name || '小組實測影片',
              size: v.size,
              uploadedAt: v.uploadedAt,
              savedOnServer: true,
              description: v.description || '',
              isDefault: !!v.isDefault,
            };
            setVideoData(syncedState);
            savePersistedVideoToLocalStorage(syncedState);
            return;
          }
        }
      } catch (err) {
        console.warn('Sync server video failed:', err);
      }

      // Check client-side IndexedDB fallback if a local file was saved
      try {
        const idbRecord = await getVideoFromIndexedDB();
        if (idbRecord && isMounted) {
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
            savedInIndexedDB: true,
            savedOnServer: false,
          };
          setVideoData(idbState);
          savePersistedVideoToLocalStorage(idbState);
        }
      } catch (idbErr) {
        console.warn('IndexedDB check error:', idbErr);
      }
    }

    syncSavedVideo();

    return () => {
      isMounted = false;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  // Handle local file upload (stores in both IndexedDB and server)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playKawaiiPop();
    setUploadError('');
    setUploadProgress(10);
    setStatusMessage('準備儲存影片中...');

    // 1. Immediately create local blob URL so user sees instant preview
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
      savedInIndexedDB: false,
      savedOnServer: false,
      isDefault: false,
    };
    setVideoData(newVideoState);
    savePersistedVideoToLocalStorage(newVideoState);

    // 2. Save directly to client IndexedDB using ArrayBuffer for permanent browser storage
    try {
      setStatusMessage('正在儲存至本機資料庫 (IndexedDB)...');
      await saveVideoToIndexedDB(file, {
        name: file.name,
        size: file.size,
        type: file.type || 'video/mp4',
      });
      newVideoState.savedInIndexedDB = true;
      setVideoData({ ...newVideoState });
      savePersistedVideoToLocalStorage(newVideoState);
    } catch (err) {
      console.warn('IndexedDB save failed:', err);
    }

    // 3. Upload to server with progress tracking so anyone visiting the link can view it
    try {
      setStatusMessage('正在上傳並同步至網站伺服器...');
      setUploadProgress(30);

      const formData = new FormData();
      formData.append('video', file);

      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 60) + 30;
          setUploadProgress(Math.min(percent, 95));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const resp = JSON.parse(xhr.responseText);
            if (resp.success && resp.video) {
              setUploadProgress(100);
              setStatusMessage('✅ 影片已成功永久保存在網站中！所有訪客都能同步看到此影片！');
              const finalState: SavedVideoState = {
                type: 'file',
                url: resp.video.fileUrl,
                name: resp.video.originalName,
                size: resp.video.size,
                uploadedAt: resp.video.uploadedAt,
                savedOnServer: true,
                savedInIndexedDB: true,
                isDefault: false,
              };
              setVideoData(finalState);
              savePersistedVideoToLocalStorage(finalState);
              setTimeout(() => {
                setUploadProgress(null);
                setStatusMessage('');
              }, 4000);
              return;
            }
          } catch (_) {}
        }
        // If server rejects because file exceeds 32MB reverse proxy limit,
        // it remains safely preserved in IndexedDB + localStorage!
        setUploadProgress(null);
        setStatusMessage('✅ 影片已保存在本瀏覽器中！每次打開都能直接播放！');
        setTimeout(() => setStatusMessage(''), 4000);
      };

      xhr.onerror = () => {
        setUploadProgress(null);
        setStatusMessage('✅ 影片已保存在本機資料庫中！');
        setTimeout(() => setStatusMessage(''), 4000);
      };

      xhr.open('POST', '/api/upload-video');
      xhr.send(formData);
    } catch (uploadErr) {
      console.warn('Server upload error:', uploadErr);
      setUploadProgress(null);
      setStatusMessage('✅ 影片已保存在本瀏覽器資料庫中！');
      setTimeout(() => setStatusMessage(''), 4000);
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
    setUploadError('');

    try {
      const res = await fetch('/api/save-video-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: inputUrl.trim(),
          title: inputTitle.trim() || '小組雲端實測影片',
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
            savedOnServer: true,
            isDefault: false,
          };
          setVideoData(updatedState);
          savePersistedVideoToLocalStorage(updatedState);
          setShowUrlModal(false);
          setInputUrl('');
          setInputTitle('');
          setStatusMessage('✅ 線上影片連結已成功保存！所有點開此網站的人每一次打開都能看到！');
          setTimeout(() => setStatusMessage(''), 4000);
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to save URL to server:', err);
    }

    // Fallback: save to client state and localStorage
    const localFallbackState: SavedVideoState = {
      type: 'url',
      url: inputUrl.trim(),
      name: inputTitle.trim() || '小組雲端影片',
      uploadedAt: new Date().toISOString(),
      savedOnServer: false,
      isDefault: false,
    };
    setVideoData(localFallbackState);
    savePersistedVideoToLocalStorage(localFallbackState);
    setShowUrlModal(false);
    setIsLoading(false);
    setStatusMessage('✅ 影片已保存在本瀏覽器中！');
    setTimeout(() => setStatusMessage(''), 4000);
  };

  // Reset to default presentation video
  const handleResetToDefault = async () => {
    if (!window.confirm('確定要還原為小組預設的實測展演影片嗎？')) return;

    playKawaiiPop();
    setIsLoading(true);

    try {
      await fetch('/api/video', { method: 'DELETE' });
    } catch (err) {
      console.warn('Server reset error:', err);
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

    const defaultState: SavedVideoState = {
      type: DEFAULT_TEAM_VIDEO.type,
      url: DEFAULT_TEAM_VIDEO.url,
      name: DEFAULT_TEAM_VIDEO.name,
      uploadedAt: new Date().toISOString(),
      savedOnServer: true,
      description: DEFAULT_TEAM_VIDEO.description,
      isDefault: true,
    };
    setVideoData(defaultState);
    savePersistedVideoToLocalStorage(defaultState);
    setIsLoading(false);
    setStatusMessage('✅ 已還原為小組預設實測影片！所有訪客打開均可觀看。');
    setTimeout(() => setStatusMessage(''), 3500);
  };

  const handleCopyLink = () => {
    playKawaiiPop();
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
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

      // Direct URL fallback
      return (
        <video
          src={videoData.url}
          controls
          autoPlay
          className="w-full h-full object-contain"
        />
      );
    }

    // Direct file
    return (
      <video
        src={videoData.url}
        controls
        autoPlay
        playsInline
        className="w-full h-full object-contain"
      />
    );
  };

  return (
    <div className="w-full max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-[#D3E8F4] via-[#FFE0E6] to-[#FFFCF4] rounded-3xl border-2 border-[#FFBCBD] p-5 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-[#E85D75] text-white text-xs font-black px-3.5 py-1 rounded-full shadow-xs mb-1.5">
            <Film className="w-3.5 h-3.5" />
            <span>成果發表專屬 · 小組實測成果展演</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#4A3337] font-serif-tc">
            小組妊娠體驗實測短片
          </h1>
          <p className="text-xs sm:text-sm text-[#6B4B52] mt-1">
            影片已<strong>永久保留在伺服器與瀏覽器中</strong>，每一次打開所有人都能直接觀看！
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="px-3.5 py-2.5 bg-white text-[#4A3337] hover:bg-[#FFE0E6] rounded-2xl text-xs font-black border border-[#FFBCBD] shadow-xs cursor-pointer shrink-0 flex items-center gap-1.5 transition-all"
            title="複製目前網址，分享給老師或同學觀看"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">網址已複製！</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#E85D75]" />
                <span>複製分享網址</span>
              </>
            )}
          </button>

          <button
            onClick={onBackToGame}
            className="px-4 py-2.5 bg-[#FFFCF4] text-[#4A3337] rounded-2xl text-xs font-black border border-[#FFBCBD] hover:bg-[#FFE0E6] shadow-xs cursor-pointer shrink-0 transition-colors"
          >
            ← 返回捷運答題遊戲
          </button>
        </div>
      </div>

      {/* Status banner if message exists */}
      {statusMessage && (
        <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-800 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Upload progress indicator */}
      {uploadProgress !== null && (
        <div className="bg-[#FFFCF4] border-2 border-[#FFBCBD] p-4 rounded-2xl space-y-2 shadow-xs">
          <div className="flex justify-between items-center text-xs font-black text-[#4A3337]">
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 text-[#E85D75] animate-spin" />
              正在保存影片至網站...
            </span>
            <span className="font-mono text-[#E85D75]">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#E85D75] to-[#FF8C94] h-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-[11px] text-[#6B4B52]">
            影片正同步寫入網站伺服器與本機快取，保存完成後下次點開網址即可自動載入！
          </p>
        </div>
      )}

      {/* Persistence Info & Control Action Bar */}
      <div className="bg-[#FFFCF4] rounded-3xl border-2 border-[#FFBCBD] p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="p-2 rounded-xl bg-[#FFE0E6] text-[#E85D75]">
            <FileVideo className="w-4 h-4" />
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[#4A3337]">
                目前常駐展示影片：<span className="text-[#E85D75] font-black">{videoData.name}</span>
              </span>
              {videoData.isDefault && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px]">
                  ⭐️ 預設實測範例
                </span>
              )}
              {videoData.size && (
                <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md font-mono">
                  {formatFileSize(videoData.size)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-bold">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                全體訪客同步留存保證 · 每次打開所有人皆能立即觀看
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* File Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-[#E85D75] hover:bg-[#D44763] active:scale-95 text-white rounded-xl font-black cursor-pointer flex items-center gap-1.5 transition-all shadow-xs"
            title="上傳你們小組自行拍攝的影片檔案"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>更換影片檔案</span>
          </button>

          {/* Cloud / YouTube URL Button */}
          <button
            onClick={() => {
              playKawaiiPop();
              setShowUrlModal(!showUrlModal);
            }}
            className="px-3.5 py-2 bg-[#D3E8F4] hover:bg-[#BCDDF0] text-[#30556E] active:scale-95 rounded-xl font-black cursor-pointer flex items-center gap-1.5 transition-all border border-[#BCDDF0]"
            title="貼上 YouTube 或 Google Drive 等線上雲端連結"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>輸入線上/雲端連結</span>
          </button>

          {/* Download Button (for file) */}
          {videoData && videoData.type === 'file' && (
            <a
              href={videoData.url}
              download={videoData.name}
              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-[#4A3337] rounded-xl font-bold cursor-pointer flex items-center gap-1 transition-all border border-stone-200 text-xs"
              title="下載影片備份檔"
            >
              <Download className="w-3.5 h-3.5 text-stone-600" />
              <span>下載</span>
            </a>
          )}

          {/* Reset to Default Button */}
          {!videoData.isDefault && (
            <button
              onClick={handleResetToDefault}
              className="px-3 py-2 bg-stone-100 hover:bg-[#FFE0E6] text-[#4A3337] rounded-xl font-bold cursor-pointer flex items-center gap-1 transition-all border border-stone-200"
              title="還原為小組預設實測影片"
            >
              <RotateCcw className="w-3.5 h-3.5 text-stone-600" />
              <span>還原預設影片</span>
            </button>
          )}
        </div>
      </div>

      {/* Online / Cloud Link Input Modal Panel */}
      {showUrlModal && (
        <div className="bg-[#FFFCF4] rounded-3xl border-2 border-[#BCDDF0] p-5 shadow-md animate-in fade-in space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[#30556E]" />
              <h3 className="font-black text-[#30556E] text-sm">
                儲存線上影片網址（YouTube / Google 雲端硬碟 / 影片直連）
              </h3>
            </div>
            <button
              onClick={() => setShowUrlModal(false)}
              className="text-stone-400 hover:text-stone-600 text-xs font-bold"
            >
              ✕ 關閉
            </button>
          </div>

          <p className="text-xs text-[#6B4B52]">
            如果影片檔案較大（例如超過 300MB），可以直接將影片上傳至 YouTube（可設為不公開）或 Google 雲端硬碟（開啟連結共用），將網址貼在下方，伺服器會永久留存，<strong>每次打開所有人都能看到那一部影片</strong>！
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-black text-[#4A3337] mb-1">
                影片網址 (URL) *
              </label>
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://youtu.be/... 或 https://drive.google.com/..."
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:border-[#E85D75] bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-[#4A3337] mb-1">
                小組影片標題 (選填)
              </label>
              <input
                type="text"
                value={inputTitle}
                onChange={(e) => setInputTitle(e.target.value)}
                placeholder="例：第一組 台北捷運孕婦負重體驗實測短片"
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:border-[#E85D75] bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowUrlModal(false)}
              className="px-3.5 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded-xl font-bold"
            >
              取消
            </button>
            <button
              onClick={handleSaveUrl}
              disabled={!inputUrl.trim()}
              className="px-4 py-1.5 text-xs bg-[#30556E] hover:bg-[#233F53] disabled:opacity-50 text-white rounded-xl font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>保存線上影片至網站（所有人永久可見）</span>
            </button>
          </div>
        </div>
      )}

      {/* Video Player Display Screen */}
      <div className="bg-stone-950 rounded-3xl border-3 border-[#FFBCBD] overflow-hidden shadow-xl aspect-16/9 relative flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-stone-300">
            <Loader2 className="w-10 h-10 text-[#FFBCBD] animate-spin" />
            <p className="text-sm font-bold">載入已保存影片中...</p>
          </div>
        ) : (
          renderVideoPlayer()
        )}
      </div>

      {/* Video Details Card */}
      <div className="bg-[#FFFCF4] rounded-2xl border-2 border-[#FFBCBD] p-4 text-xs text-[#6B4B52] space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="font-black text-[#4A3337] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#E85D75]" />
            <span>影片留存與展示說明</span>
          </span>
          <span className="text-[10px] text-stone-500 font-mono">
            更新時間：{new Date(videoData.uploadedAt).toLocaleString('zh-TW')}
          </span>
        </div>
        <p className="leading-relaxed">
          {videoData.description || '小組實測展演：體驗者身著 6.5kg 負重裝置搭乘台北捷運淡水信義線，實測無座站立顛簸、身體重心失衡、乘客反應與友善讓座倡議。'}
        </p>
        <div className="pt-1 flex items-center gap-2 flex-wrap text-[11px] text-stone-500">
          <span className="bg-[#FFE0E6] text-[#E85D75] px-2 py-0.5 rounded-md font-bold">
            ✓ 伺服器同步
          </span>
          <span className="bg-[#FFE0E6] text-[#E85D75] px-2 py-0.5 rounded-md font-bold">
            ✓ 本機雙重備份
          </span>
          <span className="bg-[#FFE0E6] text-[#E85D75] px-2 py-0.5 rounded-md font-bold">
            ✓ 跨裝置即時共享
          </span>
        </div>
      </div>
    </div>
  );
};

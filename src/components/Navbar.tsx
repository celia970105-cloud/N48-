import React, { useState } from 'react';
import { NavigationTab } from '../types/pregnancy';
import { Film, TrainFront, Code, Download, Copy, Check, X, FileText } from 'lucide-react';
import { playKawaiiPop } from '../utils/audio';

interface NavbarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onPrint?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);
  const [codeContent, setCodeContent] = useState<string>('');

  const handleNavClick = (tab: NavigationTab) => {
    playKawaiiPop();
    onTabChange(tab);
  };

  const handleOpenCodeModal = async () => {
    playKawaiiPop();
    setShowCodeModal(true);
    if (!codeContent) {
      setLoadingCode(true);
      try {
        const res = await fetch('/FULL_PROJECT_CODE.txt');
        if (res.ok) {
          const txt = await res.text();
          setCodeContent(txt);
        } else {
          setCodeContent('無法載入代碼檔，請直接使用上方下載按鈕下載 ZIP 或 TXT。');
        }
      } catch (e) {
        setCodeContent('讀取錯誤，請直接點擊上方下載按鈕。');
      } finally {
        setLoadingCode(false);
      }
    }
  };

  const handleCopyCode = () => {
    if (codeContent) {
      navigator.clipboard.writeText(codeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#FFE0E6]/95 backdrop-blur-md border-b-2 border-[#FFBCBD]">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Zone 1: Single text element wordmark */}
          <button
            onClick={() => handleNavClick('subway')}
            className="text-lg font-black tracking-tight text-[#4A3337] font-serif-tc text-left hover:text-[#E85D75] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>🚇 站穩啦媽咪 · 捷運大冒險</span>
          </button>

          {/* Zone 2: clean text navigation links */}
          <nav className="hidden md:flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => handleNavClick('subway')}
              className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'subway'
                  ? 'bg-[#E85D75] text-white shadow-xs'
                  : 'text-[#5C3E43] hover:text-[#4A3337] hover:bg-[#FFBCBD]/40'
              }`}
            >
              <TrainFront className="w-3.5 h-3.5" />
              <span>捷運答題闖關</span>
            </button>

            <button
              onClick={() => handleNavClick('video')}
              className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'video'
                  ? 'bg-[#E85D75] text-white shadow-xs'
                  : 'text-[#5C3E43] hover:text-[#4A3337] hover:bg-[#FFBCBD]/40'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>小組影片展演</span>
            </button>
          </nav>

          {/* Zone 3: Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenCodeModal}
              className="px-3 py-2 text-xs font-black text-[#5C3E43] bg-white/90 hover:bg-white border border-[#FFBCBD] rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="查看與下載全站完整代碼（未分開單一檔與ZIP）"
            >
              <Code className="w-3.5 h-3.5 text-[#E85D75]" />
              <span className="hidden sm:inline">完整代碼</span>
            </button>

            <button
              onClick={() => handleNavClick(activeTab === 'subway' ? 'video' : 'subway')}
              className="px-4 py-2 text-xs font-black text-white bg-[#E85D75] hover:bg-[#D44763] rounded-xl shadow-xs transition-transform active:scale-95 whitespace-nowrap cursor-pointer"
            >
              {activeTab === 'subway' ? '🎬 觀看小組影片' : '🎮 玩捷運答題遊戲'}
            </button>
          </div>
        </div>

        {/* Mobile nav bar */}
        <div className="md:hidden flex border-t border-[#FFBCBD]/40 bg-[#FFE0E6] px-2 py-1.5 justify-around text-xs">
          <button
            onClick={() => handleNavClick('subway')}
            className={`py-1 px-3 font-black flex items-center gap-1 cursor-pointer ${
              activeTab === 'subway' ? 'text-[#E85D75] bg-[#FFFCF4] rounded-lg shadow-2xs' : 'text-[#7A5860]'
            }`}
          >
            <TrainFront className="w-4 h-4" />
            <span>捷運答題</span>
          </button>
          <button
            onClick={() => handleNavClick('video')}
            className={`py-1 px-3 font-black flex items-center gap-1 cursor-pointer ${
              activeTab === 'video' ? 'text-[#E85D75] bg-[#FFFCF4] rounded-lg shadow-2xs' : 'text-[#7A5860]'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>小組影片</span>
          </button>
          <button
            onClick={handleOpenCodeModal}
            className="py-1 px-3 font-black text-[#E85D75] bg-white/80 rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer"
          >
            <Code className="w-3.5 h-3.5" />
            <span>完整代碼</span>
          </button>
        </div>
      </header>

      {/* Full Source Code Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FFF9FA] border-2 border-[#FFBCBD] rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-200">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-[#FFE0E6] border-b border-[#FFBCBD] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white rounded-xl shadow-xs text-[#E85D75]">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#4A3337] flex items-center gap-2">
                    網站完整程式碼（單一合併檔 / 完整 ZIP）
                  </h3>
                  <p className="text-xs text-[#7A5860] font-medium">
                    全站前端、後端、題庫、音效、插畫與互動邏輯 100% 完整無刪節
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCodeModal(false)}
                className="p-1.5 rounded-full hover:bg-white/80 text-[#7A5860] hover:text-[#4A3337] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action Bar */}
            <div className="p-4 bg-white border-b border-[#FFBCBD]/60 flex flex-wrap gap-2.5 items-center justify-between">
              <div className="flex flex-wrap gap-2">
                <a
                  href="/FULL_PROJECT_CODE.txt"
                  download="FULL_PROJECT_CODE.txt"
                  className="px-3.5 py-2 text-xs font-black text-white bg-[#E85D75] hover:bg-[#D44763] rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>下載單一完整代碼檔 (.TXT 不分開)</span>
                </a>
                <a
                  href="/project-source.zip"
                  download="stand-firm-mommy-full-code.zip"
                  className="px-3.5 py-2 text-xs font-black text-[#5C3E43] bg-[#FFE0E6] hover:bg-[#FFBCBD]/50 border border-[#FFBCBD] rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#E85D75]" />
                  <span>下載完整專案包 (.ZIP)</span>
                </a>
              </div>

              <button
                onClick={handleCopyCode}
                disabled={!codeContent || loadingCode}
                className="px-3.5 py-2 text-xs font-black text-[#5C3E43] bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">已成功複製全部代碼！</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-amber-700" />
                    <span>複製全部代碼到剪貼簿</span>
                  </>
                )}
              </button>
            </div>

            {/* Code Preview Area */}
            <div className="flex-1 overflow-auto p-4 bg-[#1E1E1E] text-slate-200 font-mono text-xs leading-relaxed select-text">
              {loadingCode ? (
                <div className="h-48 flex items-center justify-center text-slate-400 gap-2">
                  <span className="animate-spin text-lg">⏳</span>
                  <span>正在載入全站完整代碼...</span>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap break-words">{codeContent}</pre>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-[#FFF3F5] border-t border-[#FFBCBD] flex items-center justify-between text-xs text-[#7A5860]">
              <span>💡 提示：點擊「下載單一完整代碼檔」可直接儲存不分開的全部程式碼文字檔。</span>
              <button
                onClick={() => setShowCodeModal(false)}
                className="px-4 py-1.5 font-bold text-[#5C3E43] bg-white rounded-lg border border-[#FFBCBD] hover:bg-[#FFE0E6] cursor-pointer"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

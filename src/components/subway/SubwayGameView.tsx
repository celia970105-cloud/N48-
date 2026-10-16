import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { SUBWAY_QUESTIONS } from '../../data/subwayQuestions';
import { PlayerProfile, GamePhase, GameMode, SeatDilemmaOutcome } from '../../types/subwayGame';
import { PregnantMomIllustration, CharacterMood, MomStance } from './PregnantMomIllustration';
import {
  playKawaiiCoin,
  playKawaiiOuch,
  playSuccessChime,
  playKawaiiPop,
  playSubwayStationChime,
  playMetroDoorBeep,
  playQuizCorrectChime,
  playQuizWrongChime,
  playGuanduStationBroadcast,
  playGuanduArrivalBroadcast
} from '../../utils/audio';
import {
  Sparkles,
  RotateCcw,
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Volume2,
  Film,
  Maximize2,
  Minimize2,
  Smartphone,
  Monitor,
  Gift,
  Zap,
  HelpCircle,
  Heart,
  Trophy,
  MapPin,
  RefreshCw,
  Cookie,
  Radio,
  Activity,
  Waves
} from 'lucide-react';

interface SubwayGameViewProps {
  onSwitchToVideo: () => void;
}

const QUESTION_TIME_LIMIT = 15; // 15 seconds per question
const MAX_MISTAKES = 4; // 4 strikes before train emergency stop!

// Metro Red Line Stations on the Tour
const STATIONS = [
  { id: 'R24', name: '忠義站', subtitle: '孕早期適應與通勤守護', range: [0, 4] },
  { id: 'R25', name: '關渡站', subtitle: '孕中期生理調適與骨盆照護', range: [5, 9] },
  { id: 'R26', name: '竹圍站', subtitle: '血液生理與胎動營養', range: [10, 14] },
  { id: 'R27', name: '紅樹林站', subtitle: '待產鑑別與產兆破水', range: [15, 19] },
  { id: 'R28', name: '淡水終點站', subtitle: '分娩拉梅茲呼吸魔王總決戰', range: [20, 24] }
];

export const SubwayGameView: React.FC<SubwayGameViewProps> = ({
  onSwitchToVideo
}) => {
  // Player profile with empty default name so user can name themselves
  const [profile, setProfile] = useState<PlayerProfile>({
    name: '',
    badgeStyle: 'pink_heart',
    avatar: '🤰'
  });

  const currentMomName = profile.name.trim() || '媽咪';

  const [phase, setPhase] = useState<GamePhase>('welcome');
  const [gameMode, setGameMode] = useState<GameMode>('full_tour');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [balance, setBalance] = useState(100);
  const [tiltAngle, setTiltAngle] = useState(0);
  const [isWobbling, setIsWobbling] = useState(false);
  // Spontaneous seat offering state (讓座隨機出現)
  const [isSeated, setIsSeated] = useState(false);
  // Subway Carriage Dynamic Sway & Random Bump Engine (always naturally active)
  const [isRandomBump, setIsRandomBump] = useState(false);
  const [bumpDirection, setBumpDirection] = useState<'left' | 'right'>('left');
  const [swayDescription, setSwayDescription] = useState('∿ 捷運疾駛中 · 隨機輕微顛簸');
  const bumpTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);
  const [isTimeout, setIsTimeout] = useState(false);
  const [passengerBubble, setPassengerBubble] = useState<string | null>(null);
  const [broadcastText, setBroadcastText] = useState<string>('下車時請注意間隙 · Mind the gap');

  // Streak & Performance
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);

  // Maternity Backpack Items System
  const [items, setItems] = useState<{
    cracker: number; // 50/50 排除卡
    plum: number;    // +10 秒生津酸梅
    shield: number;  // 免失衡金牌護盾
    socks: number;   // 平衡回滿彈性襪
  }>({
    cracker: 2,
    plum: 2,
    shield: 1,
    socks: 1
  });
  const [eliminatedIndices, setEliminatedIndices] = useState<number[]>([]);
  const [hasShield, setHasShield] = useState(false);

  // Interactive Mini-Games
  const [activeMiniGame, setActiveMiniGame] = useState<'balance_qte' | 'grandma_basket' | 'seat_dilemma' | null>(null);
  const [qteProgress, setQteProgress] = useState(0);
  const [qteTimeLeft, setQteTimeLeft] = useState(5);
  const qteTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Seat Dilemma Random Event States
  const [dilemmaTimeLeft, setDilemmaTimeLeft] = useState(8);
  const [dilemmaOutcome, setDilemmaOutcome] = useState<SeatDilemmaOutcome | null>(null);
  const dilemmaTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Broadcast Multi-Lingual Switcher
  const [broadcastLang, setBroadcastLang] = useState<'zh' | 'tw' | 'hakka' | 'en'>('zh');

  // Dynamic random subway incidents
  const [activeIncident, setActiveIncident] = useState<{
    id: string;
    title: string;
    desc: string;
    actionText?: string;
  } | null>(null);
  const [triggeredIncidents, setTriggeredIncidents] = useState<string[]>([]);

  // Fullscreen & Mobile View Modes
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileExpandedCarriage, setMobileExpandedCarriage] = useState(false);

  // Pure background audio/video player (ZERO UI FOOTPRINT)
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgVideoMediaRef = useRef<HTMLVideoElement | null>(null);
  const [customAudioUrl, setCustomAudioUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Countdown timer per question (15 seconds)
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Target wins based on mode
  const targetWinCount =
    gameMode === 'full_tour' ? 16 :
    gameMode === 'quick_challenge' ? 8 : 999;

  // Current station
  const currentStation =
    STATIONS.find((s) => currentQIndex >= s.range[0] && currentQIndex <= s.range[1]) ||
    STATIONS[STATIONS.length - 1];

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard shortcut listener for PC: 1~4 / A~D, Space / Enter
  useEffect(() => {
    if (phase !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();

      // QTE Spacebar support
      if (activeMiniGame === 'balance_qte') {
        if (key === ' ' || key === 'enter') {
          e.preventDefault();
          handleQteTap();
        }
        return;
      }

      // Seat Dilemma keyboard support
      if (activeMiniGame === 'seat_dilemma') {
        if (!dilemmaOutcome) {
          if (key === '1' || key === 'a') {
            e.preventDefault();
            handleSeatDilemmaChoice('self');
          } else if (key === '2' || key === 'b') {
            e.preventDefault();
            handleSeatDilemmaChoice('elder');
          } else if (key === '3' || key === 'c') {
            e.preventDefault();
            handleSeatDilemmaChoice('collaborate');
          }
        } else if (key === ' ' || key === 'enter') {
          e.preventDefault();
          handleCloseSeatDilemma();
        }
        return;
      }

      if (!showExplanation && selectedOption === null && timeLeft > 0) {
        if (key === '1' || key === 'a') handleSelectAnswer(0);
        else if (key === '2' || key === 'b') handleSelectAnswer(1);
        else if (key === '3' || key === 'c') handleSelectAnswer(2);
        else if (key === '4' || key === 'd') handleSelectAnswer(3);
      } else if (showExplanation && (key === ' ' || key === 'enter')) {
        e.preventDefault();
        if (correctCount < targetWinCount && mistakeCount < MAX_MISTAKES && currentQIndex < SUBWAY_QUESTIONS.length - 1) {
          handleNextQuestion();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, showExplanation, selectedOption, timeLeft, correctCount, mistakeCount, currentQIndex, activeMiniGame, targetWinCount, dilemmaOutcome]);

  // Play audio in background
  const playBackgroundAudio = () => {
    setBroadcastText('正在背景播放關渡站到站廣播 (純音訊，無畫面)...');
    if (customAudioUrl && bgVideoMediaRef.current) {
      bgVideoMediaRef.current.currentTime = 0;
      bgVideoMediaRef.current.play().catch(() => {});
    } else if (bgAudioRef.current) {
      bgAudioRef.current.currentTime = 0;
      bgAudioRef.current.play().catch(() => {});
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomAudioUrl(url);
      setBroadcastText(`已載入你選取的影片：${file.name}（純背景播放聲音）`);
      if (bgVideoMediaRef.current) {
        bgVideoMediaRef.current.src = url;
        bgVideoMediaRef.current.currentTime = 0;
        bgVideoMediaRef.current.play().catch(() => {});
      }
    }
  };

  // Derive Stance
  let currentStance: MomStance = 'unheld';
  if (phase === 'lost' || mistakeCount >= MAX_MISTAKES) {
    currentStance = 'flying';
  } else if (phase === 'won' || isSeated) {
    currentStance = 'seated';
  } else if (correctCount >= 1) {
    currentStance = 'holding';
  } else {
    currentStance = 'unheld';
  }

  // Derive Mood
  let characterMood: CharacterMood = 'idle';
  if (phase === 'won' || currentStance === 'seated') {
    characterMood = 'seated';
  } else if (isWobbling || phase === 'lost' || currentStance === 'flying') {
    characterMood = 'wrong';
  } else if (isAnswerCorrect && showExplanation) {
    characterMood = 'correct';
  }

  // Dynamic Subway Sway & Random Realistic Bumps Engine
  // Simulates subway track curves, rail expansion joints, and acceleration forces automatically
  useEffect(() => {
    if (phase !== 'playing') return;

    // 1. Continuous natural carriage sway
    const swayInterval = setInterval(() => {
      if (isWobbling || isRandomBump) return;
      // Standing unheld experiences greater sway than holding
      const amplitude =
        currentStance === 'unheld' ? 14 :
        currentStance === 'holding' ? 4.5 : 1.5;
      const naturalSway = (Math.random() - 0.5) * amplitude;
      setTiltAngle(naturalSway);
    }, 380);

    // 2. Random intermittent track joint bumps & curve jolts (every 3.5 ~ 6 seconds)
    let bumpTimer: NodeJS.Timeout;
    const scheduleNextBump = () => {
      const delay = Math.random() * 2500 + 3500; // 3.5s ~ 6s
      bumpTimer = setTimeout(() => {
        if (phase === 'playing' && !isWobbling) {
          const dir = Math.random() > 0.5 ? 'left' : 'right';
          const bumpAngle = (dir === 'left' ? -1 : 1) * (currentStance === 'unheld' ? 16 : 6);
          setBumpDirection(dir);
          setIsRandomBump(true);
          setTiltAngle(bumpAngle);
          setSwayDescription(dir === 'left' ? '⚡ 軌道交會微晃 (偏左)' : '⚡ 軌道接縫微震 (偏右)');

          if (bumpTimeoutRef.current) clearTimeout(bumpTimeoutRef.current);
          bumpTimeoutRef.current = setTimeout(() => {
            setIsRandomBump(false);
            setSwayDescription(
              currentStance === 'unheld'
                ? '∿ 捷運疾駛中 · 站立無扶握重心不穩'
                : currentStance === 'holding'
                ? '💪 握緊立柱 · 車廂搖晃已有效緩衝'
                : '💖 安穩就座 · 平穩巡航'
            );
          }, 550);
        }
        scheduleNextBump();
      }, delay);
    };

    scheduleNextBump();

    return () => {
      clearInterval(swayInterval);
      clearTimeout(bumpTimer);
      if (bumpTimeoutRef.current) clearTimeout(bumpTimeoutRef.current);
    };
  }, [phase, isWobbling, currentStance, isRandomBump]);

  // Determine carriage shake & sway animation classes
  const carriageShakeClass = useMemo(() => {
    if (isWobbling) return 'animate-subway-wobble';
    if (isRandomBump) return 'animate-subway-bump';
    if (currentStance === 'unheld') return 'animate-subway-standing';
    if (currentStance === 'holding') return 'animate-subway-holding';
    return 'animate-subway-seated';
  }, [isWobbling, isRandomBump, currentStance]);

  // Question Countdown Timer
  useEffect(() => {
    if (phase !== 'playing' || showExplanation || activeMiniGame !== null) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setTimeLeft(QUESTION_TIME_LIMIT);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, currentQIndex, showExplanation, activeMiniGame]);

  const handleStartGame = () => {
    playBackgroundAudio();
    setPhase('playing');
    setCurrentQIndex(0);
    setCorrectCount(0);
    setMistakeCount(0);
    setBalance(100);
    setConsecutiveCorrect(0);
    setMaxStreak(0);
    setSelectedOption(null);
    setShowExplanation(false);
    setIsTimeout(false);
    setEliminatedIndices([]);
    setActiveMiniGame(null);
    setIsSeated(false);
    setHasShield(false);
    setItems({ cracker: 2, plum: 2, shield: 0, socks: 1 });
    setTimeLeft(QUESTION_TIME_LIMIT);
  };

  // Triggered when user selects an answer option
  const handleSelectAnswer = (optionIdx: number) => {
    if (selectedOption !== null || showExplanation || timeLeft <= 0) return;
    if (eliminatedIndices.includes(optionIdx)) return; // Can't choose eliminated option
    if (timerRef.current) clearInterval(timerRef.current);

    setSelectedOption(optionIdx);
    const question = SUBWAY_QUESTIONS[currentQIndex % SUBWAY_QUESTIONS.length];
    const isCorrect = optionIdx === question.correctIndex;
    setIsAnswerCorrect(isCorrect);
    setIsTimeout(false);
    setShowExplanation(true);

    if (isCorrect) {
      playQuizCorrectChime();
      setBalance(100);
      setTiltAngle(0);
      const nextCorrect = correctCount + 1;
      setCorrectCount(nextCorrect);
      const nextStreak = consecutiveCorrect + 1;
      setConsecutiveCorrect(nextStreak);
      if (nextStreak > maxStreak) setMaxStreak(nextStreak);

      if (nextStreak === 3) {
        setPassengerBubble('🔥 三連勝！全車乘客露出佩服的眼神！');
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      }

      // Spontaneous Random Seat Offering (讓座隨機出現)
      if (!isSeated) {
        const seatOfferRoll = Math.random();
        if (seatOfferRoll < 0.32 || (nextCorrect >= 4 && seatOfferRoll < 0.55)) {
          setIsSeated(true);
          playSuccessChime();
          confetti({ particleCount: 55, spread: 65, origin: { y: 0.6 } });
          setPassengerBubble('🧍 讓座同學抬頭看見好孕胸章，立即起立讓座：「媽咪您辛苦了，請坐這裡！」💖');
          setBroadcastText('💖 乘客主動感動讓座！媽咪安心就座，享受平穩通勤！');
        } else {
          setPassengerBubble('💪 媽咪雙手穩穩握好黃色立柱！身體平衡超穩定！');
          setBroadcastText('💪 媽咪扶好立柱了！車廂前行中，留意是否有好心乘客讓座或空位！');
        }
      }

      // Spontaneous Random Shield Blessing (護盾隨機出現)
      if (!hasShield && Math.random() < 0.28) {
        setHasShield(true);
        setItems((prev) => ({ ...prev, shield: prev.shield + 1 }));
        setPassengerBubble('🛡️ 暖心隨機祝福！熱心乘客送來【好孕金牌護盾】，為媽咪隨機抵擋一次失衡！✨');
        playKawaiiCoin();
      }

      // Check Win Condition
      if (nextCorrect >= targetWinCount || currentQIndex >= SUBWAY_QUESTIONS.length - 1) {
        setTimeout(() => {
          handleTriggerWin();
        }, 1300);
      }
    } else {
      playQuizWrongChime();
      setConsecutiveCorrect(0);
      handleRecordMistake(false);
    }
  };

  // Time expired handler
  const handleTimeExpire = () => {
    setIsTimeout(true);
    setIsAnswerCorrect(false);
    setShowExplanation(true);
    setConsecutiveCorrect(0);
    playQuizWrongChime();
    handleRecordMistake(true);
  };

  // Handle mistake accumulation
  const handleRecordMistake = (byTimeout: boolean) => {
    if (hasShield) {
      setHasShield(false);
      setPassengerBubble('🛡️ 好孕金牌胸章發威！成功抵擋一次急煞失衡！');
      setBroadcastText('🛡️ 媽咪緊握立柱，護盾抵擋了晃動！化險為夷！');
      setIsWobbling(false);
      playSuccessChime();
      return;
    }

    setIsWobbling(true);
    setTiltAngle(Math.random() > 0.5 ? -35 : 35);

    const nextMistakes = mistakeCount + 1;
    setMistakeCount(nextMistakes);
    setBalance(nextMistakes >= MAX_MISTAKES ? 0 : nextMistakes === 3 ? 25 : nextMistakes === 2 ? 50 : 75);

    setTimeout(() => {
      setIsWobbling(false);
      setTiltAngle(0);
    }, 1000);

    if (nextMistakes >= MAX_MISTAKES) {
      setPassengerBubble('😱 全車乘客：「天哪！列車一個大急煞～媽咪飛出去了！」');
      setBroadcastText('🚨 警報！累積失衡 4 次急煞！媽咪直接重心不穩飛出車廂！');
      setTimeout(() => {
        setPhase('lost');
      }, 1400);
    }
  };

  const handleNextQuestion = () => {
    playKawaiiPop();
    setSelectedOption(null);
    setShowExplanation(false);
    setIsTimeout(false);
    setEliminatedIndices([]);
    const nextQ = currentQIndex + 1;
    setCurrentQIndex(nextQ);

    // Station Transition Check
    if (nextQ === 5 || nextQ === 10 || nextQ === 15 || nextQ === 20) {
      playSubwayStationChime();
      playMetroDoorBeep();
      // Trigger Balance QTE Mini-Game at station curve!
      triggerBalanceQte();
      return;
    }

    // Seat Dilemma Random Event Check: occurs randomly when not seated
    if (!isSeated && !triggeredIncidents.includes('seat_dilemma') && (nextQ === 3 || (nextQ >= 2 && Math.random() < 0.35))) {
      setTriggeredIncidents((prev) => [...prev, 'seat_dilemma']);
      triggerSeatDilemma();
      return;
    }

    // Dynamic incidents at other stations
    if (nextQ === 2 && !triggeredIncidents.includes('curve')) {
      setTriggeredIncidents((prev) => [...prev, 'curve']);
      setActiveIncident({
        id: 'curve',
        title: '⚠️ 突發狀況：列車即將大過彎！',
        desc: '前方大彎道！車廂離心力晃動，請立即握穩黃色立柱！',
        actionText: '💪 抓緊立柱！'
      });
    } else if (nextQ === 7 && !triggeredIncidents.includes('plum')) {
      setTriggeredIncidents((prev) => [...prev, 'plum']);
      setActiveIncident({
        id: 'plum',
        title: '👵 暖心小巧思：陳阿嬤遞來生津話梅！',
        desc: '陳阿嬤看媽咪有點孕吐臉色微白：「妹妹吃顆話梅含著生津止渴！」失衡容錯次數 +1，答題時間延長 +5 秒！',
        actionText: '💖 謝謝陳阿嬤！'
      });
    } else if (nextQ === 12 && !triggeredIncidents.includes('dog')) {
      setTriggeredIncidents((prev) => [...prev, 'dog']);
      setActiveIncident({
        id: 'dog',
        title: '🐶 萌寵突發：推車裡的小柴犬豆豆探頭！',
        desc: '推車裡的小柴犬探出毛茸茸小臉蛋汪了一聲，吐出小舌頭，全車乘客被融化！緊張氣氛消除，答題時間延長 +5 秒！',
        actionText: '🥰 摸摸小柴犬！'
      });
    } else if (nextQ === 17 && !triggeredIncidents.includes('broadcast')) {
      setTriggeredIncidents((prev) => [...prev, 'broadcast']);
      setHasShield(true);
      setItems((prev) => ({ ...prev, shield: prev.shield + 1 }));
      setActiveIncident({
        id: 'broadcast',
        title: '📢 暖心廣播：北捷站務廣播同理心宣導！',
        desc: '廣播響起：「車廂內請主動關心身邊需要座位的旅客，感謝您的愛心。」全車乘客好感度暴增，隨機獲贈【好孕護盾 x1】！',
        actionText: '✨ 感受車廂溫暖！'
      });
    } else if (nextQ === 22 && !triggeredIncidents.includes('kick')) {
      setTriggeredIncidents((prev) => [...prev, 'kick']);
      setActiveIncident({
        id: 'kick',
        title: '👶 溫馨小彩蛋：肚子裡的寶寶踢了一腳！',
        desc: '『媽咪站得好穩，好棒！』肚子冒出滿滿愛心光芒，平衡值加滿，精神抖擻！',
        actionText: '🥰 摸摸肚肚繼續加油！'
      });
    }
  };

  // Balance QTE Mini-Game
  const triggerBalanceQte = () => {
    setActiveMiniGame('balance_qte');
    setQteProgress(20);
    setQteTimeLeft(5);

    if (qteTimerRef.current) clearInterval(qteTimerRef.current);
    qteTimerRef.current = setInterval(() => {
      setQteTimeLeft((prev) => {
        if (prev <= 1) {
          if (qteTimerRef.current) clearInterval(qteTimerRef.current);
          handleFinishQte(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleQteTap = () => {
    playKawaiiPop();
    setQteProgress((prev) => {
      const next = prev + 18;
      if (next >= 100) {
        if (qteTimerRef.current) clearInterval(qteTimerRef.current);
        handleFinishQte(true);
        return 100;
      }
      return next;
    });
  };

  const handleFinishQte = (success: boolean) => {
    if (success) {
      playSuccessChime();
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      setBalance(100);
      setItems((prev) => ({ ...prev, shield: prev.shield + 1 }));
      setPassengerBubble('🎉 平衡挑戰大成功！四平八穩無傷通過，獲得【好孕護盾 x1】！');
      setBroadcastText('💪 媽咪身手矯健，獲得全車乘客一致起立鼓掌！');
    } else {
      playKawaiiOuch();
      setPassengerBubble('😵 列車太晃啦！稍微踉蹌了一下，但媽咪還是努力站穩了！');
    }
    setTimeout(() => {
      setActiveMiniGame(null);
    }, 1100);
  };

  // Seat Dilemma Event Trigger
  const triggerSeatDilemma = () => {
    playMetroDoorBeep();
    playKawaiiPop();
    setActiveMiniGame('seat_dilemma');
    setDilemmaOutcome(null);
    setDilemmaTimeLeft(8);

    if (dilemmaTimerRef.current) clearInterval(dilemmaTimerRef.current);
    dilemmaTimerRef.current = setInterval(() => {
      setDilemmaTimeLeft((prev) => {
        if (prev <= 1) {
          if (dilemmaTimerRef.current) clearInterval(dilemmaTimerRef.current);
          handleSeatDilemmaChoice('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSeatDilemmaChoice = (choice: 'self' | 'elder' | 'collaborate' | 'timeout') => {
    if (dilemmaTimerRef.current) clearInterval(dilemmaTimerRef.current);

    if (choice === 'self') {
      playSuccessChime();
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      setIsSeated(true);
      setBalance(100);
      setHasShield(true);
      setItems((prev) => ({ ...prev, shield: prev.shield + 1 }));
      setPassengerBubble('💖 隔壁張老爺爺笑著點頭：「妹子肚子那麼大快坐好！保護寶寶最重要！」');
      setBroadcastText('💖 媽咪安穩就座！懂得照顧自己與寶寶，全車乘客安心點頭！');

      setDilemmaOutcome({
        choice: 'self',
        title: '【母子平安 · 懂得自愛的智慧】',
        story: `${currentMomName}輕撫著 6.5kg 的孕肚快步安穩就座，緊繃沉重的下背與水腫雙腿瞬間獲得解放，肚子裡的寶寶也開心地輕踢了一下！旁邊拄著拐杖的張老爺爺見狀和藹笑道：「妹子快坐好！懷孕是兩條人命，肚子這麼大站著太危險了，這是妳應得的！」後方的高中生也主動站起來把位置讓給老爺爺，全車皆大歡喜！`,
        moral: '懷孕期間生理負擔沉重，適時接受並使用博愛座是照顧胎兒的成熟表現，不用對照顧自己的需求感到內疚！',
        rewardText: '✨ 進入安穩就座狀態！站立壓力歸零、平衡值回滿 100%、隨機獲得【好孕自愛護盾 x1】！',
        badge: '💖 好孕自愛守護者',
        icon: '💺'
      });
    } else if (choice === 'elder') {
      playSuccessChime();
      confetti({ particleCount: 110, spread: 85, origin: { y: 0.5 } });
      setIsSeated(true);
      setConsecutiveCorrect((c) => c + 1);
      setBalance(100);
      setHasShield(true);
      setItems((prev) => ({
        cracker: prev.cracker + 1,
        plum: prev.plum + 1,
        shield: prev.shield + 1,
        socks: prev.socks + 1
      }));
      setPassengerBubble('😭 全車乘客大震撼：「天哪！懷孕媽咪主動讓座！」全車起立讓座！');
      setBroadcastText('🌟 善念大循環！全車乘客深受感動，全員主動起立為媽咪讓座！');

      setDilemmaOutcome({
        choice: 'elder',
        title: '【善念大循環 · 暖心天使引發全車起立】',
        story: `${currentMomName}親切招呼：「張爺爺您小心走，這裡有空位您快坐！」老爺爺眼泛熱淚緊握媽咪雙手感激不已。這一幕被車廂裡的乘客全看在眼裡——戴耳機的高中生與低頭滑手機的上班族滿臉慚愧，瞬間「刷」地全員起立為媽咪讓出 3 個座位，熱情招呼媽咪入座！車廂響起了溫暖感動的掌聲！`,
        moral: '善意是具備強大傳染力的！一次無私體貼的舉動，化解了都市通勤的冷漠，喚醒了整個車廂對弱勢互助的同理心！',
        rewardText: '🎉 全車乘客起立讓座！背包錦囊全滿（餅乾+話梅+護盾+彈性襪各+1），獲得好孕護盾，解鎖就座！',
        badge: '✨ 善念循環天使',
        icon: '🤝'
      });
    } else if (choice === 'collaborate') {
      playSuccessChime();
      confetti({ particleCount: 85, spread: 70, origin: { y: 0.55 } });
      setIsSeated(true);
      setTimeLeft((t) => t + 5);
      setBalance(100);
      setHasShield(true);
      setItems((prev) => ({ ...prev, plum: prev.plum + 2, shield: prev.shield + 1 }));
      setPassengerBubble('🥰 同學滿臉通紅誠懇鞠躬：「對不起玩手遊太專注！媽咪快請坐！」');
      setBroadcastText('🤝 智慧溝通化解冷漠！老爺爺與媽咪同時安穩就座，雙贏大圓滿！');

      setDilemmaOutcome({
        choice: 'collaborate',
        title: '【溫暖車廂外交官 · 智慧雙贏大團圓】',
        story: `${currentMomName}先扶著老爺爺入座，接著微笑輕拍身旁年輕同學：「同學您好，可以跟您借個座位給孕婦休息嗎？」同學抬頭看見好孕胸章，立刻滿臉通紅誠懇鞠躬：「對不起！我玩手遊太專注了，媽咪您快請坐！」老爺爺與媽咪同時安穩就座，兩人開心地聊了起來，車廂充滿歡笑！`,
        moral: '主動溫和的開口不是索求，而是給予身邊人行善覺察的契機。許多人不是冷漠，只是沉浸於螢幕，智慧溝通能創造最溫暖的雙贏！',
        rewardText: '💡 雙人安穩就座！答題倒數時間額外 +5 秒，獲得生津話梅 x2，平衡回滿！',
        badge: '🤝 智慧雙贏協調家',
        icon: '💡'
      });
    } else {
      // Timeout
      playKawaiiPop();
      setBalance((b) => Math.min(100, b + 50));
      setItems((prev) => ({ ...prev, socks: prev.socks + 1 }));
      setPassengerBubble('😊 老爺爺和藹微笑：「妹子我們一起扶好立柱，快到站了！」');
      setBroadcastText('🚇 互相體諒互相打氣，心中有愛便能站得更穩！');

      setDilemmaOutcome({
        choice: 'timeout',
        title: '【通勤片刻的溫柔沉思】',
        story: '在倒數猶豫的片刻中，一位步履匆匆的乘客先坐了下去。老爺爺慢慢走到媽咪身旁，笑著對媽咪點頭：「妹子我們一起扶好，快到站了！」兩位相視一笑，互相提醒注意平衡，雖未坐下但彼此心中皆感到滿滿暖意。',
        moral: '捷運上每一次座位的流動，都是一堂生動的同理心練習。無論有沒有坐到位置，心中有愛便能站得更穩！',
        rewardText: '🌱 體會通勤不易，獲得耐力補給【彈性減壓襪 x1】，平衡值回覆 50%！',
        badge: '🌱 堅定守護心靈',
        icon: '⏰'
      });
    }
  };

  const handleCloseSeatDilemma = () => {
    playKawaiiPop();
    if (dilemmaTimerRef.current) clearInterval(dilemmaTimerRef.current);
    setActiveMiniGame(null);
    setDilemmaOutcome(null);
  };

  // Item Usage
  const handleUseItem = (type: 'cracker' | 'plum' | 'shield' | 'socks') => {
    if (showExplanation || timeLeft <= 0) return;
    const count = items[type];
    if (count <= 0) return;

    if (type === 'cracker') {
      const currentQ = SUBWAY_QUESTIONS[currentQIndex % SUBWAY_QUESTIONS.length];
      const incorrectIndices = currentQ.options
        .map((_, i) => i)
        .filter((i) => i !== currentQ.correctIndex && !eliminatedIndices.includes(i));

      if (incorrectIndices.length <= 1) {
        setPassengerBubble('💡 已經不能再排除更多選項囉！');
        return;
      }

      const toEliminate = incorrectIndices.slice(0, 2);
      setEliminatedIndices((prev) => [...prev, ...toEliminate]);
      setItems((prev) => ({ ...prev, cracker: prev.cracker - 1 }));
      playSuccessChime();
      setPassengerBubble('🍪 吃了乾蘇打餅乾，晨吐反胃消除！學霸同學幫妳劃掉 2 個錯誤選項！');
    } else if (type === 'plum') {
      setTimeLeft((t) => t + 10);
      setItems((prev) => ({ ...prev, plum: prev.plum - 1 }));
      playKawaiiCoin();
      setPassengerBubble('🍋 吃下生津酸梅！精神抖擻，答題時間延長 +10 秒！');
    } else if (type === 'shield') {
      setHasShield(true);
      setItems((prev) => ({ ...prev, shield: prev.shield - 1 }));
      playSuccessChime();
      setPassengerBubble('🛡️ 好孕金牌胸章啟動！獲得一次免失衡防護盾！');
    } else if (type === 'socks') {
      setBalance(100);
      setItems((prev) => ({ ...prev, socks: prev.socks - 1 }));
      playSuccessChime();
      setPassengerBubble('🧦 穿上梯度醫用彈性襪！下肢血液順暢回流，平衡值回滿 100%！');
    }
  };

  // Resolve dynamic incident
  const handleResolveIncident = () => {
    if (!activeIncident) return;
    playSuccessChime();
    if (activeIncident.id === 'curve') {
      setHasShield(true);
      setPassengerBubble('🛡️ 成功握緊立柱！獲得【好孕護盾】，可防禦一次急煞！');
      setBroadcastText('🛡️ 媽咪緊握立柱，獲得護盾保佑！');
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
    } else if (activeIncident.id === 'plum') {
      setTimeLeft((t) => t + 5);
      setMistakeCount((m) => Math.max(0, m - 1));
      setPassengerBubble('🍬 吃下阿嬤的話梅糖，胃部舒緩，失衡次數 -1，答題時間延長 5 秒！');
      setBroadcastText('🍬 生津止渴舒緩孕吐，獲得長輩溫暖祝福！');
    } else if (activeIncident.id === 'dog') {
      setTimeLeft((t) => t + 5);
      setBalance(100);
      setPassengerBubble('🐶 柴犬豆豆開心地搖尾巴：汪汪！答題時間再 +5 秒！');
      setBroadcastText('🐶 萌寵療癒全車，乘客們紛紛露出溫暖微笑！');
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    } else if (activeIncident.id === 'broadcast') {
      setHasShield(true);
      setPassengerBubble('📢 全車乘客深受廣播觸動，紛紛投以友善關懷目光！');
      setBroadcastText('💖 友善車廂文化，同理心讓座更有愛！');
      confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
    } else if (activeIncident.id === 'kick') {
      setBalance(100);
      setPassengerBubble('👶 寶寶在肚子裡揮揮小手：媽咪加油！');
      setBroadcastText('👶 胎動頻繁活躍，母子同心迎戰魔王題！');
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    }
    setActiveIncident(null);
  };

  const handleTriggerWin = () => {
    setPhase('won');
    setBroadcastText('終點站淡水到了，右側開門。下車時請注意間隙。');
    setTimeout(() => {
      playSuccessChime();
    }, 400);
    confetti({
      particleCount: 180,
      spread: 85,
      origin: { y: 0.6 }
    });
  };

  // Multi-lingual broadcast switcher
  const handleToggleBroadcastLang = () => {
    playMetroDoorBeep();
    const nextLang =
      broadcastLang === 'zh' ? 'tw' :
      broadcastLang === 'tw' ? 'hakka' :
      broadcastLang === 'hakka' ? 'en' : 'zh';
    setBroadcastLang(nextLang);

    if (nextLang === 'zh') {
      setBroadcastText(`${currentStation.name}到了，右側開門。下車請注意間隙。`);
    } else if (nextLang === 'tw') {
      setBroadcastText(`${currentStation.name}到了，倒手爿開門。落車請注意空隙。`);
    } else if (nextLang === 'hakka') {
      setBroadcastText(`${currentStation.name}到了，左側開門。落車請注意空隙。`);
    } else {
      setBroadcastText(`${currentStation.name} Station. Doors open on the right. Mind the gap.`);
    }
  };

  // Passenger Clicks
  const handlePassengerClick = (type: 'grandma' | 'game' | 'sleep' | 'phone' | 'kid' | 'dog' | 'mom') => {
    playKawaiiPop();
    if (type === 'mom') {
      playSuccessChime();
      setPassengerBubble('👶 咚咚！肚子裡的寶寶輕輕踢了一下：『媽咪站得好穩，好棒！』💖');
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.5 } });
    } else if (type === 'grandma') {
      // Open Grandma's treasure basket modal!
      setActiveMiniGame('grandma_basket');
    } else if (type === 'kid') {
      setPassengerBubble('👧 小學生妹妹：「阿姨妳好！老師說好孕胸章代表肚子裡有可愛的小寶寶，我長大搭捷運也一定會讓座！」🎈');
    } else if (type === 'dog') {
      playKawaiiCoin();
      setTimeLeft((t) => t + 3);
      setPassengerBubble('🐕 柴犬豆豆：「汪汪！(吐著粉嫩小舌頭轉圈圈搖尾巴，答題時間免費 +3 秒！)」🦴');
    } else if (type === 'game') {
      if (isSeated) {
        setPassengerBubble('🧍 讓座同學：「媽咪請安心坐著！車廂晃動站著很辛苦的！」');
      } else if (Math.random() < 0.4) {
        // Spontaneous random seat offering on interaction!
        setIsSeated(true);
        playSuccessChime();
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        setPassengerBubble('🧍 高中生小明抬頭驚訝：「啊！學姊妳懷孕了！快請坐這裡！」立即起立讓座！💖');
        setBroadcastText('💖 乘客主動感動讓座！媽咪安心就座，享受平穩通勤！');
      } else {
        setItems((prev) => ({ ...prev, cracker: prev.cracker + 1 }));
        setPassengerBubble('🎮 高中生小明：「學姊！我把剛整理好的產科重點筆記給妳！(獲得乾蘇打餅乾 50/50 卡 x1)」');
      }
    } else if (type === 'sleep') {
      if (!hasShield && Math.random() < 0.35) {
        setHasShield(true);
        setItems((prev) => ({ ...prev, shield: prev.shield + 1 }));
        setPassengerBubble('😴 上班族林專員驚醒：「抱歉抱歉！這枚幸運【好孕護盾胸章】送給妳，保護妳安全！」(獲得好孕護盾 x1)✨');
      } else {
        setItems((prev) => ({ ...prev, plum: prev.plum + 1 }));
        setPassengerBubble('😴 上班族林專員：「哈欠...不好意思昨晚加班太累，這顆薄荷話梅給妳提神！(獲得生津話梅 x1)」');
      }
    } else {
      setPassengerBubble('📱 追劇小姐姐：「（戴著降噪耳機喝珍奶傻笑）這部韓劇太感人了！媽咪加油喔！」');
    }

    setTimeout(() => {
      setPassengerBubble(null);
    }, 4500);
  };

  const handlePickGrandmaGift = (giftType: 'cracker' | 'plum' | 'socks') => {
    playSuccessChime();
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    setItems((prev) => ({ ...prev, [giftType]: prev[giftType] + 1 }));
    setActiveMiniGame(null);
    if (giftType === 'cracker') {
      setPassengerBubble('👵 阿嬤笑呵呵：「妹子，這包蘇打餅乾給妳放包包，起床晨吐前含一片就不噁心囉！」(獲得蘇打餅乾 x1)');
    } else if (giftType === 'plum') {
      setPassengerBubble('👵 阿嬤笑呵呵：「這顆紫蘇酸梅酸甜生津，胃口大開喔！」(獲得生津話梅 x1)');
    } else {
      setPassengerBubble('👵 阿嬤笑呵呵：「這雙彈性襪保護小腿靜脈曲張，站捷運最實用！」(獲得彈性減壓襪 x1)');
    }
  };

  const currentQ = SUBWAY_QUESTIONS[currentQIndex % SUBWAY_QUESTIONS.length];

  return (
    <div className="w-full max-w-[1700px] mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4 space-y-3 sm:space-y-4">
      {/* =========================================================================
          WELCOME / SETUP SCREEN
         ========================================================================= */}
      {phase === 'welcome' && (
        <div className="bg-gradient-to-b from-[#D3E8F4]/80 via-[#FFE0E6]/90 to-[#FFFCF4] rounded-3xl border-3 border-[#FFBCBD] p-5 sm:p-10 shadow-lg text-center space-y-5 max-w-3xl mx-auto animate-in zoom-in-95 duration-200">
          <div className="flex justify-center">
            <PregnantMomIllustration
              mood="idle"
              name={currentMomName}
              badgeStyle={profile.badgeStyle}
              tiltAngle={0}
            />
          </div>

          <div className="space-y-2">
            <div className="inline-block bg-[#E85D75] text-white text-xs font-black px-4 py-1.5 rounded-full shadow-xs">
              🚇 捷運車廂妊娠體驗 · 友善讓座倡議大冒險
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#4A3337] font-serif-tc tracking-tight">
              站穩啦！{currentMomName}的捷運無座大考驗
            </h1>
            <p className="text-xs sm:text-sm text-[#6B4B52] max-w-lg mx-auto leading-relaxed font-medium">
              體驗者正在進行 6.5kg 負重實測，<strong>捷運上沒有任何同學主動讓座！</strong> 車廂行進間隨機輕微顛簸，每題限時 <strong>15 秒</strong>，共 <strong>25 題產科精選題庫</strong>，跨越 5 座捷運車站！答對題目抓穩黃色立柱；車廂內會<strong>隨機出現好心乘客讓座、空位抉擇考驗與好孕護盾祝福</strong>；亦有車廂阿嬤菜籃摸彩、柴犬互動等驚喜！
            </p>
          </div>

          {/* Game Mode Selector */}
          <div className="bg-[#FFFCF4]/90 rounded-2xl border-2 border-[#FFBCBD] p-4 text-left space-y-2.5 shadow-xs">
            <label className="block text-xs font-black text-[#4A3337]">
              選擇挑戰遊玩模式：
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setGameMode('full_tour')}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  gameMode === 'full_tour'
                    ? 'border-[#E85D75] bg-[#FFE0E6] text-[#4A3337] shadow-sm font-black'
                    : 'border-[#FFBCBD]/50 bg-white text-[#6B4B52] hover:bg-[#FFE0E6]/40'
                }`}
              >
                <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-[#E85D75]">
                  <span>🚇 全線巡禮模式</span>
                </div>
                <div className="text-[10px] text-[#7A5860] mt-1 font-medium leading-snug">
                  跨越 5 座車站長征！需答對 16 題或抵達淡水，遊玩時間約 8~12 分鐘（最完整豐富！）
                </div>
              </button>

              <button
                type="button"
                onClick={() => setGameMode('quick_challenge')}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  gameMode === 'quick_challenge'
                    ? 'border-[#E85D75] bg-[#FFE0E6] text-[#4A3337] shadow-sm font-black'
                    : 'border-[#FFBCBD]/50 bg-white text-[#6B4B52] hover:bg-[#FFE0E6]/40'
                }`}
              >
                <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-[#E85D75]">
                  <span>⚡ 快速通勤考驗</span>
                </div>
                <div className="text-[10px] text-[#7A5860] mt-1 font-medium leading-snug">
                  快節奏 8 題通關，快速體驗讓座溫馨感動，約 4~6 分鐘！
                </div>
              </button>

              <button
                type="button"
                onClick={() => setGameMode('endless')}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  gameMode === 'endless'
                    ? 'border-[#E85D75] bg-[#FFE0E6] text-[#4A3337] shadow-sm font-black'
                    : 'border-[#FFBCBD]/50 bg-white text-[#6B4B52] hover:bg-[#FFE0E6]/40'
                }`}
              >
                <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-[#E85D75]">
                  <span>♾️ 無盡產科試煉</span>
                </div>
                <div className="text-[10px] text-[#7A5860] mt-1 font-medium leading-snug">
                  題目持續不中斷，看媽咪能穩住幾題，挑戰最高連勝紀錄！
                </div>
              </button>
            </div>
          </div>

          {/* Player Customization */}
          <div className="bg-[#FFFCF4]/90 rounded-2xl border-2 border-[#FFBCBD] p-4 sm:p-5 space-y-3 text-left shadow-xs">
            <div>
              <label className="block text-xs font-black text-[#4A3337] mb-1">
                體驗主角姓名（請自訂您的名稱）：
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="請輸入姓名（例如：小潔媽咪、雅麟、芳儀...）"
                className="w-full p-2.5 sm:p-3 bg-[#FFE0E6]/40 rounded-xl border border-[#FFBCBD] text-sm font-black text-[#4A3337] placeholder:text-[#9C7A82] placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#E85D75]"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-[#4A3337] mb-1">
                隨身佩戴的好孕胸章：
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setProfile({ ...profile, badgeStyle: 'pink_heart' })}
                  className={`p-2.5 sm:p-3 rounded-xl border-2 text-center text-xs font-bold transition-all cursor-pointer ${
                    profile.badgeStyle === 'pink_heart'
                      ? 'border-[#E85D75] bg-[#FFE0E6] text-[#4A3337] shadow-sm scale-102 font-black'
                      : 'border-[#FFBCBD]/50 bg-[#FFFCF4] text-[#6B4B52] hover:bg-[#FFE0E6]/50'
                  }`}
                >
                  <div className="text-xl mb-1">💖</div>
                  <div>溫暖愛心章</div>
                  <div className="text-[10px] text-[#E85D75] font-medium">經典好孕</div>
                </button>

                <button
                  type="button"
                  onClick={() => setProfile({ ...profile, badgeStyle: 'dino_egg' })}
                  className={`p-2.5 sm:p-3 rounded-xl border-2 text-center text-xs font-bold transition-all cursor-pointer ${
                    profile.badgeStyle === 'dino_egg'
                      ? 'border-emerald-600 bg-emerald-100 text-emerald-950 shadow-sm scale-102 font-black'
                      : 'border-[#FFBCBD]/50 bg-[#FFFCF4] text-[#6B4B52] hover:bg-emerald-50'
                  }`}
                >
                  <div className="text-xl mb-1">🦖</div>
                  <div>恐龍蛋孵化中</div>
                  <div className="text-[10px] text-emerald-700 font-medium">暴龍會踢肚！</div>
                </button>

                <button
                  type="button"
                  onClick={() => setProfile({ ...profile, badgeStyle: 'watermelon' })}
                  className={`p-2.5 sm:p-3 rounded-xl border-2 text-center text-xs font-bold transition-all cursor-pointer ${
                    profile.badgeStyle === 'watermelon'
                      ? 'border-rose-600 bg-rose-100 text-rose-950 shadow-sm scale-102 font-black'
                      : 'border-[#FFBCBD]/50 bg-[#FFFCF4] text-[#6B4B52] hover:bg-rose-50'
                  }`}
                >
                  <div className="text-xl mb-1">🍉</div>
                  <div>偷藏大西瓜</div>
                  <div className="text-[10px] text-rose-700 font-medium">剛吞了西瓜！</div>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-1 flex flex-col sm:flex-row items-center gap-2">
            <button
              onClick={handleStartGame}
              className="flex-1 w-full py-3.5 bg-[#E85D75] hover:bg-[#D44763] active:scale-98 text-white rounded-2xl font-black text-sm sm:text-base shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              <span>進入車廂 · 接受捷運無座大考驗！</span>
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="px-4 py-3.5 bg-[#FFFCF4] hover:bg-[#FFE0E6] text-[#4A3337] rounded-2xl border-2 border-[#FFBCBD] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              title="適合電腦投影/全螢幕遊玩"
            >
              <Monitor className="w-4 h-4 text-[#E85D75]" />
              <span>{isFullscreen ? '縮小視窗' : '電腦全螢幕模式'}</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MAIN GAMEPLAY ARENA
         ========================================================================= */}
      {phase === 'playing' && (
        <div className="space-y-3">
          {/* Top HUD Status Bar */}
          <div className="bg-[#FFE0E6]/95 rounded-2xl sm:rounded-3xl border-2 border-[#FFBCBD] p-2.5 sm:p-3 shadow-sm flex flex-wrap items-center justify-between gap-2">
            {/* Player info & Station badge */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-[#D3E8F4] border-2 border-[#FFBCBD] flex items-center justify-center text-xl sm:text-2xl shadow-xs shrink-0">
                {profile.avatar}
              </div>
              <div>
                <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-black text-[#4A3337]">{currentMomName}</span>
                  {/* Metro Station Indicator */}
                  <span className="text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white shadow-2xs">
                    📍 {currentStation.name}
                  </span>
                  <span className={`text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full ${
                    isSeated
                      ? 'bg-emerald-100 text-emerald-800'
                      : correctCount >= 1
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {isSeated
                      ? '💖 獲讓座就座中！'
                      : correctCount >= 1
                      ? '💪 已扶穩立柱！'
                      : '🚶 站立乘車中'}
                  </span>
                  {hasShield && (
                    <span className="text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-500 text-white shadow-2xs animate-pulse flex items-center gap-0.5">
                      <span>🛡️ 護盾已生效</span>
                    </span>
                  )}
                </div>
                <div className="text-[10px] sm:text-xs text-[#6B4B52] hidden sm:block">
                  {currentStation.subtitle}
                </div>
              </div>
            </div>

            {/* Metrics & Control Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {/* Score Badges */}
              <div className="flex items-center gap-1.5 sm:gap-2.5 bg-[#FFFCF4] px-2.5 sm:px-3 py-1 rounded-xl border border-[#FFBCBD] text-xs">
                <div className="text-center">
                  <span className="text-[9px] text-[#7A5860] block font-bold leading-none sm:mb-0.5">答對</span>
                  <span className="text-xs sm:text-sm font-black text-[#E85D75] font-mono">
                    {correctCount}/{targetWinCount === 999 ? '∞' : targetWinCount}
                  </span>
                </div>
                <div className="h-6 w-px bg-[#FFBCBD]/60" />
                <div className="text-center">
                  <span className="text-[9px] text-[#7A5860] block font-bold leading-none sm:mb-0.5">連勝</span>
                  <span className="text-xs sm:text-sm font-black text-amber-600 font-mono">
                    {consecutiveCorrect} 題
                  </span>
                </div>
                <div className="h-6 w-px bg-[#FFBCBD]/60" />
                <div className="text-center">
                  <span className="text-[9px] text-[#7A5860] block font-bold leading-none sm:mb-0.5">失衡(滿4急煞)</span>
                  <span className={`text-xs sm:text-sm font-black font-mono ${mistakeCount >= 2 ? 'text-red-600 animate-pulse' : 'text-[#4A3337]'}`}>
                    {mistakeCount}/{MAX_MISTAKES}
                  </span>
                </div>
              </div>

              {/* Station Broadcast Audio Button */}
              <button
                type="button"
                onClick={playBackgroundAudio}
                className="px-2.5 py-1.5 bg-[#E85D75] hover:bg-[#D44763] text-white rounded-xl text-[11px] sm:text-xs font-black flex items-center gap-1 shadow-xs cursor-pointer"
                title="背景播放廣播原音（純音訊，無畫面）"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">播原音</span>
              </button>

              {/* Fullscreen toggle */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="px-2.5 py-1.5 bg-[#D3E8F4] hover:bg-[#c0def0] text-[#4A3337] rounded-xl border border-[#FFBCBD] text-[11px] sm:text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-[#E85D75]" /> : <Maximize2 className="w-3.5 h-3.5 text-[#E85D75]" />}
                <span className="hidden xl:inline">{isFullscreen ? '視窗' : '全螢幕'}</span>
              </button>

              {/* Mobile View Toggle */}
              <button
                type="button"
                onClick={() => setMobileExpandedCarriage(!mobileExpandedCarriage)}
                className="lg:hidden px-2.5 py-1.5 bg-[#FFFCF4] text-[#4A3337] rounded-xl border border-[#FFBCBD] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 text-[#E85D75]" />
                <span>{mobileExpandedCarriage ? '返回同屏' : '放大車廂'}</span>
              </button>
            </div>
          </div>

          {/* Invisible background media elements */}
          <audio ref={bgAudioRef} src="/audio/guandu_29s.mp3" preload="auto" className="hidden" />
          <video ref={bgVideoMediaRef} playsInline style={{ display: 'none' }} />

          {/* 2-Column Responsive Layout with viewport subtle train sway reaction */}
          <div className={`grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start transition-transform duration-200 ${
            isRandomBump
              ? (bumpDirection === 'left' ? '-translate-x-0.5 translate-y-0.5 rotate-[-0.2deg]' : 'translate-x-0.5 -translate-y-0.5 rotate-[0.2deg]')
              : ''
          }`}>
            {/* Left Column (lg:col-span-7): The Interactive Subway Carriage Scene */}
            <div className={`lg:col-span-7 transition-all ${
              mobileExpandedCarriage ? 'h-auto' : 'sticky top-[58px] lg:static z-20'
            }`}>
              <div className={`relative ${
                mobileExpandedCarriage
                  ? 'h-[280px] sm:h-[340px]'
                  : 'h-[165px] sm:h-[210px] lg:h-[415px] xl:h-[445px]'
              } bg-gradient-to-b from-[#D3E8F4] via-[#FFE0E6]/50 to-[#FFFCF4] rounded-2xl sm:rounded-3xl border-2 sm:border-3 border-[#FFBCBD] overflow-hidden shadow-sm flex flex-col justify-between p-2 sm:p-3 lg:p-4 select-none ${carriageShakeClass}`}>

                {/* Real Guandu / Metro LED Door Matrix Display (Click to switch 4 languages!) */}
                <div
                  onClick={handleToggleBroadcastLang}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl sm:rounded-2xl p-1.5 sm:p-2 shadow-md text-white font-mono shrink-0 cursor-pointer group"
                  title="點擊跑馬燈切換四語廣播（國/台/客/英）！"
                >
                  {/* Route strip */}
                  <div className="hidden sm:flex items-center justify-between text-[9px] sm:text-[10px] text-stone-400 pb-0.5 border-b border-stone-800">
                    <span className="text-red-500 font-bold">● 淡水信義線 (Red Line)</span>
                    <span className="truncate mx-1">
                      {STATIONS.map((st, i) => (
                        <span key={st.id} className={st.id === currentStation.id ? 'text-white bg-red-600 px-1 rounded font-bold' : 'text-stone-500'}>
                          {st.name} {i < STATIONS.length - 1 ? '◀ ' : ''}
                        </span>
                      ))}
                    </span>
                    <span className="text-amber-400 font-bold text-[9px] group-hover:underline">點此換語言</span>
                  </div>

                  {/* Main LED Matrix Screen */}
                  <div className="grid grid-cols-12 items-center gap-1 py-0.5 sm:py-1">
                    <div className="col-span-3 text-left">
                      <span className="inline-block bg-amber-500/20 border border-amber-500 text-amber-400 px-1 py-0.2 rounded text-[8px] sm:text-[10px] font-black">
                        往淡水
                      </span>
                    </div>

                    <div className="col-span-6 text-center">
                      <span className="text-emerald-400 text-xs sm:text-base lg:text-lg font-black tracking-wider drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]">
                        {currentStation.name} · {currentStation.id}
                      </span>
                    </div>

                    <div className="col-span-3 text-right">
                      <span className="inline-flex items-center gap-1 bg-amber-500/20 border border-amber-500 text-amber-300 px-1 py-0.2 rounded text-[8px] sm:text-[10px] font-black">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                        開門
                      </span>
                    </div>
                  </div>

                  {/* Marquee Notice Bar with Language Tag */}
                  <div className="pt-0.5 border-t border-stone-800/80 flex items-center justify-between text-[9px] sm:text-[11px] text-amber-300 font-sans">
                    <div className="flex items-center gap-1 overflow-hidden">
                      <span className="bg-amber-400 text-stone-950 px-1 rounded text-[8px] font-black shrink-0">
                        {broadcastLang === 'zh' ? '國語' : broadcastLang === 'tw' ? '台語' : broadcastLang === 'hakka' ? '客語' : 'EN'}
                      </span>
                      <span className="text-amber-200 font-bold truncate animate-pulse">
                        {broadcastText}
                      </span>
                    </div>
                    <span className="text-[8px] sm:text-[9px] text-stone-400 font-mono hidden sm:inline shrink-0">
                      R24 ~ R28
                    </span>
                  </div>
                </div>

                {/* Subway Dynamic Sway & Gravity Posture Stress Indicator Bar */}
                <div className="w-full bg-[#FFFCF4]/95 border border-[#FFBCBD] rounded-xl px-2 sm:px-3 py-1 flex items-center justify-between gap-1.5 text-[9px] sm:text-[10px] shadow-2xs my-0.5">
                  {/* Left: Dynamic Train Motion status */}
                  <div className="flex items-center gap-1.5 font-bold text-[#4A3337] truncate">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      isWobbling
                        ? 'bg-rose-500 animate-ping'
                        : isRandomBump
                        ? 'bg-amber-500 animate-ping'
                        : 'bg-emerald-500 animate-pulse'
                    }`} />
                    <span className="font-mono text-[#E85D75] shrink-0 font-black">
                      {isWobbling ? '🚨 劇烈晃動' : isRandomBump ? '⚡ 軌道顛簸' : '🚃 車廂前行'}
                    </span>
                    <span className="text-[#6B4B52] hidden sm:inline truncate">
                      {swayDescription}
                    </span>
                  </div>

                  {/* Center: Real-time Dynamic Spirit Level (重心水準儀) */}
                  <div className="flex items-center gap-1 shrink-0 font-mono" title="即時檢測媽咪站立身體重心偏移角度">
                    <span className="text-[#7A5860] hidden md:inline text-[9px]">重心角:</span>
                    <div className="w-14 sm:w-20 h-2 sm:h-2.5 bg-stone-200/90 rounded-full relative overflow-hidden border border-stone-300 flex items-center justify-center">
                      {/* Center balance line */}
                      <div className="absolute w-0.5 h-full bg-stone-400 left-1/2 -translate-x-1/2" />
                      {/* Dynamic Bubble Indicator */}
                      <motion.div
                        className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shadow-xs ${
                          Math.abs(tiltAngle) > 10 ? 'bg-rose-500' : Math.abs(tiltAngle) > 4 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        animate={{ x: Math.max(-25, Math.min(25, tiltAngle * 1.6)) }}
                        transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                      />
                    </div>
                    <span className={`font-black text-[9px] sm:text-[10px] w-6 sm:w-7 text-right ${
                      Math.abs(tiltAngle) > 8 ? 'text-rose-600' : 'text-[#4A3337]'
                    }`}>
                      {tiltAngle > 0 ? `+${Math.round(tiltAngle)}°` : `${Math.round(tiltAngle)}°`}
                    </span>
                  </div>

                  {/* Right: Stress level badge & Shield indicator */}
                  <div className="flex items-center gap-1 shrink-0">
                    {hasShield && (
                      <span className="px-1.5 py-0.5 rounded-full font-black text-[8px] sm:text-[9px] bg-sky-100 text-sky-900 border border-sky-300 animate-pulse flex items-center gap-0.5">
                        <span>🛡️ 免急煞防護</span>
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded-full font-black text-[8px] sm:text-[9px] ${
                      currentStance === 'unheld'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                        : currentStance === 'holding'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                      {currentStance === 'unheld'
                        ? '⚠️ 站立重心不穩(負重大)'
                        : currentStance === 'holding'
                        ? '💪 扶好立柱(減壓70%)'
                        : '💖 安心就座(零壓力)'}
                    </span>
                  </div>
                </div>

                {/* Ceiling Dangling Handrails with Inertia Reaction */}
                <div className="w-full relative py-0.5">
                  <div className="flex justify-between items-center px-4 sm:px-10 opacity-70">
                    <motion.div
                      animate={{
                        rotate: isWobbling
                          ? [-22, 22, -16, 10, 0]
                          : isRandomBump
                          ? (bumpDirection === 'left' ? [-16, 12, -8] : [16, -12, 8])
                          : [-4, 4, -4]
                      }}
                      transition={{
                        repeat: isRandomBump || isWobbling ? 0 : Infinity,
                        duration: isWobbling ? 0.85 : isRandomBump ? 0.55 : 2.2,
                        ease: 'easeInOut'
                      }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-0.5 h-3 bg-stone-400" />
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 bg-amber-100/40" />
                    </motion.div>
                    <motion.div
                      animate={{
                        rotate: isWobbling
                          ? [20, -20, 14, -8, 0]
                          : isRandomBump
                          ? (bumpDirection === 'left' ? [-14, 10, -6] : [14, -10, 6])
                          : [3, -3, 3]
                      }}
                      transition={{
                        repeat: isRandomBump || isWobbling ? 0 : Infinity,
                        duration: isWobbling ? 0.85 : isRandomBump ? 0.55 : 2.5,
                        ease: 'easeInOut'
                      }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-0.5 h-3 bg-stone-400" />
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 bg-amber-100/40" />
                    </motion.div>
                    <motion.div
                      animate={{
                        rotate: isWobbling
                          ? [-24, 24, -18, 12, 0]
                          : isRandomBump
                          ? (bumpDirection === 'left' ? [-18, 14, -10] : [18, -14, 10])
                          : [-3, 3, -3]
                      }}
                      transition={{
                        repeat: isRandomBump || isWobbling ? 0 : Infinity,
                        duration: isWobbling ? 0.85 : isRandomBump ? 0.55 : 2.1,
                        ease: 'easeInOut'
                      }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-0.5 h-3 bg-stone-400" />
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 bg-amber-100/40" />
                    </motion.div>
                    <motion.div
                      animate={{
                        rotate: isWobbling
                          ? [22, -22, 16, -10, 0]
                          : isRandomBump
                          ? (bumpDirection === 'left' ? [-15, 11, -7] : [15, -11, 7])
                          : [4, -4, 4]
                      }}
                      transition={{
                        repeat: isRandomBump || isWobbling ? 0 : Infinity,
                        duration: isWobbling ? 0.85 : isRandomBump ? 0.55 : 2.4,
                        ease: 'easeInOut'
                      }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-0.5 h-3 bg-stone-400" />
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 bg-amber-100/40" />
                    </motion.div>
                    <motion.div
                      animate={{
                        rotate: isWobbling
                          ? [-18, 18, -12, 8, 0]
                          : isRandomBump
                          ? (bumpDirection === 'left' ? [-12, 8, -5] : [12, -8, 5])
                          : [-2, 2, -2]
                      }}
                      transition={{
                        repeat: isRandomBump || isWobbling ? 0 : Infinity,
                        duration: isWobbling ? 0.85 : isRandomBump ? 0.55 : 2.3,
                        ease: 'easeInOut'
                      }}
                      className="hidden sm:flex flex-col items-center"
                    >
                      <div className="w-0.5 h-3 bg-stone-400" />
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 bg-amber-100/40" />
                    </motion.div>
                  </div>

                  {/* Windows with speed lines and rail vibration */}
                  <div className="w-full hidden md:flex justify-around opacity-45 mt-0.5">
                    <div className="w-20 lg:w-24 h-6 lg:h-8 bg-[#D3E8F4] rounded-lg border border-sky-300 overflow-hidden relative animate-rail-vibration">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                    </div>
                    <div className="w-20 lg:w-24 h-6 lg:h-8 bg-[#D3E8F4] rounded-lg border border-sky-300 overflow-hidden relative animate-rail-vibration">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                    </div>
                    <div className="w-20 lg:w-24 h-6 lg:h-8 bg-[#D3E8F4] rounded-lg border border-sky-300 overflow-hidden relative animate-rail-vibration">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                    </div>
                  </div>
                </div>

                {/* Passenger Speech Bubble */}
                {passengerBubble && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-1 sm:top-2 left-1/2 -translate-x-1/2 bg-[#FFFCF4]/95 text-[#4A3337] border-2 border-[#FFBCBD] rounded-xl sm:rounded-2xl px-2.5 py-1 sm:px-4 sm:py-2 text-[9px] sm:text-xs font-bold shadow-lg z-30 max-w-xs sm:max-w-sm text-center"
                  >
                    {passengerBubble}
                  </motion.div>
                )}

                {/* Floor Area: Multiple Diverse Passengers Across Carriage Seats + Center Mom */}
                <div className="relative z-10 w-full flex items-end justify-between px-1 sm:px-4 lg:px-6 pt-0.5 sm:pt-1 gap-1">
                  {/* Left Side: Priority Seat 1 (Gamer Student / Yielding Student) */}
                  {isSeated ? (
                    <div
                      onClick={() => setPassengerBubble('🧍 讓座同學：「媽咪您辛苦了，請坐這裡！剛才太專注玩手遊沒看到，不好意思！」')}
                      className="flex flex-col items-center cursor-pointer animate-in fade-in group shrink-0"
                      title="點擊聽同學說話"
                    >
                      <div className="text-[7px] sm:text-[9px] font-black text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded-full mb-0.5 border border-emerald-300 animate-bounce whitespace-nowrap shadow-xs">
                        💖 讓座！
                      </div>
                      <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center text-lg sm:text-2xl shadow-xs group-hover:scale-105 transition-transform">
                        🧍
                      </div>
                      <div className="text-[7px] sm:text-[8px] font-bold text-emerald-700">「請坐！」</div>
                    </div>
                  ) : (
                    <div
                      onClick={() => handlePassengerClick('game')}
                      className="flex flex-col items-center cursor-pointer group shrink-0"
                      title="點擊聽手遊同學說話，可借產科筆記！"
                    >
                      <div className="text-[7px] sm:text-[9px] font-bold text-[#6B4B52] bg-[#FFFCF4]/90 px-1 py-0.2 rounded-full mb-0.5 border border-[#FFBCBD] group-hover:bg-[#FFE0E6] whitespace-nowrap">
                        {correctCount >= 2 ? '👀 抬頭' : '🎮 手遊'}
                      </div>
                      <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-[#FFE0E6] border-2 border-[#FFBCBD] flex items-center justify-center text-lg sm:text-2xl shadow-xs group-hover:scale-105 transition-transform">
                        {mistakeCount >= 2 ? '😱' : correctCount >= 2 ? '👀' : '🎧'}
                      </div>
                      <div className="h-2 w-8 sm:w-11 bg-blue-700 rounded-t-sm mt-0.5" title="博愛座" />
                    </div>
                  )}

                  {/* Left Side: Priority Seat 2 (Grandma with Groceries Basket - Interactive Treasure!) */}
                  <div
                    onClick={() => handlePassengerClick('grandma')}
                    className="flex flex-col items-center cursor-pointer group shrink-0"
                    title="點擊抽阿嬤的百寶菜籃補給品！"
                  >
                    <div className="text-[7px] sm:text-[9px] font-bold text-[#6B4B52] bg-[#FFFCF4]/90 px-1 py-0.2 rounded-full mb-0.5 border border-[#FFBCBD] group-hover:bg-[#FFE0E6] whitespace-nowrap animate-pulse">
                      🎁 阿嬤菜籃
                    </div>
                    <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-[#FFE0E6] border-2 border-[#FFBCBD] flex items-center justify-center text-lg sm:text-2xl shadow-xs group-hover:scale-110 transition-transform">
                      👵
                    </div>
                    <div className="h-2 w-8 sm:w-11 bg-blue-700 rounded-t-sm mt-0.5" title="博愛座" />
                  </div>

                  {/* Left Side: Schoolgirl with balloon */}
                  <div
                    onClick={() => handlePassengerClick('kid')}
                    className="hidden sm:flex flex-col items-center cursor-pointer group shrink-0"
                    title="點擊聽小妹妹說話"
                  >
                    <div className="text-[7px] sm:text-[8px] font-bold text-[#6B4B52] bg-[#FFFCF4]/90 px-1 py-0.2 rounded-full mb-0.5 border border-[#FFBCBD] whitespace-nowrap">
                      🎈 氣球
                    </div>
                    <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-pink-50 border border-[#FFBCBD] flex items-center justify-center text-base sm:text-xl shadow-xs group-hover:scale-105 transition-transform">
                      👧
                    </div>
                    <div className="text-[7px] font-bold text-[#7A5860]">妹妹</div>
                  </div>

                  {/* Center: Dynamic Animated Illustrated Pregnant Mom Character */}
                  <div
                    onClick={() => handlePassengerClick('mom')}
                    className="relative z-20 flex justify-center pb-0 sm:pb-0.5 cursor-pointer"
                    title="點擊摸摸孕婦肚肚感應胎動！"
                  >
                    <PregnantMomIllustration
                      mood={characterMood}
                      name={currentMomName}
                      badgeStyle={profile.badgeStyle}
                      tiltAngle={tiltAngle}
                      stance={currentStance}
                      compact={!mobileExpandedCarriage}
                      hasShield={hasShield}
                    />
                  </div>

                  {/* Right Side: Regular Seat 1 (Sleepy Salaryman) */}
                  <div
                    onClick={() => handlePassengerClick('sleep')}
                    className="flex flex-col items-center cursor-pointer group shrink-0"
                    title="點擊跟上班族對話，可獲得生津話梅！"
                  >
                    <div className="text-[7px] sm:text-[9px] font-bold text-[#6B4B52] bg-[#FFFCF4]/90 px-1 py-0.2 rounded-full mb-0.5 border border-[#FFBCBD] group-hover:bg-[#FFE0E6] whitespace-nowrap">
                      {mistakeCount >= 2 ? '😱 嚇醒' : '😴 裝睡'}
                    </div>
                    <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-[#FFFCF4] border-2 border-[#FFBCBD] flex items-center justify-center text-lg sm:text-2xl shadow-xs group-hover:scale-105 transition-transform">
                      {mistakeCount >= 2 ? '😱' : '😴'}
                    </div>
                    <div className="h-2 w-8 sm:w-11 bg-blue-500 rounded-t-sm mt-0.5" title="一般座" />
                  </div>

                  {/* Right Side: Regular Seat 2 (Drama Watching Girl) */}
                  <div
                    onClick={() => handlePassengerClick('phone')}
                    className="hidden sm:flex flex-col items-center cursor-pointer group shrink-0"
                    title="點擊聽追劇小姐姐說話"
                  >
                    <div className="text-[7px] sm:text-[9px] font-bold text-[#6B4B52] bg-[#FFFCF4]/90 px-1 py-0.2 rounded-full mb-0.5 border border-[#FFBCBD] group-hover:bg-[#FFE0E6] whitespace-nowrap">
                      {mistakeCount >= 2 ? '😱 掉了' : '📱 追劇'}
                    </div>
                    <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-[#D3E8F4] border-2 border-[#FFBCBD] flex items-center justify-center text-lg sm:text-2xl shadow-xs group-hover:scale-105 transition-transform">
                      {mistakeCount >= 2 ? '😱' : '📱'}
                    </div>
                    <div className="h-2 w-8 sm:w-11 bg-blue-500 rounded-t-sm mt-0.5" title="一般座" />
                  </div>

                  {/* Right Side: Shiba Inu in pet stroller (Interactive pet!) */}
                  <div
                    onClick={() => handlePassengerClick('dog')}
                    className="flex flex-col items-center cursor-pointer group shrink-0"
                    title="點擊摸摸推車裡的小柴犬，可免費延長時間！"
                  >
                    <div className="text-[7px] sm:text-[8px] font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded-full mb-0.5 border border-amber-300 whitespace-nowrap animate-bounce">
                      🐶 柴柴 +3s
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-center text-lg sm:text-xl shadow-xs group-hover:scale-115 transition-transform">
                      🐕
                    </div>
                    <div className="text-[7px] font-bold text-[#7A5860]">豆豆</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (lg:col-span-5): Question Card & Maternity Backpack Toolbar */}
            <div className="lg:col-span-5 space-y-2.5 sm:space-y-3">
              {/* Maternity Backpack Items Toolbar */}
              <div className="bg-[#FFE0E6]/90 rounded-2xl border-2 border-[#FFBCBD] p-2 sm:p-2.5 shadow-2xs flex items-center justify-between gap-1 sm:gap-2">
                <span className="text-[10px] sm:text-xs font-black text-[#4A3337] flex items-center gap-1 shrink-0">
                  <span>🎒 好孕錦囊：</span>
                </span>

                <div className="flex items-center gap-1 sm:gap-1.5 flex-1 justify-end">
                  {/* Item 1: Cracker (50/50) */}
                  <button
                    type="button"
                    disabled={items.cracker <= 0 || showExplanation || timeLeft <= 0}
                    onClick={() => handleUseItem('cracker')}
                    className={`px-2 py-1 rounded-xl border text-[10px] sm:text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                      items.cracker > 0 && !showExplanation
                        ? 'bg-amber-100 border-amber-300 text-amber-900 hover:scale-105 active:scale-95 shadow-2xs'
                        : 'bg-stone-100 border-stone-200 text-stone-400 opacity-60 cursor-not-allowed'
                    }`}
                    title="消除 2 個錯誤干擾選項！"
                  >
                    <span>🍪</span>
                    <span>50/50</span>
                    <span className="bg-amber-200 px-1 rounded-full text-[9px]">{items.cracker}</span>
                  </button>

                  {/* Item 2: Plum (+10s) */}
                  <button
                    type="button"
                    disabled={items.plum <= 0 || showExplanation || timeLeft <= 0}
                    onClick={() => handleUseItem('plum')}
                    className={`px-2 py-1 rounded-xl border text-[10px] sm:text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                      items.plum > 0 && !showExplanation
                        ? 'bg-rose-100 border-rose-300 text-rose-900 hover:scale-105 active:scale-95 shadow-2xs'
                        : 'bg-stone-100 border-stone-200 text-stone-400 opacity-60 cursor-not-allowed'
                    }`}
                    title="倒數時間立即 +10 秒！"
                  >
                    <span>🍋</span>
                    <span>+10s</span>
                    <span className="bg-rose-200 px-1 rounded-full text-[9px]">{items.plum}</span>
                  </button>

                  {/* Item 3: Shield (Immunity) */}
                  <button
                    type="button"
                    disabled={items.shield <= 0 || hasShield}
                    onClick={() => handleUseItem('shield')}
                    className={`px-2 py-1 rounded-xl border text-[10px] sm:text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                      items.shield > 0 && !hasShield
                        ? 'bg-blue-100 border-blue-300 text-blue-900 hover:scale-105 active:scale-95 shadow-2xs'
                        : hasShield
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                        : 'bg-stone-100 border-stone-200 text-stone-400 opacity-60 cursor-not-allowed'
                    }`}
                    title="抵消一次急煞失衡！"
                  >
                    <span>🛡️</span>
                    <span>{hasShield ? '已防護' : '護盾'}</span>
                    <span className="bg-blue-200 px-1 rounded-full text-[9px]">{items.shield}</span>
                  </button>

                  {/* Item 4: Socks (Restore balance) */}
                  <button
                    type="button"
                    disabled={items.socks <= 0 || balance >= 100}
                    onClick={() => handleUseItem('socks')}
                    className={`px-2 py-1 rounded-xl border text-[10px] sm:text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                      items.socks > 0 && balance < 100
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-900 hover:scale-105 active:scale-95 shadow-2xs'
                        : 'bg-stone-100 border-stone-200 text-stone-400 opacity-60 cursor-not-allowed'
                    }`}
                    title="平衡值瞬間回滿 100%！"
                  >
                    <span>🧦</span>
                    <span>回血</span>
                    <span className="bg-emerald-200 px-1 rounded-full text-[9px]">{items.socks}</span>
                  </button>
                </div>
              </div>

              {/* Main Question Card */}
              <div className="bg-[#FFFCF4] rounded-2xl sm:rounded-3xl border-2 border-[#FFBCBD] p-3 sm:p-5 lg:p-6 shadow-sm space-y-2.5 sm:space-y-4">
                {/* Timer & Question Header */}
                <div className="space-y-1.5 pb-2 border-b border-[#FFBCBD]/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="bg-[#4A3337] text-white text-[10px] sm:text-xs font-mono font-black px-2 py-0.5 rounded-full shadow-xs">
                        Q{currentQIndex + 1}/{SUBWAY_QUESTIONS.length}
                      </span>
                      {currentQ.tier === 'expert' ? (
                        <span className="bg-red-600 text-white text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full shadow-xs animate-pulse">
                          🔥 魔王級 · 難度升級！
                        </span>
                      ) : currentQ.tier === 'intermediate' ? (
                        <span className="bg-amber-600 text-white text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full shadow-xs">
                          🟡 進階護理關
                        </span>
                      ) : (
                        <span className="bg-emerald-600 text-white text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full shadow-xs">
                          🟢 基礎通勤關
                        </span>
                      )}
                      {currentQ.levelLabel && (
                        <span className="text-[10px] sm:text-xs font-bold text-[#E85D75] bg-[#FFE0E6] px-2 py-0.5 rounded-full border border-[#FFBCBD] hidden sm:inline">
                          {currentQ.levelLabel}
                        </span>
                      )}
                      <span className="hidden xl:inline text-[10px] text-[#7A5860] bg-[#FFE0E6] px-1.5 py-0.5 rounded border border-[#FFBCBD] font-mono">
                        鍵盤 1~4 / A~D
                      </span>
                    </div>

                    {/* Countdown Time Display */}
                    <div className="flex items-center gap-1 font-mono font-black text-xs sm:text-sm">
                      <Clock className={`w-3.5 h-3.5 ${timeLeft <= 4 ? 'text-red-600 animate-spin' : 'text-[#E85D75]'}`} />
                      <span className={timeLeft <= 4 ? 'text-red-600 animate-pulse text-sm sm:text-base' : 'text-[#4A3337]'}>
                        {timeLeft < 10 ? `0${timeLeft}` : timeLeft} 秒
                      </span>
                    </div>
                  </div>

                  {/* Animated Countdown Progress Bar */}
                  <div className="h-2 w-full bg-[#FFE0E6] rounded-full overflow-hidden border border-[#FFBCBD]">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        timeLeft > 7 ? 'bg-emerald-500' : timeLeft > 3 ? 'bg-amber-500' : 'bg-[#E85D75]'
                      }`}
                      style={{ width: `${(timeLeft / QUESTION_TIME_LIMIT) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Question Text */}
                <h3 className="text-xs sm:text-base lg:text-lg font-black text-[#4A3337] leading-snug">
                  {currentQ.question}
                </h3>

                {/* Options: Full width vertical stack, NO line-clamp, NO text truncation! */}
                <div className="flex flex-col gap-2 sm:gap-2.5">
                  {currentQ.options.map((opt, idx) => {
                    const optionLetter = ['A', 'B', 'C', 'D'][idx];
                    const isEliminated = eliminatedIndices.includes(idx);
                    let btnStyle = 'bg-[#FFE0E6]/35 border-[#FFBCBD] hover:bg-[#FFE0E6] text-[#4A3337] shadow-2xs hover:shadow-xs';

                    if (isEliminated) {
                      btnStyle = 'bg-stone-100/60 border-stone-200 text-stone-400 line-through opacity-40 cursor-not-allowed';
                    } else if (showExplanation) {
                      if (idx === currentQ.correctIndex) {
                        btnStyle = 'bg-emerald-100 border-emerald-500 text-emerald-950 font-black shadow-sm ring-2 ring-emerald-300';
                      } else if (idx === selectedOption) {
                        btnStyle = 'bg-rose-100 border-rose-400 text-rose-950 line-through';
                      } else {
                        btnStyle = 'bg-[#FFFCF4] border-[#FFBCBD]/40 opacity-40';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        disabled={showExplanation || timeLeft <= 0 || isEliminated}
                        onClick={() => handleSelectAnswer(idx)}
                        className={`w-full p-2.5 sm:p-3 lg:p-3.5 rounded-xl sm:rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-2 sm:gap-3 ${btnStyle}`}
                      >
                        <div className="flex items-start gap-2.5 sm:gap-3 w-full">
                          <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#FFFCF4] border border-[#FFBCBD] text-xs sm:text-sm font-black text-[#E85D75] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                            {optionLetter}
                          </span>
                          <span className="text-xs sm:text-sm lg:text-base font-bold text-[#4A3337] leading-relaxed break-words whitespace-normal flex-1">
                            {opt}
                            {isEliminated && <span className="ml-2 text-[10px] text-stone-400 no-underline font-normal">（已排除 ❌）</span>}
                          </span>
                        </div>
                        {showExplanation && idx === currentQ.correctIndex && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 ml-1.5" />
                        )}
                        {showExplanation && selectedOption === idx && idx !== currentQ.correctIndex && (
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0 ml-1.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation & Next Button */}
                {showExplanation && (
                  <div className="p-3 sm:p-4 bg-[#FFE0E6]/50 rounded-xl sm:rounded-2xl border border-[#FFBCBD] space-y-2 sm:space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 text-xs font-black">
                      {isAnswerCorrect ? (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          {isSeated ? '太棒了！已獲讓座，安心就座！' : correctCount >= 1 ? '答對啦！媽咪雙手握好黃色立柱！' : `答對啦！${currentMomName}抓穩平衡！`}
                        </span>
                      ) : isTimeout ? (
                        <span className="text-red-600 flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" /> ⏰ 時間到！來不及應變，重心歪斜！
                        </span>
                      ) : (
                        <span className="text-rose-700 flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" /> 答錯啦！失去重心！
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] sm:text-xs text-[#5C3E43] font-medium leading-relaxed">
                      {currentQ.explanation}
                    </p>

                    {correctCount < targetWinCount && mistakeCount < MAX_MISTAKES && currentQIndex < SUBWAY_QUESTIONS.length - 1 && (
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={handleNextQuestion}
                          className="w-full sm:w-auto px-4 py-2 sm:px-5 sm:py-2.5 bg-[#E85D75] hover:bg-[#D44763] text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-transform active:scale-95 flex items-center justify-center gap-1"
                        >
                          <span>下一站繼續站穩！▶</span>
                          <span className="hidden sm:inline text-[10px] opacity-80">(按空白鍵)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MINI-GAME 1: BALANCE QTE MODAL (列車大過彎緊急平衡)
         ========================================================================= */}
      {activeMiniGame === 'balance_qte' && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[#FFFCF4] border-3 border-[#FFBCBD] rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="text-4xl animate-bounce">⚡🚇💪</div>
            <div className="space-y-1">
              <span className="bg-red-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
                ⚠️ 捷運到站急速過彎！
              </span>
              <h3 className="text-lg sm:text-xl font-black text-[#4A3337]">
                點擊立柱保持平衡！
              </h3>
              <p className="text-xs text-[#6B4B52]">
                離心力急晃！在 <strong>{qteTimeLeft} 秒</strong> 內快速點擊按鈕累積平衡值，成功即可獲得好孕護盾！
              </p>
            </div>

            {/* QTE Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold font-mono">
                <span>穩固進度</span>
                <span className="text-[#E85D75] font-black">{qteProgress}%</span>
              </div>
              <div className="h-5 w-full bg-[#FFE0E6] rounded-full overflow-hidden border border-[#FFBCBD] p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-[#E85D75] rounded-full transition-all duration-100"
                  style={{ width: `${Math.min(100, qteProgress)}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleQteTap}
              className="w-full py-4 bg-[#E85D75] hover:bg-[#D44763] active:scale-90 text-white rounded-2xl text-base font-black shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5 animate-pulse" />
              <span>點我抓穩立柱！（或按空白鍵）</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MINI-GAME 2: GRANDMA'S TREASURE BASKET MODAL (阿嬤的百寶菜籃摸彩)
         ========================================================================= */}
      {activeMiniGame === 'grandma_basket' && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[#FFFCF4] border-3 border-[#FFBCBD] rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="text-4xl animate-bounce">👵🧺💖</div>
            <div className="space-y-1">
              <span className="bg-[#E85D75] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
                陳阿嬤的愛心百寶菜籃
              </span>
              <h3 className="text-lg sm:text-xl font-black text-[#4A3337]">
                妹子辛苦了，挑一樣好料帶走！
              </h3>
              <p className="text-xs text-[#6B4B52]">
                阿嬤剛從菜市場滿載而歸，點擊任一福袋抽取產科實用補給品！
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handlePickGrandmaGift('cracker')}
                className="p-3 bg-[#FFE0E6] hover:bg-[#FFBCBD] rounded-2xl border-2 border-[#FFBCBD] text-center transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-xs group"
              >
                <div className="text-3xl mb-1 group-hover:scale-120 transition-transform">🍪</div>
                <div className="text-xs font-black text-[#4A3337]">福袋 1</div>
                <div className="text-[9px] text-[#E85D75] font-bold">消除干擾題</div>
              </button>

              <button
                type="button"
                onClick={() => handlePickGrandmaGift('plum')}
                className="p-3 bg-[#FFE0E6] hover:bg-[#FFBCBD] rounded-2xl border-2 border-[#FFBCBD] text-center transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-xs group"
              >
                <div className="text-3xl mb-1 group-hover:scale-120 transition-transform">🍋</div>
                <div className="text-xs font-black text-[#4A3337]">福袋 2</div>
                <div className="text-[9px] text-[#E85D75] font-bold">延長倒數時間</div>
              </button>

              <button
                type="button"
                onClick={() => handlePickGrandmaGift('socks')}
                className="p-3 bg-[#FFE0E6] hover:bg-[#FFBCBD] rounded-2xl border-2 border-[#FFBCBD] text-center transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-xs group"
              >
                <div className="text-3xl mb-1 group-hover:scale-120 transition-transform">🧦</div>
                <div className="text-xs font-black text-[#4A3337]">福袋 3</div>
                <div className="text-[9px] text-[#E85D75] font-bold">平衡值加滿</div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setActiveMiniGame(null)}
              className="text-xs text-[#7A5860] hover:text-[#4A3337] underline pt-2 cursor-pointer font-bold"
            >
              稍後再抽，返回答題
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MINI-GAME 3: SEAT DILEMMA MODAL (讓座抉擇 · 隨機突發事件與結局回饋)
         ========================================================================= */}
      {activeMiniGame === 'seat_dilemma' && (
        <div className="fixed inset-0 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[#FFFCF4] border-3 border-[#FFBCBD] rounded-3xl p-4 sm:p-7 max-w-lg w-full text-center space-y-4 shadow-2xl overflow-y-auto max-h-[92vh]">
            {dilemmaOutcome === null ? (
              /* Phase A: Dilemma Choice Decision with 8s Countdown */
              <div className="space-y-4">
                {/* Header with Urgency Timer */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="bg-[#E85D75] text-white text-[10px] sm:text-xs font-black px-3 py-1 rounded-full shadow-xs animate-pulse flex items-center gap-1">
                      <span>🚨 突發車廂事件</span>
                      <span>·</span>
                      <span>讓座抉擇大考驗！</span>
                    </span>

                    <div className="flex items-center gap-1.5 font-mono font-black text-xs sm:text-sm text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>剩餘 {dilemmaTimeLeft} 秒</span>
                    </div>
                  </div>

                  {/* Progress countdown bar */}
                  <div className="h-2 w-full bg-[#FFE0E6] rounded-full overflow-hidden border border-[#FFBCBD]">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-[#E85D75] transition-all duration-1000"
                      style={{ width: `${(dilemmaTimeLeft / 8) * 100}%` }}
                    />
                  </div>

                  <h3 className="text-lg sm:text-2xl font-black text-[#4A3337] font-serif-tc pt-1">
                    車廂突然出現空位！你會怎麼做？
                  </h3>
                </div>

                {/* Scenario Illustration Scene */}
                <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-sky-50 rounded-2xl border-2 border-[#FFBCBD]/60 p-3 flex items-center justify-around gap-2 text-center shadow-2xs">
                  {/* Left: Pregnant Mom */}
                  <div className="flex flex-col items-center">
                    <div className="text-3xl sm:text-4xl animate-bounce">🤰</div>
                    <span className="text-[10px] sm:text-xs font-black text-[#4A3337] mt-0.5">{currentMomName}</span>
                    <span className="text-[8px] sm:text-[9px] text-[#7A5860] bg-white/80 px-1 rounded border border-[#FFBCBD]/50">負重6.5kg雙腿酸脹</span>
                  </div>

                  {/* Center: The Golden Empty Seat */}
                  <div className="flex flex-col items-center px-1">
                    <div className="relative">
                      <div className="text-3xl sm:text-4xl animate-pulse">💺</div>
                      <span className="absolute -top-1 -right-2 text-xs">✨</span>
                    </div>
                    <span className="text-[10px] sm:text-xs font-black text-amber-700 font-mono mt-0.5">空出熱騰騰座位</span>
                    <span className="text-[8px] sm:text-[9px] text-amber-800 bg-amber-100 px-1 rounded font-bold">列車即將起步</span>
                  </div>

                  {/* Right: Elderly Grandfather */}
                  <div className="flex flex-col items-center">
                    <div className="text-3xl sm:text-4xl">👴</div>
                    <span className="text-[10px] sm:text-xs font-black text-[#4A3337] mt-0.5">張老爺爺</span>
                    <span className="text-[8px] sm:text-[9px] text-[#7A5860] bg-white/80 px-1 rounded border border-[#FFBCBD]/50">拄拐杖步履蹣跚</span>
                  </div>
                </div>

                {/* Situation Description */}
                <p className="text-xs sm:text-[13px] text-[#5C3E43] leading-relaxed text-left bg-[#FFFCF4] p-3 rounded-xl border border-[#FFBCBD]/40 font-medium">
                  剛靠站有一位乘客下車，車廂中間空出了一個珍貴的博愛座！與此同時，步履蹣跚的張老爺爺拄著柺杖走進車廂。你的雙腿承受 6.5kg 負重已嚴重水腫酸痛，但也看出老爺爺站不穩，<strong>列車即將關門加速，時間緊迫！</strong>
                </p>

                {/* 3 Interactive Choices */}
                <div className="space-y-2 text-left">
                  {/* Choice 1: Take the seat for oneself */}
                  <button
                    type="button"
                    onClick={() => handleSeatDilemmaChoice('self')}
                    className="w-full p-3 bg-gradient-to-r from-rose-100 to-rose-50 hover:from-rose-200 hover:to-rose-100 border-2 border-rose-300 rounded-2xl transition-all hover:scale-[1.01] active:scale-98 shadow-xs cursor-pointer group"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-rose-500 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        1
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-rose-900">
                          <span>💺 毫不猶豫坐下 ·【自愛與守護寶寶】</span>
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-[#6B4B52] mt-0.5 leading-snug">
                          肚子沉重、雙腿快抽筋了！孕婦本就是博愛座優先對象，坐下保護好胎兒是理所當然的成熟照護。
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Choice 2: Yield to the elderly gentleman */}
                  <button
                    type="button"
                    onClick={() => handleSeatDilemmaChoice('elder')}
                    className="w-full p-3 bg-gradient-to-r from-emerald-100 to-emerald-50 hover:from-emerald-200 hover:to-emerald-100 border-2 border-emerald-300 rounded-2xl transition-all hover:scale-[1.01] active:scale-98 shadow-xs cursor-pointer group"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        2
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-emerald-900">
                          <span>🤝 溫柔禮讓給張老爺爺 ·【大愛無私 · 善念循環】</span>
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-[#6B4B52] mt-0.5 leading-snug">
                          老爺爺年事已高、腿腳顫抖，列車起步極易摔傷。自己還能扶緊立柱撐著，選擇體貼讓給長輩！
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Choice 3: Collaborative win-win */}
                  <button
                    type="button"
                    onClick={() => handleSeatDilemmaChoice('collaborate')}
                    className="w-full p-3 bg-gradient-to-r from-amber-100 to-sky-50 hover:from-amber-200 hover:to-sky-100 border-2 border-amber-300 rounded-2xl transition-all hover:scale-[1.01] active:scale-98 shadow-xs cursor-pointer group"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-amber-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        3
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-amber-950">
                          <span>💡 智慧協調雙贏 ·【溫暖車廂外交官】</span>
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-[#6B4B52] mt-0.5 leading-snug">
                          扶老爺爺入座的同時，溫和親切地請旁邊低頭玩手遊的同學幫忙：「同學，可以借個座位給孕婦嗎？」
                        </div>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="text-[10px] text-[#7A5860] font-mono">
                  💡 提示：鍵盤可按 1 / 2 / 3 快速選擇！
                </div>
              </div>
            ) : (
              /* Phase B: Narrative Outcome & Ending Feedback (結局回饋) */
              <div className="space-y-4 animate-in zoom-in-95 duration-200">
                <div className="text-4xl sm:text-5xl animate-bounce">
                  {dilemmaOutcome.icon}
                </div>

                <div className="space-y-1.5">
                  <span className="inline-block bg-[#E85D75] text-white text-[10px] sm:text-xs font-black px-3.5 py-1 rounded-full shadow-xs">
                    {dilemmaOutcome.badge}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-[#4A3337] font-serif-tc">
                    {dilemmaOutcome.title}
                  </h3>
                </div>

                {/* Narrative Story Box */}
                <div className="bg-[#FFE0E6]/30 border-2 border-[#FFBCBD] rounded-2xl p-3.5 sm:p-4 text-left space-y-2 shadow-xs">
                  <div className="text-xs sm:text-sm text-[#4A3337] leading-relaxed font-medium">
                    {dilemmaOutcome.story}
                  </div>
                </div>

                {/* Educational Insight / Moral Box */}
                <div className="bg-amber-50/80 border border-amber-300 rounded-xl p-3 text-left space-y-1">
                  <div className="text-[11px] font-black text-amber-900 flex items-center gap-1">
                    <span>💡 生命教育與友善讓座倡議：</span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-amber-800 leading-relaxed font-medium">
                    {dilemmaOutcome.moral}
                  </p>
                </div>

                {/* Rewards Box */}
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 text-xs font-bold text-emerald-900 text-center shadow-2xs">
                  {dilemmaOutcome.rewardText}
                </div>

                {/* Return Button */}
                <button
                  type="button"
                  onClick={handleCloseSeatDilemma}
                  className="w-full py-3.5 bg-[#E85D75] hover:bg-[#D44763] active:scale-98 text-white rounded-2xl text-sm sm:text-base font-black shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <Heart className="w-5 h-5 fill-white" />
                  <span>💖 帶著感動繼續通勤（完成抉擇）</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          WIN SCREEN WITH COMPREHENSIVE COMMUTE REPORT CARD
         ========================================================================= */}
      {phase === 'won' && (
        <div className="bg-gradient-to-b from-[#D3E8F4]/80 via-[#FFE0E6] to-[#FFFCF4] rounded-3xl border-3 border-[#FFBCBD] p-6 sm:p-10 shadow-xl text-center space-y-5 max-w-3xl mx-auto animate-in zoom-in-95 duration-200">
          <div className="flex justify-center">
            <PregnantMomIllustration
              mood="seated"
              name={currentMomName}
              badgeStyle={profile.badgeStyle}
              tiltAngle={0}
              stance="seated"
            />
          </div>

          <div className="space-y-2">
            <span className="inline-block bg-[#E85D75] text-white text-xs font-black px-4 py-1.5 rounded-full shadow-xs">
              COMMUTE MASTER · 溫馨讓座大成功！
            </span>
            <h2 className="text-xl sm:text-3xl font-black text-[#4A3337] font-serif-tc">
              🎉 抵達目的地！乘客感動讓座，{currentMomName}安心入座！
            </h2>
            <p className="text-xs sm:text-sm text-[#6B4B52] max-w-lg mx-auto leading-relaxed font-medium">
              經歷了忠義站、關渡站、竹圍站、紅樹林站到淡水終點站，{currentMomName}在答對 2 題後雙手抓穩立柱，累積 4 題同學深受感動主動讓座，順利攻破所有產科關卡！
            </p>
          </div>

          {/* Commute Report Card */}
          <div className="bg-[#FFFCF4] rounded-2xl border-2 border-[#FFBCBD] p-4 sm:p-5 text-left max-w-lg mx-auto space-y-3 shadow-xs">
            <div className="text-xs font-black text-[#4A3337] border-b border-[#FFBCBD]/40 pb-2 flex items-center justify-between">
              <span>📋 捷運通勤護理成就報告單</span>
              <span className="text-[#E85D75] font-mono">滿分守護！</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 bg-[#FFE0E6]/40 rounded-xl">
                <span className="text-[10px] text-[#7A5860] block font-bold">答對題數</span>
                <span className="text-sm font-black text-[#E85D75] font-mono">{correctCount} 題</span>
              </div>
              <div className="p-2 bg-[#FFE0E6]/40 rounded-xl">
                <span className="text-[10px] text-[#7A5860] block font-bold">最高連勝</span>
                <span className="text-sm font-black text-amber-600 font-mono">{maxStreak} 題</span>
              </div>
              <div className="p-2 bg-[#FFE0E6]/40 rounded-xl">
                <span className="text-[10px] text-[#7A5860] block font-bold">巡禮車站</span>
                <span className="text-sm font-black text-emerald-700 font-mono">5 座大站</span>
              </div>
            </div>
            <div className="text-[11px] text-[#5C3E43] font-medium leading-relaxed bg-[#FFE0E6]/30 p-2.5 rounded-xl border border-[#FFBCBD]/50">
              🏅 <strong>榮獲稱號：【產科全能守護大使 · 金牌讓座得主】</strong>
              <br />
              「先學會保護自己抓牢扶手，再透過體貼互動喚醒車廂溫暖。」生命教育與友善讓座倡議大圓滿！
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleStartGame}
              className="px-5 py-3 bg-[#FFE0E6] hover:bg-[#FFBCBD] text-[#4A3337] rounded-2xl text-xs font-black transition-colors cursor-pointer border border-[#FFBCBD]"
            >
              🔄 再搭一班車挑戰
            </button>
            <button
              onClick={onSwitchToVideo}
              className="px-5 py-3 bg-[#E85D75] hover:bg-[#D44763] text-white rounded-2xl text-xs font-black shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Film className="w-4 h-4" />
              <span>🎬 觀看小組實測影片</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          LOST SCREEN
         ========================================================================= */}
      {phase === 'lost' && (
        <div className="bg-gradient-to-b from-[#FFE0E6] via-[#FFFCF4] to-[#FFE0E6] rounded-3xl border-3 border-[#FFBCBD] p-6 sm:p-12 shadow-2xl text-center space-y-5 max-w-3xl mx-auto animate-in zoom-in-95 duration-200">
          <div className="text-5xl sm:text-6xl animate-bounce">
            🚀💨😵
          </div>

          <div className="space-y-2">
            <span className="inline-block bg-[#E85D75] text-white text-xs font-black px-4 py-1.5 rounded-full shadow-md animate-pulse">
              🚨 列車急煞警告！累積失衡 4 次！
            </span>
            <h2 className="text-xl sm:text-3xl font-black text-[#E85D75] font-serif-tc">
              天哪！連續失衡急煞，{currentMomName}飛出車廂啦！
            </h2>
            <p className="text-xs sm:text-sm text-[#6B4B52] max-w-lg mx-auto leading-relaxed font-medium">
              全車乘客全嚇傻了！因為連續答錯未能抓穩扶手，列車一個大急煞，6.5kg 的孕肚負重直接失去平衡，媽咪『咻——』地一聲飛出車廂！
            </p>
          </div>

          <div className="p-3 sm:p-4 bg-[#FFFCF4] rounded-2xl border-2 border-[#FFBCBD] text-xs text-[#4A3337] font-bold max-w-lg mx-auto">
            💡 闖關攻略：平時可點擊阿嬤菜籃摸彩、借高中生筆記、善用錦囊道具；答對 2 題媽咪就會抓穩立柱，答對 4 題同學感動讓座！
          </div>

          <div className="pt-2">
            <button
              onClick={handleStartGame}
              className="px-6 py-3.5 bg-[#E85D75] hover:bg-[#D44763] active:scale-95 text-white rounded-2xl font-black text-sm shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 mx-auto"
            >
              <RotateCcw className="w-5 h-5" />
              <span>重新進入車廂 · 幫媽咪抓好扶手！</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { SUBWAY_QUESTIONS } from '../../data/subwayQuestions';
import { PlayerProfile, GamePhase, SeatDilemmaOutcome, HelpfulNpcEvent, HelpfulNpcOption } from '../../types/subwayGame';
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

// Metro Red Line Stations on the Tour (10 questions, 2 questions per station)
const STATIONS = [
  { id: 'R24', name: '忠義站', subtitle: '孕早期適應與通勤守護', range: [0, 1] },
  { id: 'R25', name: '關渡站', subtitle: '孕中期生理調適與骨盆照護', range: [2, 3] },
  { id: 'R26', name: '竹圍站', subtitle: '血液生理與胎動營養', range: [4, 5] },
  { id: 'R27', name: '紅樹林站', subtitle: '待產鑑別與產兆破水', range: [6, 7] },
  { id: 'R28', name: '淡水終點站', subtitle: '分娩拉梅茲呼吸魔王總決戰', range: [8, 9] }
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

  // Active Protection & Option Eliminator
  const [hasShield, setHasShield] = useState(false);
  const [eliminatedIndices, setEliminatedIndices] = useState<number[]>([]);

  // Interactive Helpful NPC Event Modal
  const [activeNpcEvent, setActiveNpcEvent] = useState<HelpfulNpcEvent | null>(null);

  // Interactive Mini-Games (Seat Dilemma)
  const [activeMiniGame, setActiveMiniGame] = useState<'seat_dilemma' | null>(null);

  // Seat Dilemma Random Event States
  const [dilemmaTimeLeft, setDilemmaTimeLeft] = useState(8);
  const [dilemmaOutcome, setDilemmaOutcome] = useState<SeatDilemmaOutcome | null>(null);
  const dilemmaTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Broadcast Multi-Lingual Switcher
  const [broadcastLang, setBroadcastLang] = useState<'zh' | 'tw' | 'hakka' | 'en'>('zh');

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

  // Total questions across all stations on the Red Line route
  const TOTAL_QUESTIONS = SUBWAY_QUESTIONS.length;

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
        if (mistakeCount < MAX_MISTAKES && currentQIndex < SUBWAY_QUESTIONS.length - 1) {
          handleNextQuestion();
        } else if (mistakeCount < MAX_MISTAKES && currentQIndex >= SUBWAY_QUESTIONS.length - 1) {
          handleTriggerWin();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, showExplanation, selectedOption, timeLeft, correctCount, mistakeCount, currentQIndex, activeMiniGame, dilemmaOutcome]);

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
    if (phase !== 'playing' || showExplanation || activeMiniGame !== null || activeNpcEvent !== null) {
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
  }, [phase, currentQIndex, showExplanation, activeMiniGame, activeNpcEvent]);

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
    setActiveNpcEvent(null);
    setIsSeated(false);
    setHasShield(false);
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

      // Grand Triumphant Seat Offering: ONLY triggers late in the journey (after enduring 7+ correct answers out of 10)
      if (!isSeated && nextCorrect >= 7 && !triggeredIncidents.includes('grand_seat_offering')) {
        setTriggeredIncidents((prev) => [...prev, 'grand_seat_offering']);
        setTimeout(() => {
          triggerGrandSeatOffering();
        }, 800);
      } else if (!isSeated) {
        setPassengerBubble('💪 媽咪雙手抓穩黃色立柱！6.5kg 負重站立，身體平衡超穩定！');
        setBroadcastText('💪 媽咪扶好立柱了！堅持到底，答對 7 題即可感動全車迎來終極讓座！');
      }

      // Spontaneous Random Shield Blessing (護盾隨機出現)
      if (!hasShield && Math.random() < 0.2) {
        setHasShield(true);
        setPassengerBubble('🛡️ 暖心隨機祝福！熱心乘客送來【好孕金牌護盾】，為媽咪抵擋一次急煞失衡！✨');
        playKawaiiCoin();
      }

      // Check Win Condition (reaching the end of the Red Line route at 淡水終點站)
      if (currentQIndex >= SUBWAY_QUESTIONS.length - 1) {
        setTimeout(() => {
          handleTriggerWin();
        }, 1800);
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
    } else if (currentQIndex >= SUBWAY_QUESTIONS.length - 1) {
      setTimeout(() => {
        handleTriggerWin();
      }, 2500);
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

    // Station Transition Check (arriving at stations: 2=關渡, 4=竹圍, 6=紅樹林, 8=淡水)
    if (nextQ === 2 || nextQ === 4 || nextQ === 6 || nextQ === 8) {
      playSubwayStationChime();
      playMetroDoorBeep();
      const stationNames: Record<number, string> = {
        2: '關渡站',
        4: '竹圍站',
        6: '紅樹林站',
        8: '淡水終點站',
      };
      const stName = stationNames[nextQ] || '下一站';
      setPassengerBubble(`🚇 叮咚！列車已駛抵【${stName}】，車門即將開啟，請小心月台間隙～`);
      setBroadcastText(`🚇 叮咚！列車抵達【${stName}】，全體乘客上下車請握好扶手！`);
    }

    // Dynamic helpful NPC: 中途僅保留買菜阿嬤及時相助，大幅減少打斷，答題更專注
    if (nextQ === 4 && !triggeredIncidents.includes('grandma_veggies')) {
      setTriggeredIncidents((prev) => [...prev, 'grandma_veggies']);
      triggerHelpfulNpc('grandma_veggies');
    }
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
      setPassengerBubble('💖 隔壁張老爺爺笑著點頭：「妹子肚子那麼大快抓緊立柱！保護寶寶最重要！」');
      setBroadcastText('💖 媽咪獲得自愛護盾！平衡值回滿 100%，抓穩立柱迎接後續考驗！');

      setDilemmaOutcome({
        choice: 'self',
        title: '【母子平安 · 懂得自愛的智慧】',
        story: `${currentMomName}輕撫著 6.5kg 的孕肚扶穩立柱，緊繃沉重的下背獲得舒緩，肚子裡的寶寶也開心地輕踢了一下！旁邊拄著拐杖的張老爺爺見狀和藹笑道：「妹子站穩扶好！懷孕是兩條人命，妳很勇敢！」媽咪精力充沛，準備繼續挑戰！`,
        moral: '懷孕期間生理負擔沉重，懂得照顧自己、抓牢立柱防禦晃動，是保護胎兒的成熟表現！',
        rewardText: '✨ 平衡值回滿 100%！獲得【好孕自愛護盾】，防禦下一次急煞！',
        badge: '💖 好孕自愛守護者',
        icon: '🛡️'
      });
    } else if (choice === 'elder') {
      playSuccessChime();
      confetti({ particleCount: 110, spread: 85, origin: { y: 0.5 } });
      setConsecutiveCorrect((c) => c + 1);
      setBalance(100);
      setHasShield(true);
      setPassengerBubble('😭 老爺爺與全車乘客感動讚揚：「謝謝堅強偉大的準媽咪！」');
      setBroadcastText('🌟 善念大循環！老爺爺安穩就座，全車乘客為媽咪的毅力喝采！');

      setDilemmaOutcome({
        choice: 'elder',
        title: '【善念大循環 · 暖心天使感動全車】',
        story: `${currentMomName}親切招呼：「張爺爺您小心走，這裡有空位您快坐！」老爺爺眼泛熱淚緊握媽咪雙手感激不已。這一幕被車廂裡的乘客看在眼裡，大家紛紛投以佩服眼光，為媽咪騰出更多抓握空間！車廂響起了溫暖感動的掌聲！`,
        moral: '善意是具備強大傳染力的！一次無私體貼的舉動，化解了都市通勤的冷漠，也讓身邊人看見母愛的偉大！',
        rewardText: '🎉 平衡回滿 100%、連勝紀錄 +1、獲得【善念護盾】！',
        badge: '✨ 善念循環天使',
        icon: '🤝'
      });
    } else if (choice === 'collaborate') {
      playSuccessChime();
      confetti({ particleCount: 85, spread: 70, origin: { y: 0.55 } });
      setTimeLeft((t) => t + 8);
      setBalance(100);
      setHasShield(true);
      setPassengerBubble('🥰 同學滿臉通紅誠懇鞠躬：「對不起玩手遊太專注！學姊我幫妳護住扶手！」');
      setBroadcastText('🤝 智慧溝通化解冷漠！老爺爺安穩入座，同學協助媽咪護好立柱！');

      setDilemmaOutcome({
        choice: 'collaborate',
        title: '【溫暖車廂外交官 · 智慧雙贏大團圓】',
        story: `${currentMomName}先扶著老爺爺入座，接著微笑輕拍身旁年輕同學：「同學您好，可以跟您借個座位給老爺爺嗎？」同學抬頭看見好孕胸章與爺爺，立刻滿臉通紅誠懇鞠躬，主動站起來扶持老爺爺，並幫媽咪護好立柱周圍安全空間！`,
        moral: '主動溫和的開口不是索求，而是給予身邊人行善覺察的契機。智慧溝通能創造最溫暖的雙贏！',
        rewardText: '💡 平衡回滿 100%、答題倒數時間額外 +8 秒，獲得【協調守護盾】！',
        badge: '🤝 智慧雙贏協調家',
        icon: '💡'
      });
    } else {
      // Timeout
      playKawaiiPop();
      setBalance(100);
      setPassengerBubble('😊 老爺爺和藹微笑：「妹子我們一起扶好立柱，快到站了！」');
      setBroadcastText('🚇 互相體諒互相打氣，心中有愛便能站得更穩！');

      setDilemmaOutcome({
        choice: 'timeout',
        title: '【通勤片刻的溫柔沉思】',
        story: '在倒數猶豫的片刻中，一位步履匆匆的乘客先坐了下去。老爺爺慢慢走到媽咪身旁，笑著對媽咪點頭：「妹子我們一起扶好，快到站了！」兩位相視一笑，互相提醒注意平衡，雖未坐下但彼此心中皆感到滿滿暖意。',
        moral: '捷運上每一次座位的流動，都是一堂生動的同理心練習。無論有沒有坐到位置，心中有愛便能站得更穩！',
        rewardText: '🌱 體會通勤不易，心靈受到激勵，平衡值回滿 100%！',
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

  // =========================================================================
  // HELPFUL NPCS SYSTEM (車廂突然出現的好心人幫助流程機制)
  // =========================================================================
  const HELPFUL_NPCS: Record<string, HelpfulNpcEvent> = {
    grandma_veggies: {
      id: 'grandma_veggies',
      npcName: '買菜婆婆 陳阿嬤',
      npcRole: '熱情鄰居長輩 · 百寶菜籃',
      avatar: '👵🧺',
      badgeText: '👵 車廂突發溫暖 · 買菜婆婆及時相助',
      quote: '「妹子看妳挺著大肚子、站得滿頭汗，車上這群年輕人都在滑手機沒人讓座！阿嬤剛從市場買大包小包，菜籃裡這幾樣好康，妳趕快挑一個！」',
      options: [
        {
          title: '接過生津甘草話梅',
          description: '生津止渴、舒緩孕吐反胃與疲憊！平衡值立即回滿 100%，消除 1 次失衡紀錄，答題時間延長 +8 秒！',
          icon: '🍋',
          tag: '回血+減負+延時',
          effectType: 'restore_balance'
        },
        {
          title: '阿嬤替妳握住立柱護航',
          description: '「妹子靠著阿嬤，阿嬤幫妳隔開推擠的人潮！」獲得【陳阿嬤愛心護盾】，自動抵擋下一次急煞劇烈晃動！',
          icon: '🛡️',
          tag: '免急煞護盾',
          effectType: 'shield'
        },
        {
          title: '聽阿嬤傳授順產經驗劃重點',
          description: '「阿嬤生過三胎，這題產科觀念問阿嬤就對了！」阿嬤以過來人智慧幫媽咪劃掉 2 個干擾選項！',
          icon: '💡',
          tag: '50/50 排除選項',
          effectType: 'eliminate_options'
        }
      ]
    },
    student_ming: {
      id: 'student_ming',
      npcName: '高中生小明',
      npcRole: '剛考完護理課的熱心學弟',
      avatar: '🎒🧑‍🎓',
      badgeText: '🧑‍🎓 車廂突發支援 · 高中生小明抬頭相助',
      quote: '「學姊！我剛才太專注背護理考科，抬頭才看見妳的好孕胸章，真的很不好意思！這題產科觀念我們健康課昨天剛考過，我來支援妳！」',
      options: [
        {
          title: '翻閱小明的精華考卷筆記',
          description: '「這題考點很典型！」小明直接指出題幹盲點，幫忙劃掉 2 個錯誤干擾選項！',
          icon: '📖',
          tag: '50/50 排除選項',
          effectType: 'eliminate_options'
        },
        {
          title: '借用小明備用的運動彈性護具',
          description: '給予下肢有力支撐，減輕水腫與久站負擔！平衡值瞬間加滿 100%，下題答題時間延長 +8 秒！',
          icon: '🧦',
          tag: '回滿平衡+延時',
          effectType: 'restore_balance'
        },
        {
          title: '小明用書包幫忙護住立柱走道',
          description: '「學姊握好，我用肩膀幫妳擋住上下車的衝撞！」獲得【學弟守護盾】，抵消一次急煞！',
          icon: '🛡️',
          tag: '急煞防護盾',
          effectType: 'shield'
        }
      ]
    },
    station_officer: {
      id: 'station_officer',
      npcName: '北捷熱心站務長',
      npcRole: '捷運安全巡視員',
      avatar: '🚇👮',
      badgeText: '🚇 車廂即時關懷 · 北捷站務長巡車守護',
      quote: '「媽咪您好！我是巡檢列車的站務員。看到您挺著肚子站了這麼多站，真的非常辛苦！我立刻為您提供捷運友善即時支援！」',
      options: [
        {
          title: '廣播車廂禮讓宣導',
          description: '拿起無線電廣播提醒車廂乘客主動關懷孕婦！全車乘客好感大增，獲得全方位安全護盾！',
          icon: '📢',
          tag: '安全護盾',
          effectType: 'shield'
        },
        {
          title: '調整車廂冷氣柔和出風',
          description: '柔和微風吹散孕期燥熱與煩悶，精神煥發！答題時間充裕延長 +10 秒！',
          icon: '🌬️',
          tag: '時間延長+10s',
          effectType: 'heal_time'
        },
        {
          title: '遞上北捷溫開水與舒緩指引',
          description: '補充水分穩定自律神經，平衡值回滿 100%，並消除 1 次失衡紀錄！',
          icon: '💧',
          tag: '平衡回滿+消失衡',
          effectType: 'restore_balance'
        }
      ]
    },
    grand_seat_offering: {
      id: 'grand_seat_offering',
      npcName: '全車乘客與同學們',
      npcRole: '感動全車的溫馨大讓座',
      avatar: '🎉💖💺',
      badgeText: '🌟 奇蹟時刻 · 累積答對 7 題感動全車！',
      quote: '「天哪！全車乘客看著車站跑馬燈：媽咪挺著 6.5kg 的負重，一路抓緊立柱，已經堅強跨越了 4 座大站、答對了 7 題產科考驗！高中生收起手機、上班族站起身、全車乘客一致起立鼓掌：『媽咪妳太偉大、太厲害了！最後這幾站抵達淡水，請無論如何一定要坐下休息！』」',
      options: [
        {
          title: '欣然就座 · 享受全車掌聲與最後衝刺',
          description: '媽咪安穩坐上博愛座，雙腳徹底放鬆，解除所有站立晃動與急煞壓力，以最自信的笑容迎向淡水終點站！',
          icon: '💺',
          tag: '解鎖安穩就座',
          effectType: 'grand_seat'
        }
      ]
    }
  };

  const triggerHelpfulNpc = (npcId: string) => {
    const npc = HELPFUL_NPCS[npcId];
    if (!npc) return;
    playSuccessChime();
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    setActiveNpcEvent(npc);
  };

  const triggerGrandSeatOffering = () => {
    const grandEvent = HELPFUL_NPCS['grand_seat_offering'];
    if (!grandEvent) return;
    playSuccessChime();
    confetti({ particleCount: 120, spread: 85, origin: { y: 0.5 } });
    setActiveNpcEvent(grandEvent);
  };

  const handleExecuteNpcHelp = (opt: HelpfulNpcOption) => {
    playSuccessChime();
    confetti({ particleCount: 75, spread: 75, origin: { y: 0.6 } });
    setActiveNpcEvent(null);

    if (opt.effectType === 'heal_time') {
      setTimeLeft((t) => t + 10);
      setPassengerBubble(`⏱️ ${opt.title}生效！答題倒數充裕延長 +10 秒！`);
      setBroadcastText(`✨ 好心人及時相助：${opt.title}！`);
    } else if (opt.effectType === 'shield') {
      setHasShield(true);
      setPassengerBubble(`🛡️ ${opt.title}生效！獲得愛心護盾，抵禦急煞失衡！`);
      setBroadcastText(`🛡️ 護盾啟動：成功獲得防護守護！`);
    } else if (opt.effectType === 'eliminate_options') {
      const currentQ = SUBWAY_QUESTIONS[currentQIndex % SUBWAY_QUESTIONS.length];
      const incorrect = currentQ.options
        .map((_, i) => i)
        .filter((i) => i !== currentQ.correctIndex && !eliminatedIndices.includes(i));
      const toEliminate = incorrect.slice(0, 2);
      setEliminatedIndices((prev) => [...prev, ...toEliminate]);
      setPassengerBubble(`💡 ${opt.title}生效！成功排除 2 個錯誤選項！`);
      setBroadcastText(`💡 獲得產科重點支援，精準鎖定正確答案！`);
    } else if (opt.effectType === 'restore_balance') {
      setBalance(100);
      setMistakeCount((m) => Math.max(0, m - 1));
      setTimeLeft((t) => t + 5);
      setPassengerBubble(`💖 ${opt.title}生效！平衡值回滿 100%，失衡次數 -1，時間 +5 秒！`);
      setBroadcastText(`💖 身體獲得及時調適，重心穩定恢復滿格！`);
    } else if (opt.effectType === 'grand_seat') {
      setIsSeated(true);
      setBalance(100);
      setHasShield(true);
      setPassengerBubble('🎉 全車起立讓座！媽咪安心就座，享受舒適通勤！💖');
      setBroadcastText('🌟 全車乘客感動熱情讓座！媽咪安心入座，直奔淡水終點站！');
    }

    setTimeout(() => {
      setPassengerBubble(null);
    }, 4500);
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
      // Open Grandma's helpful vegetable basket!
      triggerHelpfulNpc('grandma_veggies');
    } else if (type === 'kid') {
      setPassengerBubble('👧 小學生妹妹：「阿姨妳好！老師說好孕胸章代表肚子裡有可愛的小寶寶，我長大搭捷運也一定會讓座！」🎈');
    } else if (type === 'dog') {
      playKawaiiCoin();
      setTimeLeft((t) => t + 3);
      setPassengerBubble('🐕 柴犬豆豆：「汪汪！(吐著粉嫩小舌頭轉圈圈搖尾巴，答題時間免費 +3 秒！)」🦴');
    } else if (type === 'game') {
      if (isSeated) {
        setPassengerBubble('🧍 讓座同學：「學姊請安心坐著！後面這幾站交給我們守護！」');
      } else {
        triggerHelpfulNpc('student_ming');
      }
    } else if (type === 'sleep') {
      if (!hasShield) {
        setHasShield(true);
        setPassengerBubble('😴 上班族林專員驚醒：「抱歉抱歉！這枚幸運【好孕護盾胸章】送給妳，保護妳安全！」(獲得好孕護盾)✨');
      } else {
        setTimeLeft((t) => t + 4);
        setPassengerBubble('😴 上班族林專員：「哈欠...不好意思昨晚加班太累，這包潤喉糖給妳提神！(時間 +4 秒)」');
      }
    } else {
      setPassengerBubble('📱 追劇小姐姐：「（戴著降噪耳機喝珍奶傻笑）這部韓劇太感人了！媽咪加油喔！」');
    }

    setTimeout(() => {
      setPassengerBubble(null);
    }, 4500);
  };

  const currentQ = SUBWAY_QUESTIONS[currentQIndex % SUBWAY_QUESTIONS.length];

  return (
    <div className="w-full max-w-[1700px] mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4 space-y-3 sm:space-y-4 overflow-x-hidden">
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
              體驗者正在進行 6.5kg 負重實測，<strong>捷運車廂無座考驗正式展開！</strong> 媽咪需抓緊立柱抵抗行駛顛簸，每題限時 <strong>15 秒</strong>，共 <strong>10 題產科精選題庫</strong>，跨越 5 座捷運車站！中途會有<strong>買菜婆婆（陳阿嬤）</strong>上前提供暖心協助；需堅持站穩並<strong>答對達 7 題以上</strong>，才能以母愛毅力感動全車迎來終極讓座！
            </p>
          </div>

          {/* Metro Route Overview (Unified playthrough across all 5 Red Line stations) */}
          <div className="bg-[#FFFCF4]/90 rounded-2xl border-2 border-[#FFBCBD] p-4 text-left space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#4A3337] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600 inline-block animate-ping" />
                🚇 捷運淡水信義線 · 5 站長征路線巡禮
              </span>
              <span className="text-[10px] text-[#E85D75] font-black bg-[#FFE0E6] px-2.5 py-0.5 rounded-full border border-[#FFBCBD]/60">
                共 {TOTAL_QUESTIONS} 題精選產科考驗
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 text-center pt-1">
              {STATIONS.map((st) => (
                <div key={st.id} className="p-2 bg-[#FFE0E6]/30 hover:bg-[#FFE0E6]/50 rounded-xl border border-[#FFBCBD]/40 transition-colors">
                  <div className="text-[10px] font-black text-red-600 font-mono">{st.id}</div>
                  <div className="text-xs font-black text-[#4A3337] truncate">{st.name}</div>
                  <div className="text-[9px] text-[#7A5860] hidden sm:block truncate mt-0.5 font-medium">{st.subtitle}</div>
                </div>
              ))}
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
              <span>{isFullscreen ? '縮小視窗' : '電腦全螢幕'}</span>
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
                    {correctCount}/{TOTAL_QUESTIONS}
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
          <div className={`grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start w-full min-w-0 transition-transform duration-200 ${
            isRandomBump
              ? (bumpDirection === 'left' ? '-translate-x-0.5 translate-y-0.5 rotate-[-0.2deg]' : 'translate-x-0.5 -translate-y-0.5 rotate-[0.2deg]')
              : ''
          }`}>
            {/* Left Column (lg:col-span-7): The Interactive Subway Carriage Scene */}
            <div className={`lg:col-span-7 w-full min-w-0 transition-all ${
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
                <div className="w-full bg-[#FFFCF4]/95 border border-[#FFBCBD] rounded-xl px-2 sm:px-3 py-1 flex items-center justify-between gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] shadow-2xs my-0.5 overflow-hidden">
                  {/* Left: Dynamic Train Motion status */}
                  <div className="flex items-center gap-1 sm:gap-1.5 font-bold text-[#4A3337] min-w-0 shrink">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      isWobbling
                        ? 'bg-rose-500 animate-ping'
                        : isRandomBump
                        ? 'bg-amber-500 animate-ping'
                        : 'bg-emerald-500 animate-pulse'
                    }`} />
                    <span className="font-mono text-[#E85D75] shrink-0 font-black text-[9px] sm:text-[10px]">
                      {isWobbling ? '🚨 晃動' : isRandomBump ? '⚡ 顛簸' : '🚃 前行'}
                    </span>
                    <span className="text-[#6B4B52] hidden md:inline truncate">
                      {swayDescription}
                    </span>
                  </div>

                  {/* Center: Real-time Dynamic Spirit Level (重心水準儀) */}
                  <div className="flex items-center gap-1 shrink-0 font-mono" title="即時檢測媽咪站立身體重心偏移角度">
                    <span className="text-[#7A5860] hidden lg:inline text-[9px]">重心角:</span>
                    <div className="w-12 sm:w-16 h-2 sm:h-2.5 bg-stone-200/90 rounded-full relative overflow-hidden border border-stone-300 flex items-center justify-center">
                      {/* Center balance line */}
                      <div className="absolute w-0.5 h-full bg-stone-400 left-1/2 -translate-x-1/2" />
                      {/* Dynamic Bubble Indicator */}
                      <motion.div
                        className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shadow-xs ${
                          Math.abs(tiltAngle) > 10 ? 'bg-rose-500' : Math.abs(tiltAngle) > 4 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        animate={{ x: Math.max(-20, Math.min(20, tiltAngle * 1.3)) }}
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
                      <span className="px-1 sm:px-1.5 py-0.5 rounded-full font-black text-[8px] sm:text-[9px] bg-sky-100 text-sky-900 border border-sky-300 animate-pulse flex items-center gap-0.5">
                        <span>🛡️ 護盾</span>
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
                        ? '⚠️ 站立不穩'
                        : currentStance === 'holding'
                        ? '💪 握好立柱'
                        : '💖 安心就座'}
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

                {/* Passenger Speech Bubble (Fully responsive, no overflow) */}
                {passengerBubble && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-1 sm:top-2 left-1/2 -translate-x-1/2 bg-[#FFFCF4]/95 text-[#4A3337] border-2 border-[#FFBCBD] rounded-xl sm:rounded-2xl px-2.5 py-1 sm:px-4 sm:py-2 text-[9px] sm:text-xs font-bold shadow-lg z-30 w-[92%] sm:w-auto max-w-sm text-center break-words"
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
                      title="點擊尋求高中生小明的筆記與支援！"
                    >
                      <div className="text-[7px] sm:text-[9px] font-bold text-[#6B4B52] bg-[#FFFCF4]/90 px-1 py-0.2 rounded-full mb-0.5 border border-[#FFBCBD] group-hover:bg-[#FFE0E6] whitespace-nowrap">
                        {correctCount >= 2 ? '👀 小明' : '🎮 小明'}
                      </div>
                      <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-[#FFE0E6] border-2 border-[#FFBCBD] flex items-center justify-center text-lg sm:text-2xl shadow-xs group-hover:scale-105 transition-transform">
                        {mistakeCount >= 2 ? '😱' : correctCount >= 2 ? '👀' : '🎧'}
                      </div>
                      <div className="h-2 w-8 sm:w-11 bg-blue-700 rounded-t-sm mt-0.5" title="博愛座" />
                    </div>
                  )}

                  {/* Left Side: Priority Seat 2 (Grandma with Groceries Basket - Helpful NPC) */}
                  <div
                    onClick={() => handlePassengerClick('grandma')}
                    className="flex flex-col items-center cursor-pointer group shrink-0"
                    title="點擊尋求買菜婆婆陳阿嬤的愛心相助！"
                  >
                    <div className="text-[7px] sm:text-[9px] font-bold text-[#6B4B52] bg-[#FFFCF4]/90 px-1 py-0.2 rounded-full mb-0.5 border border-[#FFBCBD] group-hover:bg-[#FFE0E6] whitespace-nowrap animate-pulse">
                      👵 買菜婆婆
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
            <div className="lg:col-span-5 w-full min-w-0 space-y-2.5 sm:space-y-3">
              {/* Question Status Bar */}
              <div className="bg-[#FFE0E6]/90 rounded-2xl border-2 border-[#FFBCBD] px-3 py-2 shadow-2xs flex items-center justify-between gap-2 min-w-0">
                <span className="text-[11px] sm:text-xs font-black text-[#4A3337] flex items-center gap-1.5 min-w-0 flex-1 truncate">
                  <span className="w-2 h-2 rounded-full bg-red-600 inline-block animate-ping shrink-0" />
                  <span className="truncate">{currentStation.name} · {currentStation.subtitle}</span>
                </span>

                <div className="flex items-center gap-1.5">
                  {hasShield && (
                    <span className="bg-sky-100 text-sky-800 border border-sky-300 px-2 py-0.5 rounded-full text-[10px] font-black animate-pulse flex items-center gap-0.5">
                      <span>🛡️ 護盾在身</span>
                    </span>
                  )}
                  {isSeated ? (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-0.5">
                      <span>💺 安心就座</span>
                    </span>
                  ) : (
                    <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-0.5">
                      <span>💪 站立守護中</span>
                    </span>
                  )}
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

                    {mistakeCount < MAX_MISTAKES && currentQIndex < SUBWAY_QUESTIONS.length - 1 && (
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

                    {mistakeCount < MAX_MISTAKES && currentQIndex >= SUBWAY_QUESTIONS.length - 1 && (
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={handleTriggerWin}
                          className="w-full sm:w-auto px-4 py-2 sm:px-5 sm:py-2.5 bg-[#E85D75] hover:bg-[#D44763] text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-transform active:scale-95 flex items-center justify-center gap-1"
                        >
                          <span>🎉 抵達終點站淡水！查看結算報告 ➔</span>
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
          HELPFUL NPC SURPRISE ENCOUNTER MODAL (車廂好心人及時相助流程機制)
         ========================================================================= */}
      {activeNpcEvent !== null && (
        <div className="fixed inset-0 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[#FFFCF4] border-3 border-[#FFBCBD] rounded-3xl p-5 sm:p-7 max-w-lg w-full text-center space-y-4 shadow-2xl overflow-y-auto max-h-[92vh]">
            <div className="text-4xl sm:text-5xl animate-bounce">
              {activeNpcEvent.avatar}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="bg-[#E85D75] text-white text-[10px] sm:text-xs font-black px-3 py-1 rounded-full shadow-xs">
                  {activeNpcEvent.badgeText}
                </span>
                <span className="text-xs font-black text-[#7A5860] bg-[#FFE0E6] px-2 py-0.5 rounded-full border border-[#FFBCBD]/50">
                  {activeNpcEvent.npcRole}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-[#4A3337] font-serif-tc">
                {activeNpcEvent.npcName}
              </h3>
              <div className="bg-[#FFE0E6]/30 border border-[#FFBCBD]/60 rounded-2xl p-3 text-left">
                <p className="text-xs sm:text-sm text-[#5C3E43] font-medium leading-relaxed">
                  {activeNpcEvent.quote}
                </p>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2.5 pt-1">
              {activeNpcEvent.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleExecuteNpcHelp(opt)}
                  className="w-full p-3 sm:p-3.5 bg-gradient-to-r from-rose-50 to-[#FFFCF4] hover:from-[#FFE0E6] hover:to-rose-100 border-2 border-[#FFBCBD] hover:border-[#E85D75] rounded-2xl transition-all hover:scale-[1.01] active:scale-98 shadow-xs cursor-pointer text-left flex items-start gap-3 group"
                >
                  <div className="text-2xl sm:text-3xl shrink-0 group-hover:scale-115 transition-transform mt-0.5">
                    {opt.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className="font-black text-xs sm:text-sm text-[#4A3337] group-hover:text-[#E85D75] transition-colors">
                        {opt.title}
                      </span>
                      <span className="text-[9px] font-black text-[#E85D75] bg-white/90 border border-[#FFBCBD] px-1.5 py-0.2 rounded-full shrink-0">
                        {opt.tag}
                      </span>
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-[#7A5860] mt-0.5 font-medium leading-snug">
                      {opt.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {activeNpcEvent.id !== 'grand_seat_offering' && (
              <button
                type="button"
                onClick={() => setActiveNpcEvent(null)}
                className="text-xs text-[#7A5860] hover:text-[#4A3337] underline pt-1 cursor-pointer font-bold"
              >
                心領好意，繼續專注答題
              </button>
            )}
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
              經歷了忠義站、關渡站、竹圍站、紅樹林站到淡水終點站，{currentMomName}在顛簸車廂中雙手抓穩立柱，中途受到買菜阿嬤的及時相助，並在累積答對 7 題後感動全車起立讓座，順利攻破所有產科關卡！
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
            💡 闖關攻略：車廂顛簸晃動時請抓緊立柱；中途遇到買菜阿嬤時，善用她提供的及時相助；累積答對 7 題即可感動全車迎來終極就座！
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

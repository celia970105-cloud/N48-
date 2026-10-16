import React from 'react';
import { motion } from 'motion/react';

export type CharacterMood = 'idle' | 'correct' | 'wrong' | 'seated';
export type MomStance = 'unheld' | 'holding' | 'seated' | 'flying';

interface PregnantMomIllustrationProps {
  mood: CharacterMood;
  name: string;
  badgeStyle: 'pink_heart' | 'dino_egg' | 'watermelon';
  tiltAngle: number;
  stance?: MomStance;
  compact?: boolean;
  hasShield?: boolean;
}

export const PregnantMomIllustration: React.FC<PregnantMomIllustrationProps> = ({
  mood,
  name,
  badgeStyle,
  tiltAngle,
  stance = 'unheld',
  compact = false,
  hasShield = false
}) => {
  const isWrong = mood === 'wrong';
  const isCorrect = mood === 'correct';
  const isSeated = stance === 'seated' || mood === 'seated';
  const isHolding = stance === 'holding';
  const isFlying = stance === 'flying';
  const isUnheld = stance === 'unheld' && !isSeated && !isFlying;

  if (isFlying) {
    return (
      <motion.div
        animate={{
          x: [0, -30, 480],
          y: [0, -80, -420],
          rotate: [0, 45, 1080],
          scale: [1, 1.25, 0.15],
          opacity: [1, 1, 0]
        }}
        transition={{
          duration: 1.2,
          ease: [0.25, 0.1, 0.25, 1]
        }}
        className="relative flex flex-col items-center select-none z-50 pointer-events-none"
      >
        <div className={`absolute ${compact ? '-top-8 text-[10px] px-2.5 py-0.5' : '-top-14 text-xs px-4 py-1.5'} z-30 flex items-center gap-1 bg-red-600 text-white font-black rounded-full shadow-2xl border-2 border-white animate-pulse whitespace-nowrap`}>
          <span>🚀 啊！急煞～媽咪飛出去啦！</span>
        </div>
        <div className={`${compact ? 'text-2xl -bottom-4' : 'text-4xl -bottom-6'} absolute animate-ping`}>
          💨💥💨
        </div>
        <svg
          viewBox="0 0 170 210"
          className={`${compact ? 'w-22 h-28' : 'w-34 h-44 sm:w-38 sm:h-48'} drop-shadow-2xl overflow-visible`}
        >
          <ellipse cx="85" cy="40" rx="36" ry="34" fill="#6D4C41" />
          <ellipse cx="85" cy="50" rx="28" ry="26" fill="#FFE8DF" />
          {/* Dizzy fly eyes */}
          <path d="M 68 48 L 76 52 L 68 56" stroke="#4A2511" strokeWidth="3" fill="none" />
          <path d="M 102 48 L 94 52 L 102 56" stroke="#4A2511" strokeWidth="3" fill="none" />
          <ellipse cx="85" cy="62" rx="7" ry="5" fill="#E85D75" />
          {/* Dress */}
          <ellipse cx="85" cy="126" rx="38" ry="36" fill="#FFBCBD" />
          {/* Flailing arms */}
          <path d="M 62 90 L 25 60" stroke="#FFE8DF" strokeWidth="8" strokeLinecap="round" />
          <path d="M 108 90 L 145 60" stroke="#FFE8DF" strokeWidth="8" strokeLinecap="round" />
          {/* Flailing legs */}
          <path d="M 72 156 L 50 195" stroke="#FFE8DF" strokeWidth="8" strokeLinecap="round" />
          <path d="M 98 156 L 120 195" stroke="#FFE8DF" strokeWidth="8" strokeLinecap="round" />
        </svg>
      </motion.div>
    );
  }

  return (
    <motion.div
      animate={{
        rotate: isHolding ? tiltAngle * 0.2 : tiltAngle,
        x: isWrong ? [-6, 6, -8, 8, -4, 4, 0] : 0,
        y: isWrong ? [0, 4, -4, 2, 0] : isCorrect ? [0, -5, 0] : 0
      }}
      transition={{
        rotate: { type: 'spring', stiffness: isWrong ? 400 : 180, damping: 12 },
        x: { duration: 0.45, ease: 'easeInOut' },
        y: { duration: 0.4, ease: 'easeInOut' }
      }}
      className="relative flex flex-col items-center select-none"
    >
      {/* Protective Shield Halo / Aura when hasShield is active */}
      {hasShield && (
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.65, 0.95, 0.65]
          }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          className="absolute -inset-3 sm:-inset-4 rounded-3xl border-2 border-sky-400 bg-sky-300/15 pointer-events-none z-10 shadow-[0_0_20px_rgba(56,189,248,0.45)] flex items-start justify-end p-1"
        >
          <span className="text-xs sm:text-sm animate-pulse drop-shadow">🛡️</span>
        </motion.div>
      )}

      {/* Floating Emotions / Status badge above head */}
      {hasShield && !isWrong && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`absolute ${compact ? '-top-10 text-[8px] px-2 py-0.2' : '-top-14 text-[10px] px-2.5 py-0.5'} z-30 flex items-center gap-1 bg-sky-500 text-white font-black rounded-full shadow-md border-2 border-white animate-pulse whitespace-nowrap`}
        >
          <span>🛡️ 好孕護盾庇護中 (免急煞失衡)</span>
        </motion.div>
      )}

      {isWrong && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 10 }}
          animate={{ opacity: 1, scale: 1.1, y: 0 }}
          className={`absolute ${compact ? '-top-7 text-[9px] px-2 py-0.2' : '-top-11 text-[11px] px-3 py-1'} z-30 flex items-center gap-1 bg-rose-600 text-white font-black rounded-full shadow-lg border-2 border-white animate-bounce whitespace-nowrap`}
        >
          <span>😵 列車急晃！小心重心！</span>
        </motion.div>
      )}

      {isSeated && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 10 }}
          animate={{ opacity: 1, scale: 1.1, y: 0 }}
          className={`absolute ${compact ? '-top-7 text-[9px] px-2 py-0.2' : '-top-12 text-[11px] px-3.5 py-1.5'} z-30 flex items-center gap-1 bg-pink-600 text-white font-black rounded-full shadow-lg border-2 border-white animate-bounce whitespace-nowrap`}
        >
          <span>💖 乘客主動讓座！安心就座 ✨</span>
        </motion.div>
      )}

      {isHolding && !isSeated && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`absolute ${compact ? '-top-7 text-[9px] px-2 py-0.2' : '-top-11 text-[11px] px-3 py-1'} z-30 flex items-center gap-1 bg-emerald-600 text-white font-black rounded-full shadow-lg border-2 border-white whitespace-nowrap`}
        >
          <span>💪 穩穩扶好黃色立柱！超安心</span>
        </motion.div>
      )}

      {isCorrect && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 10 }}
          animate={{ opacity: 1, scale: 1.1, y: 0 }}
          className={`absolute ${compact ? '-top-7 text-[9px] px-2 py-0.2' : '-top-11 text-[11px] px-3 py-1'} z-30 flex items-center gap-1 bg-emerald-600 text-white font-black rounded-full shadow-lg border-2 border-white animate-bounce`}
        >
          <span>✨ 答對了！站得穩穩的</span>
        </motion.div>
      )}

      {/* Sweat droplets when wrong */}
      {isWrong && (
        <>
          <motion.div
            animate={{ y: [-5, 10], opacity: [1, 0] }}
            transition={{ repeat: Infinity, duration: 0.6 }}
            className={`absolute ${compact ? '-top-1 -right-1 text-sm' : '-top-2 -right-2 text-xl'} z-20 pointer-events-none`}
          >
            💦
          </motion.div>
          <motion.div
            animate={{ y: [-5, 12], opacity: [1, 0] }}
            transition={{ repeat: Infinity, duration: 0.7, delay: 0.2 }}
            className={`absolute ${compact ? 'top-0 -left-1 text-sm' : 'top-0 -left-3 text-lg'} z-20 pointer-events-none`}
          >
            💧
          </motion.div>
        </>
      )}

      {/* Sparkles when correct or holding */}
      {(isCorrect || isHolding) && (
        <>
          <motion.div
            animate={{ scale: [0.8, 1.2, 0.8], rotate: [0, 90, 180] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className={`absolute ${compact ? '-top-2 -right-2 text-sm' : '-top-3 -right-4 text-xl'} z-20 pointer-events-none`}
          >
            ✨
          </motion.div>
          <motion.div
            animate={{ scale: [1, 1.25, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className={`absolute ${compact ? '-top-1 -left-2 text-sm' : '-top-2 -left-4 text-lg'} z-20 pointer-events-none`}
          >
            💖
          </motion.div>
        </>
      )}

      {/* ---------------- SUPER KAWAII CHIBI PREGNANT MOM SVG ---------------- */}
      {/* 
        Key Design Fixes:
        1. Grounding: Solid floor shadow directly beneath her pink shoes so she is firmly standing on the carriage floor!
        2. Natural Ergonomic Holding: The vertical MRT grab pole is beside her at waist/chest height. When holding, her right arm is gently bent at the elbow, hand resting comfortably on the vertical pole at mid-chest level (y=92). Her left hand lovingly rests on her round baby belly. ZERO upward stretching or hanging!
        3. Super Adorable Chibi Look: Soft blushing cheeks with white highlights, big cute sparkling eyes, cute strawberry/flower hairpin, round cute belly with baby badge.
      */}
      <svg
        viewBox="0 0 170 215"
        className={`${compact ? 'w-24 h-28 sm:w-28 sm:h-34' : 'w-36 h-44 sm:w-42 sm:h-50'} drop-shadow-md overflow-visible`}
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#794C38" />
            <stop offset="100%" stopColor="#553020" />
          </linearGradient>

          <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFF7F2" />
            <stop offset="100%" stopColor="#FFE7DC" />
          </linearGradient>

          <linearGradient id="dressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE0E6" />
            <stop offset="60%" stopColor="#FFBCBD" />
            <stop offset="100%" stopColor="#FF9AA2" />
          </linearGradient>

          <linearGradient id="mrtPoleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="50%" stopColor="#EAB308" />
            <stop offset="100%" stopColor="#CA8A04" />
          </linearGradient>

          <linearGradient id="blueSeatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
        </defs>

        {/* 0. Floor Grounding Shadow (Ensures Mom is firmly planted on carriage floor, never floating!) */}
        <ellipse cx="80" cy="200" rx={isSeated ? 42 : 36} ry="6" fill="#4A3337" opacity="0.16" />

        {/* Priority Seat if Seated */}
        {isSeated && (
          <g>
            <rect x="42" y="142" width="76" height="52" rx="10" fill="url(#blueSeatGrad)" stroke="#1E40AF" strokeWidth="2" />
            <rect x="46" y="146" width="68" height="12" rx="4" fill="#3B82F6" opacity="0.6" />
            <text x="80" y="186" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="900" fontFamily="sans-serif">
              ♿ 博愛座
            </text>
          </g>
        )}

        {/* 1. Subway Vertical Grab Pole on Mom's Right Side (Realistic Yellow Pole Standing on Floor) */}
        {!isSeated && (
          <g className="subway-pole">
            {/* Top ceiling bracket bar */}
            <rect x="0" y="6" width="170" height="5" rx="2.5" fill="#CBD5E1" />
            
            {/* Real vertical grab pole right beside Mom (x=120) from ceiling to floor */}
            <rect
              x="118"
              y="6"
              width="8"
              height="194"
              rx="4"
              fill="url(#mrtPoleGrad)"
              stroke="#B45309"
              strokeWidth="0.8"
            />
            {/* Top bracket mount */}
            <rect x="115" y="4" width="14" height="8" rx="2" fill="#94A3B8" />
            {/* Floor bracket mount */}
            <rect x="114" y="194" width="16" height="8" rx="2" fill="#94A3B8" />

            {/* Mid-height pole texture rings for grip */}
            <line x1="118" y1="80" x2="126" y2="80" stroke="#B45309" strokeWidth="1" />
            <line x1="118" y1="104" x2="126" y2="104" stroke="#B45309" strokeWidth="1" />

            {/* When holding: warm golden glow pulse on the pole grip point */}
            {isHolding && (
              <circle
                cx="122"
                cy="92"
                r="11"
                fill="none"
                stroke="#FDE047"
                strokeWidth="2.5"
                strokeDasharray="4 2"
                className="animate-spin"
              />
            )}
          </g>
        )}

        {/* 2. Character: Cute Bob Hair Base (Back hair) */}
        <ellipse cx="80" cy="50" rx="36" ry="33" fill="url(#hairGrad)" />
        {/* Soft rounded hair bottom curve */}
        <path d="M 44 54 C 42 76, 50 88, 56 90" stroke="#553020" strokeWidth="7" strokeLinecap="round" fill="none" />
        <path d="M 116 54 C 118 76, 110 88, 104 90" stroke="#553020" strokeWidth="7" strokeLinecap="round" fill="none" />

        {/* 3. Neck */}
        <rect x="74" y="70" width="12" height="10" rx="4" fill="url(#skinGrad)" />

        {/* 4. Cute Round Chibi Head */}
        <ellipse cx="80" cy="54" rx="28" ry="25" fill="url(#skinGrad)" />

        {/* 5. Cute Soft Ears */}
        <circle cx="52" cy="55" r="4.5" fill="url(#skinGrad)" />
        <circle cx="108" cy="55" r="4.5" fill="url(#skinGrad)" />

        {/* 6. Soft Front Bangs (Kawaii Rounded Fringe) */}
        <path
          d="M 52 48 C 56 30, 104 30, 108 48 C 104 38, 92 40, 86 44 C 80 40, 70 38, 62 45 C 57 43, 54 45, 52 48 Z"
          fill="url(#hairGrad)"
        />

        {/* 7. Cute Flower Hairpin (🌸) on left hair */}
        <g transform="translate(48, 32)">
          <circle cx="6" cy="6" r="4" fill="#E85D75" />
          <circle cx="2" cy="6" r="3" fill="#FFBCBD" />
          <circle cx="10" cy="6" r="3" fill="#FFBCBD" />
          <circle cx="6" cy="2" r="3" fill="#FFBCBD" />
          <circle cx="6" cy="10" r="3" fill="#FFBCBD" />
          <circle cx="6" cy="6" r="1.8" fill="#FEF08A" />
        </g>

        {/* 8. ADORABLE FACIAL EXPRESSIONS */}
        {isWrong ? (
          /* Stumbling / Worried expression (> <;) */
          <g>
            <path d="M 64 43 Q 70 47 74 45" stroke="#553020" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M 96 43 Q 90 47 86 45" stroke="#553020" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* Anime squeeze eyes (> <) */}
            <path d="M 63 51 L 72 55 L 63 59" stroke="#4A2511" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M 97 51 L 88 55 L 97 59" stroke="#4A2511" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {/* Blushing from distress */}
            <ellipse cx="61" cy="60" rx="5" ry="3" fill="#FF8FAB" opacity="0.7" />
            <ellipse cx="99" cy="60" rx="5" ry="3" fill="#FF8FAB" opacity="0.7" />
            {/* Wavy mouth (﹏) */}
            <path d="M 73 66 Q 77 63 80 66 Q 83 69 87 66" stroke="#553020" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          </g>
        ) : (isCorrect || isSeated) ? (
          /* Happy, Relaxed Sparkling Smile (^◡^) */
          <g>
            <path d="M 64 42 Q 70 38 75 42" stroke="#553020" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M 85 42 Q 90 38 96 42" stroke="#553020" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Happy curved crescent anime eyes */}
            <path d="M 63 52 Q 69 46 75 52" stroke="#4A2511" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M 85 52 Q 91 46 97 52" stroke="#4A2511" strokeWidth="3" strokeLinecap="round" fill="none" />
            {/* Sweet rosy blush with sparkles */}
            <ellipse cx="61" cy="60" rx="6" ry="3.5" fill="#FF8FAB" opacity="0.8" />
            <ellipse cx="99" cy="60" rx="6" ry="3.5" fill="#FF8FAB" opacity="0.8" />
            <circle cx="63" cy="59" r="1.3" fill="#FFFFFF" />
            <circle cx="101" cy="59" r="1.3" fill="#FFFFFF" />
            {/* Open happy smile */}
            <path d="M 74 64 Q 80 70 86 64" stroke="#553020" strokeWidth="2" strokeLinecap="round" fill="#E85D75" />
          </g>
        ) : (
          /* Normal Sweet Chibi Mother Face (Big Sparkling Eyes) */
          <g>
            <path d="M 64 42 Q 70 40 74 42" stroke="#553020" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M 86 42 Q 90 40 96 42" stroke="#553020" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Big round sparkling eyes */}
            <ellipse cx="69" cy="53" rx="4.5" ry="5.5" fill="#3D2012" />
            <ellipse cx="91" cy="53" rx="4.5" ry="5.5" fill="#3D2012" />
            {/* Double white sparkles */}
            <circle cx="70.5" cy="51.5" r="1.8" fill="#FFFFFF" />
            <circle cx="67.5" cy="55" r="0.9" fill="#FFFFFF" />
            <circle cx="92.5" cy="51.5" r="1.8" fill="#FFFFFF" />
            <circle cx="89.5" cy="55" r="0.9" fill="#FFFFFF" />
            {/* Rosy blush */}
            <ellipse cx="61" cy="60" rx="5" ry="3" fill="#FF8FAB" opacity="0.65" />
            <ellipse cx="99" cy="60" rx="5" ry="3" fill="#FF8FAB" opacity="0.65" />
            {/* Sweet smile */}
            <path d="M 76 65 Q 80 68 84 65" stroke="#553020" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        )}

        {/* 9. Sweet Maternity Dress Bodice */}
        <path
          d="M 60 76 L 100 76 L 110 118 C 110 134, 50 134, 50 118 Z"
          fill="url(#dressGrad)"
        />
        {/* Peter Pan Scalloped White Collar */}
        <path d="M 70 76 C 74 83, 80 83, 80 77 C 80 83, 86 83, 90 76 Z" fill="#FFFFFF" />

        {/* 10. Cute Round Baby Bump (孕肚) */}
        <ellipse
          cx="80"
          cy="126"
          rx="38"
          ry="36"
          fill="url(#dressGrad)"
        />
        {/* Soft apron highlight curve */}
        <path
          d="M 52 110 C 50 144, 110 144, 108 110 C 95 106, 65 106, 52 110 Z"
          fill="#FFFFFF"
          opacity="0.22"
        />

        {/* 11. Baby Badge Pinned on Belly */}
        <g transform="translate(68, 114)">
          <circle cx="12" cy="12" r="12" fill="#FFFFFF" stroke="#FB6F92" strokeWidth="1.5" />
          {badgeStyle === 'pink_heart' ? (
            <path d="M 12 7 C 9 4, 5 7, 7 11 L 12 16 L 17 11 C 19 7, 15 4, 12 7 Z" fill="#FB6F92" />
          ) : badgeStyle === 'dino_egg' ? (
            <g transform="translate(4, 3)">
              <ellipse cx="8" cy="9" rx="6.5" ry="8" fill="#10B981" />
              <circle cx="6" cy="6" r="1.5" fill="#047857" />
              <circle cx="10" cy="11" r="1.2" fill="#047857" />
              <path d="M 4 9 L 7 10 L 9 8 L 12 10" stroke="#FFFFFF" strokeWidth="1.2" fill="none" />
              <circle cx="7" cy="8" r="0.8" fill="#000000" />
            </g>
          ) : (
            <g transform="translate(4, 4)">
              <path d="M 2 7 A 6 6 0 0 0 14 7 Z" fill="#EF4444" />
              <path d="M 1 7 A 7 7 0 0 0 15 7" stroke="#10B981" strokeWidth="1.8" fill="none" />
              <circle cx="5" cy="8" r="0.7" fill="#000000" />
              <circle cx="8" cy="9" r="0.7" fill="#000000" />
              <circle cx="11" cy="8" r="0.7" fill="#000000" />
            </g>
          )}
        </g>

        {/* 
          12. NATURAL, ERGONOMIC ARMS & HANDS (Completely eliminates the "being hung" appearance!)
          - Holding Pose: Right arm is naturally bent downward at elbow (shoulder 96,88 -> elbow 108,98 -> hand 118,92)
            holding the vertical yellow MRT pole right at chest level. Relaxed, stable, zero overhead pull!
          - Left arm: Gently curved around her baby belly (shoulder 64,88 -> hand 72,126).
        */}
        {isSeated ? (
          /* Seated: Both hands softly resting on baby belly */
          <g>
            <path d="M 58 92 C 54 110, 64 125, 70 128" stroke="#FFE7DC" strokeWidth="7" strokeLinecap="round" fill="none" />
            <path d="M 102 92 C 106 110, 96 125, 90 128" stroke="#FFE7DC" strokeWidth="7" strokeLinecap="round" fill="none" />
            <circle cx="70" cy="128" r="4.5" fill="#FFE7DC" />
            <circle cx="90" cy="128" r="4.5" fill="#FFE7DC" />
          </g>
        ) : isWrong ? (
          /* Wobble: Reaching sideways toward the vertical pole for stability */
          <g>
            {/* Right arm reaching toward the vertical pole at (118, 92) */}
            <path d="M 96 88 Q 106 94 118 92" stroke="#FFE7DC" strokeWidth="7.5" strokeLinecap="round" fill="none" />
            <circle cx="118" cy="92" r="5" fill="#FFE7DC" />
            {/* Left arm balancing outwards */}
            <path d="M 62 88 Q 46 98 38 110" stroke="#FFE7DC" strokeWidth="7.5" strokeLinecap="round" fill="none" />
            <circle cx="38" cy="110" r="5" fill="#FFE7DC" />
          </g>
        ) : isHolding ? (
          /* NATURAL ERGONOMIC POLE HOLDING (Chest Height, Bent Elbow, Zero Hanging!):
             - Right shoulder at (96, 88)
             - Elbow bent comfortably DOWN at (108, 100)
             - Forearm goes to (118, 92) holding the vertical pole
             - Hand rests naturally on pole with cute fingers
             - Left arm supports baby belly lovingly at (72, 126)
          */
          <g>
            {/* Right Arm: Natural bent arm holding pole at mid-chest height */}
            <path
              d="M 96 88 Q 108 98 118 92"
              stroke="#FFE7DC"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
            />
            {/* Cute hand wrapping around the vertical pole */}
            <circle cx="119" cy="92" r="5.5" fill="#FFE7DC" />
            <path d="M 116 88 Q 122 92 116 96" stroke="#794C38" strokeWidth="1.5" strokeLinecap="round" fill="none" />

            {/* Left Arm: Gently cupping baby bump */}
            <path
              d="M 64 88 C 56 104, 62 124, 72 128"
              stroke="#FFE7DC"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="72" cy="128" r="5" fill="#FFE7DC" />
          </g>
        ) : (
          /* Unheld: Both hands gently resting on belly trying to keep steady */
          <g>
            {/* Right arm near belly */}
            <path d="M 96 88 C 94 104, 90 116, 86 122" stroke="#FFE7DC" strokeWidth="7" strokeLinecap="round" fill="none" />
            <circle cx="86" cy="122" r="5" fill="#FFE7DC" />
            {/* Left arm supporting belly */}
            <path d="M 64 88 C 60 104, 66 124, 74 128" stroke="#FFE7DC" strokeWidth="7" strokeLinecap="round" fill="none" />
            <circle cx="74" cy="128" r="5" fill="#FFE7DC" />
          </g>
        )}

        {/* 13. LEGS & CUTE SNEAKERS FIRMLY GROUNDED ON FLOOR */}
        {isSeated ? (
          /* Seated legs */
          <g>
            <path d="M 68 155 L 68 186" stroke="#FFE7DC" strokeWidth="8" strokeLinecap="round" />
            <path d="M 92 155 L 92 186" stroke="#FFE7DC" strokeWidth="8" strokeLinecap="round" />
            <ellipse cx="68" cy="192" rx="9" ry="5.5" fill="#FF8C8C" />
            <ellipse cx="92" cy="192" rx="9" ry="5.5" fill="#FF8C8C" />
            <ellipse cx="68" cy="190" rx="5" ry="2" fill="#FFFFFF" />
            <ellipse cx="92" cy="190" rx="5" ry="2" fill="#FFFFFF" />
          </g>
        ) : isWrong ? (
          /* Stumbling legs braced on floor */
          <g>
            <path d="M 66 156 L 56 190" stroke="#FFE7DC" strokeWidth="8" strokeLinecap="round" />
            <path d="M 94 156 L 102 188" stroke="#FFE7DC" strokeWidth="8" strokeLinecap="round" />
            <ellipse cx="54" cy="194" rx="9" ry="5.5" fill="#FF8C8C" />
            <ellipse cx="104" cy="192" rx="9" ry="5.5" fill="#FF8C8C" />
            <ellipse cx="54" cy="193" rx="5" ry="2" fill="#FFFFFF" />
            <ellipse cx="104" cy="191" rx="5" ry="2" fill="#FFFFFF" />
          </g>
        ) : (
          /* Stable, shoulder-width stance firmly grounded on carriage floor */
          <g>
            <path d="M 68 156 L 64 192" stroke="#FFE7DC" strokeWidth="8" strokeLinecap="round" />
            <path d="M 92 156 L 96 192" stroke="#FFE7DC" strokeWidth="8" strokeLinecap="round" />
            {/* Cute pink sneakers with white soles and laces */}
            <ellipse cx="62" cy="196" rx="9.5" ry="5.5" fill="#FF8C8C" />
            <ellipse cx="98" cy="196" rx="9.5" ry="5.5" fill="#FF8C8C" />
            {/* White toe cap and sole */}
            <ellipse cx="62" cy="195" rx="5" ry="2.2" fill="#FFFFFF" />
            <ellipse cx="98" cy="195" rx="5" ry="2.2" fill="#FFFFFF" />
            <line x1="59" y1="194" x2="65" y2="194" stroke="#FFE7DC" strokeWidth="1.2" />
            <line x1="95" y1="194" x2="101" y2="194" stroke="#FFE7DC" strokeWidth="1.2" />
          </g>
        )}
      </svg>

      {/* Name tag pill beneath */}
      <div className="mt-1 text-[11px] font-black text-[#4A3337] bg-white/95 px-3 py-0.5 rounded-full shadow-xs border border-[#FFBCBD]">
        {name} · {mood === 'wrong' ? '重心失衡中！' : mood === 'correct' ? '穩若泰山！✨' : mood === 'seated' ? '安心坐好 💖' : isHolding ? '握穩立柱扶手' : '小心站穩中'}
      </div>
    </motion.div>
  );
};


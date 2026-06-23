/**
 * RugbyPitchDisplay
 *
 * Renders a rugby pitch (green rectangle with white markings) and overlays
 * 10 numbered jersey shapes in their canonical positions. Each jersey is
 * interactive — clicking it signals the parent to open the player selector
 * for that position.
 *
 * Layout uses an SVG viewBox coordinate system (400 × 560) so the pitch
 * scales correctly at any container width while maintaining aspect ratio.
 *
 * Positions are arranged as a standard union front-five + back-row + halves
 * formation viewed from above:
 *
 *   Front row:   1  2  3  (props and hooker)
 *   Locks:          4  5
 *   Back row:    6  7  8  (flankers and number 8)
 *   Half backs:     9  10
 *
 * This component is purely presentational — it does not manage player state.
 * The parent (TeamPitchCard) owns the lineup state and passes assignment data
 * down as props.
 */

import { cn } from '@/lib/utils';
import { POSITION_NAMES } from '@/app/(dashboard)/events/[id]/planner/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PositionSlot {
  position: number;      // 1–10
  playerName: string | null;
  isAssigned: boolean;
}

interface RugbyPitchDisplayProps {
  slots: PositionSlot[];
  /** Called when a jersey is clicked. Parent opens the player selector. */
  onPositionClick: (position: number) => void;
  /** Optional — highlights a specific position (e.g., the one being edited). */
  activePosition?: number | null;
  className?: string;
}

// ---------------------------------------------------------------------------
// Position coordinates in the 400×560 viewBox
//
// Jerseys are 44×52 px. cx/cy is the jersey centre.
// The pitch inset is ~30px from the SVG edge on each side.
// ---------------------------------------------------------------------------

const JERSEY_W = 44;
const JERSEY_H = 52;

interface JerseyPosition {
  position: number;
  cx: number;
  cy: number;
}

const JERSEY_POSITIONS: JerseyPosition[] = [
  // Front row (positions 1–3) — bottom of pitch (attack direction = upward)
  { position: 1, cx: 120, cy: 460 },
  { position: 2, cx: 200, cy: 460 },
  { position: 3, cx: 280, cy: 460 },
  // Locks (4–5)
  { position: 4, cx: 155, cy: 385 },
  { position: 5, cx: 245, cy: 385 },
  // Back row (6–8)
  { position: 6, cx: 110, cy: 310 },
  { position: 7, cx: 290, cy: 310 },
  { position: 8, cx: 200, cy: 310 },
  // Half backs (9–10)
  { position: 9, cx: 150, cy: 235 },
  { position: 10, cx: 250, cy: 235 },
];

// ---------------------------------------------------------------------------
// Jersey sub-component
// ---------------------------------------------------------------------------

interface JerseyProps {
  jpos: JerseyPosition;
  slot: PositionSlot;
  isActive: boolean;
  onClick: () => void;
}

function Jersey({ jpos, slot, isActive, onClick }: JerseyProps) {
  const x = jpos.cx - JERSEY_W / 2;
  const y = jpos.cy - JERSEY_H / 2;
  const positionName = POSITION_NAMES[jpos.position] ?? `Position ${jpos.position}`;

  // Colour scheme:
  //   Active (being edited):  gold ring + white fill
  //   Assigned:               white fill + green number
  //   Unassigned:             white fill with dashed ring + grey number
  const isUnassigned = !slot.isAssigned;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`Position ${jpos.position}: ${positionName}${slot.playerName ? ` — ${slot.playerName}` : ' — unassigned'}`}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      style={{ cursor: 'pointer' }}
    >
      {/* Jersey body — simplified shirt silhouette */}
      <path
        d={jerseyPath(x, y, JERSEY_W, JERSEY_H)}
        fill="white"
        stroke={isActive ? '#f59e0b' : isUnassigned ? '#9ca3af' : '#15803d'}
        strokeWidth={isActive ? 2.5 : 1.5}
        strokeDasharray={isUnassigned && !isActive ? '3 2' : undefined}
        filter={isActive ? 'url(#jersey-shadow)' : undefined}
      />

      {/* Position number */}
      <text
        x={jpos.cx}
        y={jpos.cy - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={14}
        fontWeight="bold"
        fill={isActive ? '#b45309' : isUnassigned ? '#9ca3af' : '#15803d'}
        fontFamily="system-ui, sans-serif"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {jpos.position}
      </text>

      {/* Player name — up to 2 lines, truncated */}
      {slot.isAssigned && slot.playerName ? (
        <PlayerNameLabel
          cx={jpos.cx}
          cy={jpos.cy + 12}
          name={slot.playerName}
          isActive={isActive}
        />
      ) : (
        <text
          x={jpos.cx}
          y={jpos.cy + 13}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={7}
          fill="#9ca3af"
          fontFamily="system-ui, sans-serif"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          Tap to assign
        </text>
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a simplified SVG path string for a rugby jersey silhouette.
 * Approximation: rectangular body with slight shoulder notches.
 */
function jerseyPath(x: number, y: number, w: number, h: number): string {
  const shoulderInset = w * 0.18;
  const neckW = w * 0.3;
  const neckD = h * 0.1;
  const nx = x + (w - neckW) / 2;

  return [
    `M ${x} ${y + shoulderInset}`,
    `L ${nx} ${y + shoulderInset}`,
    `L ${nx} ${y + neckD}`,
    `L ${nx + neckW} ${y + neckD}`,
    `L ${nx + neckW} ${y + shoulderInset}`,
    `L ${x + w} ${y + shoulderInset}`,
    `L ${x + w} ${y + h}`,
    `L ${x} ${y + h}`,
    'Z',
  ].join(' ');
}

/** Renders a player name inside the jersey, truncated to fit. */
function PlayerNameLabel({
  cx,
  cy,
  name,
  isActive,
}: {
  cx: number;
  cy: number;
  name: string;
  isActive: boolean;
}) {
  // Split into at most two short fragments to fit the jersey width.
  const parts = name.split(' ');
  const surname = parts[parts.length - 1] ?? '';
  const trimmed = surname.length > 8 ? surname.slice(0, 7) + '.' : surname;

  return (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={7.5}
      fontWeight="600"
      fill={isActive ? '#92400e' : '#166534'}
      fontFamily="system-ui, sans-serif"
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      {trimmed}
    </text>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RugbyPitchDisplay({
  slots,
  onPositionClick,
  activePosition = null,
  className,
}: RugbyPitchDisplayProps) {
  // Build a lookup map from position number → slot for O(1) access.
  const slotMap = new Map<number, PositionSlot>(slots.map((s) => [s.position, s]));

  // Default slot for positions not yet in the array.
  const getSlot = (position: number): PositionSlot =>
    slotMap.get(position) ?? { position, playerName: null, isAssigned: false };

  return (
    <div className={cn('w-full', className)}>
      <svg
        viewBox="0 0 400 560"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Rugby pitch with player positions"
        role="img"
        className="w-full h-auto"
        style={{ maxHeight: '520px' }}
      >
        <defs>
          <filter id="jersey-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#f59e0b" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Pitch background */}
        <rect x="0" y="0" width="400" height="560" fill="#16a34a" rx="4" />

        {/* Pitch outline */}
        <rect
          x="20" y="20" width="360" height="520"
          fill="none" stroke="white" strokeWidth="1.5"
        />

        {/* Halfway line */}
        <line x1="20" y1="280" x2="380" y2="280" stroke="white" strokeWidth="1" />

        {/* 22-metre lines */}
        <line x1="20" y1="176" x2="380" y2="176" stroke="white" strokeWidth="0.75" strokeDasharray="6 4" />
        <line x1="20" y1="384" x2="380" y2="384" stroke="white" strokeWidth="0.75" strokeDasharray="6 4" />

        {/* Try lines */}
        <line x1="20" y1="80" x2="380" y2="80" stroke="white" strokeWidth="1" />
        <line x1="20" y1="480" x2="380" y2="480" stroke="white" strokeWidth="1" />

        {/* In-goal areas */}
        <rect x="20" y="20" width="360" height="60" fill="rgba(255,255,255,0.05)" />
        <rect x="20" y="480" width="360" height="60" fill="rgba(255,255,255,0.05)" />

        {/* Centre circle */}
        <circle cx="200" cy="280" r="18" fill="none" stroke="white" strokeWidth="0.75" />
        <circle cx="200" cy="280" r="2" fill="white" />

        {/* Jersey positions */}
        {JERSEY_POSITIONS.map((jpos) => (
          <Jersey
            key={jpos.position}
            jpos={jpos}
            slot={getSlot(jpos.position)}
            isActive={activePosition === jpos.position}
            onClick={() => onPositionClick(jpos.position)}
          />
        ))}

        {/* Attacking direction arrow */}
        <g transform="translate(380, 145)" opacity="0.5">
          <line x1="0" y1="0" x2="0" y2="-20" stroke="white" strokeWidth="1.5" markerEnd="url(#arrow)" />
          <text x="-8" y="6" fontSize="7" fill="white" fontFamily="system-ui, sans-serif">ATK</text>
        </g>
      </svg>
    </div>
  );
}

import React from 'react';
import Svg, { Circle, G, Line, Path, Polyline } from 'react-native-svg';

// ---------------------------------------------------------------------------
// design.md §7 — 20-icon set. Stroke-based, 24×24 grid, currentColor tint.
// ---------------------------------------------------------------------------

export type IconName =
  | 'compass'
  | 'user'
  | 'inbox'
  | 'profile'
  | 'sun'
  | 'moon'
  | 'search'
  | 'star'
  | 'fork'
  | 'commit'
  | 'branch'
  | 'repo'
  | 'pulse'
  | 'bell'
  | 'check'
  | 'close'
  | 'chevron-right'
  | 'external-link'
  | 'refresh'
  | 'sliders';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  filled?: boolean;
}

function Glyph({
  name,
  filled,
  color,
}: {
  name: IconName;
  filled: boolean;
  color: string;
}) {
  switch (name) {
    case 'compass':
      return (
        <>
          <Circle cx={12} cy={12} r={9} />
          <Path d="M15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5Z" />
        </>
      );
    case 'user':
      return (
        <>
          <Path d="M19 21v-1.5A4.5 4.5 0 0 0 14.5 15h-5A4.5 4.5 0 0 0 5 19.5V21" />
          <Circle cx={12} cy={8} r={4} />
        </>
      );
    case 'inbox':
      return (
        <>
          <Path d="M4 13h4l1.5 3h5L16 13h4" />
          <Path d="M5.5 5.5h13L21 13v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4Z" />
        </>
      );
    case 'profile':
      return (
        <>
          <Circle cx={12} cy={8} r={4} />
          <Path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
        </>
      );
    case 'sun':
      return (
        <>
          <Circle cx={12} cy={12} r={4} />
          <Line x1={12} y1={2.5} x2={12} y2={4.5} />
          <Line x1={12} y1={19.5} x2={12} y2={21.5} />
          <Line x1={2.5} y1={12} x2={4.5} y2={12} />
          <Line x1={19.5} y1={12} x2={21.5} y2={12} />
          <Line x1={5.3} y1={5.3} x2={6.7} y2={6.7} />
          <Line x1={17.3} y1={17.3} x2={18.7} y2={18.7} />
          <Line x1={5.3} y1={18.7} x2={6.7} y2={17.3} />
          <Line x1={17.3} y1={6.7} x2={18.7} y2={5.3} />
        </>
      );
    case 'moon':
      return <Path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />;
    case 'search':
      return (
        <>
          <Circle cx={11} cy={11} r={6.5} />
          <Line x1={16} y1={16} x2={21} y2={21} />
        </>
      );
    case 'star':
      return filled ? (
        <Path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9Z" fill={color} />
      ) : (
        <Path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9Z" />
      );
    case 'fork':
      return (
        <>
          <Circle cx={6.5} cy={6} r={2.5} />
          <Circle cx={17.5} cy={6} r={2.5} />
          <Circle cx={12} cy={18.5} r={2.5} />
          <Path d="M6.5 8.5v1.5a3 3 0 0 0 3 3h5a3 3 0 0 0 3-3V8.5" />
          <Line x1={12} y1={13} x2={12} y2={16} />
        </>
      );
    case 'commit':
      return (
        <>
          <Circle cx={12} cy={12} r={3.5} />
          <Line x1={3} y1={12} x2={8.5} y2={12} />
          <Line x1={15.5} y1={12} x2={21} y2={12} />
        </>
      );
    case 'branch':
      return (
        <>
          <Circle cx={7} cy={5.5} r={2.5} />
          <Circle cx={7} cy={18.5} r={2.5} />
          <Circle cx={17} cy={8.5} r={2.5} />
          <Line x1={7} y1={8} x2={7} y2={16} />
          <Path d="M17 11v1a4 4 0 0 1-4 4H9.5" />
        </>
      );
    case 'repo':
      return (
        <>
          <Path d="M6 3.5h9.5L19 7v11.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" />
          <Path d="M15 3.5V7h4" />
        </>
      );
    case 'pulse':
      return <Path d="M3 12h4l2.5-6 4 12 2.5-6H21" />;
    case 'bell':
      return (
        <>
          <Path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 15 18 9Z" />
          <Path d="M10.3 20a2 2 0 0 0 3.4 0" />
        </>
      );
    case 'check':
      return <Polyline points="4.5 12.5 9.5 17.5 19.5 6.5" />;
    case 'close':
      return (
        <>
          <Line x1={5.5} y1={5.5} x2={18.5} y2={18.5} />
          <Line x1={18.5} y1={5.5} x2={5.5} y2={18.5} />
        </>
      );
    case 'chevron-right':
      return <Polyline points="9.5 5 16.5 12 9.5 19" />;
    case 'external-link':
      return (
        <>
          <Path d="M14 4.5h5.5V10" />
          <Line x1={19.5} y1={4.5} x2={11} y2={13} />
          <Path d="M18 14.5v4a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
        </>
      );
    case 'refresh':
      return (
        <>
          <Path d="M20 12a8 8 0 1 1-2.6-5.9" />
          <Polyline points="20 3.5 20 7.5 16 7.5" />
        </>
      );
    case 'sliders':
      return (
        <>
          <Line x1={4} y1={7} x2={20} y2={7} />
          <Line x1={4} y1={12} x2={20} y2={12} />
          <Line x1={4} y1={17} x2={20} y2={17} />
          <Circle cx={9} cy={7} r={2} fill={color} stroke="none" />
          <Circle cx={15} cy={12} r={2} fill={color} stroke="none" />
          <Circle cx={8} cy={17} r={2} fill={color} stroke="none" />
        </>
      );
    default:
      return null;
  }
}

export function Icon({
  name,
  size = 20,
  color = 'currentColor',
  strokeWidth = 1.8,
  filled = false,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Glyph name={name} filled={filled} color={color} />
      </G>
    </Svg>
  );
}

export const ICON_NAMES: IconName[] = [
  'compass',
  'user',
  'inbox',
  'profile',
  'sun',
  'moon',
  'search',
  'star',
  'fork',
  'commit',
  'branch',
  'repo',
  'pulse',
  'bell',
  'check',
  'close',
  'chevron-right',
  'external-link',
  'refresh',
  'sliders',
];

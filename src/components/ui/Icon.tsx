import type { ReactNode } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'search'
  | 'moon'
  | 'location'
  | 'star'
  | 'repo'
  | 'home'
  | 'users'
  | 'history'
  | 'arrow'
  | 'github'
  | 'message'
  | 'briefcase'
  | 'download'
  | 'filter'
  | 'check'
  | 'send'
  | 'bookmark'
  | 'chart'
  | 'plus'
  | 'close';

export type IconProps = {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
};

/** Icon set from design.md §7 — identical paths, 24×24 viewBox. */
export function Icon({ name, size = 20, color, strokeWidth = 1.8 }: IconProps) {
  const paths: Record<IconName, ReactNode> = {
    search: (
      <>
        <Circle cx="11" cy="11" r="7" />
        <Path d="m20 20-4-4" />
      </>
    ),
    moon: <Path d="M21 15.3A9 9 0 1 1 8.7 3a7 7 0 0 0 12.3 12.3Z" />,
    location: (
      <>
        <Path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <Circle cx="12" cy="10" r="2.5" />
      </>
    ),
    star: <Path d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5-4.7-4.6 6.5-.9L12 2.5Z" />,
    repo: (
      <>
        <Path d="M5 3h11a2 2 0 0 1 2 2v16H6a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2Z" />
        <Path d="M6 17h12M8 7h6" />
      </>
    ),
    home: (
      <>
        <Path d="m3 11 9-8 9 8" />
        <Path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
    users: (
      <>
        <Circle cx="9" cy="8" r="4" />
        <Path d="M2 21a7 7 0 0 1 14 0M16 4.5a4 4 0 0 1 0 7.5M17 15a6 6 0 0 1 5 6" />
      </>
    ),
    history: (
      <>
        <Path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <Path d="M3 3v5h5M12 7v5l3 2" />
      </>
    ),
    arrow: <Path d="M5 12h14m-5-5 5 5-5 5" />,
    github: (
      <Path
        fill={color}
        stroke="none"
        d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.9c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.8a9.4 9.4 0 0 1 2.5.34c1.91-1.3 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.86V21c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
      />
    ),
    message: <Path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />,
    briefcase: (
      <>
        <Rect x="3" y="7" width="18" height="13" rx="2" />
        <Path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
      </>
    ),
    download: (
      <>
        <Path d="M12 3v12m-5-5 5 5 5-5" />
        <Path d="M5 21h14" />
      </>
    ),
    filter: <Path d="M4 5h16M7 12h10m-7 7h4" />,
    check: <Path d="m5 12 4 4L19 6" />,
    send: (
      <>
        <Path d="m22 2-7 20-4-9-9-4Z" />
        <Path d="M22 2 11 13" />
      </>
    ),
    bookmark: <Path d="M6 3h12v18l-6-4-6 4Z" />,
    chart: <Path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />,
    plus: <Path d="M12 5v14M5 12h14" />,
    close: <Path d="m6 6 12 12M18 6 6 18" />,
  };

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round">
      {paths[name]}
    </Svg>
  );
}

// Stroke icons (same shapes as the web app), drawn with react-native-svg
import Svg, { Circle, Path, Rect } from "react-native-svg";

const Icon = ({ size = 20, color = "#555", children }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </Svg>
);

export const CalendarIcon = (p) => (
  <Icon {...p}>
    <Rect x="3" y="4" width="18" height="18" rx="2" />
    <Path d="M16 2v4M8 2v4M3 10h18" />
  </Icon>
);

export const TicketIcon = (p) => (
  <Icon {...p}>
    <Path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z" />
    <Path d="M13 6v2M13 11v2M13 16v2" />
  </Icon>
);

export const ScanIcon = (p) => (
  <Icon {...p}>
    <Path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
    <Path d="M7 12h10" />
  </Icon>
);

export const LogoutIcon = (p) => (
  <Icon {...p}>
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <Path d="M16 17l5-5-5-5M21 12H9" />
  </Icon>
);

export const ChevronLeftIcon = (p) => (
  <Icon {...p}>
    <Path d="M15 18l-6-6 6-6" />
  </Icon>
);

export const ArrowRightIcon = (p) => (
  <Icon {...p}>
    <Path d="M5 12h14M12 5l7 7-7 7" />
  </Icon>
);

export const ClockIcon = (p) => (
  <Icon {...p}>
    <Circle cx="12" cy="12" r="10" />
    <Path d="M12 6v6l4 2" />
  </Icon>
);

export const PinIcon = (p) => (
  <Icon {...p}>
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <Circle cx="12" cy="10" r="3" />
  </Icon>
);

export const UserIcon = (p) => (
  <Icon {...p}>
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <Circle cx="12" cy="7" r="4" />
  </Icon>
);

const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

const make = (paths) => {
  const Icon = (props) => <svg {...base} {...props}>{paths}</svg>
  return Icon
}

export const BookIcon = make(<><path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2" /><path d="M8 7h7" /></>)
export const CheckIcon = make(<><rect x="3" y="3" width="18" height="18" rx="4" /><path d="m8 12 3 3 5-6" /></>)
export const SearchIcon = make(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>)
export const PencilIcon = make(<><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></>)
export const TrashIcon = make(<><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13M9 7V4h6v3" /></>)
export const SparkleIcon = make(<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />)
export const XIcon = make(<path d="M6 6l12 12M18 6 6 18" />)
export const HeartIcon = make(<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z" />)
export const CalendarIcon = make(<><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></>)
export const HomeIcon = make(<><path d="M4 11 12 4l8 7" /><path d="M6 10v10h12V10" /><path d="M10 20v-5h4v5" /></>)
export const PulseIcon = make(<path d="M3 12h4l2-5 4 10 2-5h6" />)
export const MoonIcon = make(<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />)
export const BoltIcon = make(<path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z" />)
export const ForkIcon = make(<><path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8a2 2 0 0 1-2 2M9 3v6" /><path d="M17 21V3c-2 1-3 4-3 7s1 4 3 4" /></>)
export const TrendIcon = make(<><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>)
export const TargetIcon = make(<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></>)
export const TrophyIcon = make(<><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M9.5 17h5" /></>)
export const WatchIcon = make(<><rect x="6" y="6" width="12" height="12" rx="3" /><path d="M9 6l.6-3h4.8L15 6M9 18l.6 3h4.8L15 18M12 9.5V12l1.5 1.5" /></>)
export const GearIcon = make(<><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>)
export const PlusIcon = make(<path d="M12 5v14M5 12h14" />)
export const ScaleIcon = make(<><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><path d="M8.5 9.5a5 5 0 0 1 7 0L12 12" /></>)
export const LeafIcon = make(<><path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15" /><path d="M5 19c3-4 6-6 9-8" /></>)
export const ListIcon = make(<><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3.5 6 1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2" /></>)
export const ChevronLeft = make(<path d="m15 6-6 6 6 6" />)
export const ChevronRight = make(<path d="m9 6 6 6-6 6" />)
export const ChevronDown = make(<path d="m6 9 6 6 6-6" />)
export const BluetoothIcon = make(<path d="m7 7 10 10-5 4V3l5 4L7 17" />)
export const UploadIcon = make(<><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></>)
export const DownloadIcon = make(<><path d="M12 4v12M7 11l5 5 5-5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></>)
export const FlameIcon = make(<path d="M12 21c-4 0-7-3-7-7 0-3 2-5 3-7 1 2 2 3 3 3 0-3 1-5 3-7 1 3 5 6 5 11 0 4-3 7-7 7Z" />)
export const PlayIcon = make(<path d="M7 5v14l12-7L7 5Z" />)
export const PauseIcon = make(<path d="M8 5v14M16 5v14" />)
export const StopIcon = make(<rect x="6" y="6" width="12" height="12" rx="2" />)
export const PinIcon = make(<><path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11Z" /><circle cx="12" cy="10" r="2.2" /></>)
export const GridIcon = make(<><rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" /></>)
export const DropIcon = make(<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />)
export const TableIcon = make(<><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10" /></>)
export const ArrowUp = make(<path d="M12 19V5M6 11l6-6 6 6" />)
export const ArrowDown = make(<path d="M12 5v14M6 13l6 6 6-6" />)
export const MicIcon = make(<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" /></>)
export const SendIcon = make(<path d="M4 12 20 4l-6 16-2.5-6.5L4 12Z" />)
export const SpeakerIcon = make(<><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></>)
export const ChatIcon = make(<><path d="M5 18.5V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8.5L5 18.5Z" /><path d="M9 9h6M9 12.5h4" /></>)
export const ReportIcon = make(<><path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" /><path d="M14 3.5V8h4M8.5 17v-3M12 17v-5.5M15.5 17v-2" /></>)
export const PrintIcon = make(<><path d="M7 8V3.5h10V8M7 17H5a1.5 1.5 0 0 1-1.5-1.5v-5A2.5 2.5 0 0 1 6 8h12a2.5 2.5 0 0 1 2.5 2.5v5A1.5 1.5 0 0 1 19 17h-2" /><rect x="7" y="14" width="10" height="6.5" rx="1" /></>)

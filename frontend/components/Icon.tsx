const PATHS: Record<string, string> = {
  interior: "M4 11V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3M2.5 13a2 2 0 0 1 4 0v2h11v-2a2 2 0 0 1 4 0v5h-19zM5 18v2M19 18v2",
  exterior: "M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5M10 20v-6h4v6",
  paisajismo: "M12 21v-8M12 13c-4 0-6-2.5-6-6 3.5 0 6 2 6 6zm0 0c0-4 2.5-6 6-6 0 3.5-2 6-6 6zM5 21h14",
  obra: "M4 16a8 8 0 0 1 16 0M2.5 16h19v2.5h-19zM10 8.3V5h4v3.3",
  mejorar: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
  renders: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  home: "M15 18l-6-6 6-6",
  upload: "M12 16V5M7.5 9.5 12 5l4.5 4.5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3",
  brush: "M14.5 4.5l5 5L10 19H5v-5zM12.5 6.5l5 5",
  compare: "M12 3v18M4 6h5v12H4zM15 6h5v12h-5z",
  download: "M12 4v11M7.5 10.5 12 15l4.5-4.5M4 20h16",
  plus: "M12 5v14M5 12h14",
  check: "M5 12.5 10 17.5 19 7",
  alert: "M12 4 2.5 20h19zM12 10v4.5M12 17.5v.5",
  x: "M6 6l12 12M18 6 6 18",
};

export default function Icon({ name, size = 20 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

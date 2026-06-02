type Props = { size?: number; className?: string };

export default function Logo({ size = 28, className = "" }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={"shrink-0 " + className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bp-logo-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc933" />
          <stop offset="1" stopColor="#ff8a00" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" ry="14" fill="url(#bp-logo-bg)" />
      <circle
        cx="32"
        cy="32"
        r="17"
        fill="none"
        stroke="#0d0f15"
        strokeWidth="3.5"
      />
      <circle cx="32" cy="32" r="5" fill="#0d0f15" />
      <line
        x1="32"
        y1="6"
        x2="32"
        y2="18"
        stroke="#0d0f15"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <line
        x1="32"
        y1="46"
        x2="32"
        y2="58"
        stroke="#0d0f15"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <line
        x1="6"
        y1="32"
        x2="18"
        y2="32"
        stroke="#0d0f15"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <line
        x1="46"
        y1="32"
        x2="58"
        y2="32"
        stroke="#0d0f15"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

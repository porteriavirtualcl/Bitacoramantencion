export const Logo = ({ className = "w-20 h-20" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Corners */}
    <path d="M20 40V28C20 23.5817 23.5817 20 28 20H40" stroke="#00AEEF" strokeWidth="8" strokeLinecap="round"/>
    <path d="M60 20H72C76.4183 20 80 23.5817 80 28V40" stroke="#00AEEF" strokeWidth="8" strokeLinecap="round"/>
    <path d="M80 60V72C80 76.4183 76.4183 80 72 80H60" stroke="#00AEEF" strokeWidth="8" strokeLinecap="round"/>
    <path d="M40 80H28C23.5817 80 20 76.4183 20 72V60" stroke="#00AEEF" strokeWidth="8" strokeLinecap="round"/>
    
    {/* Headset */}
    <path d="M35 55C35 46.7157 41.7157 40 50 40C58.2843 40 65 46.7157 65 55" stroke="#808285" strokeWidth="6" strokeLinecap="round"/>
    <rect x="32" y="52" width="6" height="12" rx="2" fill="#808285"/>
    <rect x="62" y="52" width="6" height="12" rx="2" fill="#808285"/>
    <path d="M38 62C38 62 42 68 50 68" stroke="#808285" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

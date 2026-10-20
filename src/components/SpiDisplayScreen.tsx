import React from 'react';

export interface ConnectedUserSession {
  id: string;
  name: string;
  userIconType: 'person' | 'phone';
  activityLabel: string;
  activityIconType: 'web' | 'sync';
  time: string;
}

export interface CloudPiTelemetry {
  title: string;
  subtitle: string;
  online: boolean;
  cpuPercent: number;
  tempCelsius: number;
  ramUsedGb: number;
  ramTotalGb: number;
  storageUsedGb: number;
  storageTotalGb: number;
  users: ConnectedUserSession[];
  lanIp: string;
  tailscaleStatus: 'OK' | 'RELAY' | 'OFF';
}

interface SpiDisplayScreenProps {
  data: CloudPiTelemetry;
  selectedWidget?: string | null;
  onSelectWidget?: (widget: string) => void;
  kioskFullscreen?: boolean;
}

export const SpiDisplayScreen: React.FC<SpiDisplayScreenProps> = ({
  data,
  selectedWidget,
  onSelectWidget,
  kioskFullscreen = false,
}) => {
  const ramPercent = Math.min(100, Math.max(4, (data.ramUsedGb / Math.max(0.1, data.ramTotalGb)) * 100));
  const storagePercent = Math.min(100, Math.max(4, (data.storageUsedGb / Math.max(1, data.storageTotalGb)) * 100));
  const cpuClamped = Math.min(100, Math.max(2, data.cpuPercent));

  // Color shifts only when user tests extreme stress (>80°C), otherwise exact reference neon green
  const tempColor = data.tempCelsius >= 78 ? '#FF5555' : data.tempCelsius >= 68 ? '#FBBF24' : '#12E86B';

  return (
    <div
      className={`relative select-none overflow-hidden font-pi-ui ${
        kioskFullscreen ? 'w-full h-full' : 'w-full aspect-[3/2]'
      }`}
      style={{
        background: 'radial-gradient(120% 100% at 50% 15%, #0B213F 0%, #07162C 60%, #051122 100%)',
      }}
    >
      {/* Main 480x320 proportional grid container */}
      <div className="w-full h-full flex flex-col justify-between px-[3.6%] py-[3.2%]">
        
        {/* 1. HEADER ROW: Nextcloud Logo + CLOUD PI + ONLINE */}
        <div
          onClick={() => onSelectWidget?.('header')}
          className={`flex items-center justify-between px-1 py-0.5 rounded-lg transition-colors ${
            onSelectWidget ? 'cursor-pointer hover:bg-white/[0.02]' : ''
          } ${selectedWidget === 'header' ? 'ring-1 ring-sky-400/50 bg-sky-500/5' : ''}`}
        >
          <div className="flex items-center gap-[3.5%]">
            {/* Exact Nextcloud 3-Rings SVG Logo */}
            <svg
              viewBox="0 0 132 64"
              className="w-[19%] min-w-[78px] max-w-[116px] h-auto shrink-0"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Left Circle */}
              <circle cx="24" cy="34" r="15" stroke="#0095FF" strokeWidth="10.5" />
              {/* Right Circle */}
              <circle cx="108" cy="34" r="15" stroke="#0095FF" strokeWidth="10.5" />
              {/* Center Larger Circle */}
              <circle cx="66" cy="32" r="22" stroke="#0095FF" strokeWidth="11.5" />
            </svg>

            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-4 sm:gap-6">
                <span className="font-pi-title font-bold text-white text-[clamp(1.25rem,3.4vw,2.25rem)] leading-none tracking-[0.06em] whitespace-nowrap">
                  {data.title}
                </span>

                {/* ONLINE Status */}
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <span
                    className="w-[clamp(0.65rem,1.5vw,1rem)] h-[clamp(0.65rem,1.5vw,1rem)] rounded-full shrink-0"
                    style={{
                      backgroundColor: data.online ? '#12E86B' : '#F43F5E',
                      boxShadow: data.online ? '0 0 10px rgba(18, 232, 107, 0.45)' : '0 0 10px rgba(244, 63, 94, 0.45)',
                    }}
                  />
                  <span
                    className="font-bold tracking-[0.05em] text-[clamp(0.85rem,2.1vw,1.35rem)] leading-none whitespace-nowrap"
                    style={{ color: data.online ? '#12E86B' : '#F43F5E' }}
                  >
                    {data.online ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
              </div>

              <span className="text-[#84B8E8] font-medium text-[clamp(0.8rem,1.9vw,1.25rem)] leading-tight mt-0.5 tracking-wide">
                {data.subtitle}
              </span>
            </div>
          </div>
        </div>

        {/* 2. 2x2 METRICS GRID: CPU, TEMP, RAM, STORAGE */}
        <div className="grid grid-cols-2 gap-x-[2.6%] gap-y-[6%] my-[1%]">
          
          {/* CARD 1: CPU */}
          <div
            onClick={() => onSelectWidget?.('cpu')}
            className={`relative rounded-[14px] bg-[#081A33]/90 border-[1.5px] border-[#1A3B63] px-[5.5%] py-[4.5%] flex flex-col justify-between transition-all ${
              onSelectWidget ? 'cursor-pointer hover:border-[#295A94]' : ''
            } ${selectedWidget === 'cpu' ? 'ring-1 ring-[#12E86B]/60 border-[#12E86B]/60' : ''}`}
            style={{
              boxShadow: 'inset 0 1px 0 0 rgba(120, 185, 255, 0.08)',
            }}
          >
            <div className="flex items-center">
              {/* CPU Icon */}
              <div className="w-[26%] flex items-center justify-center pr-[4%]">
                <svg viewBox="0 0 56 56" className="w-[clamp(2rem,4.6vw,3.1rem)] h-[clamp(2rem,4.6vw,3.1rem)]" fill="none">
                  {/* Top pins */}
                  <path d="M19 6V13M28 6V13M37 6V13" stroke="#12E86B" strokeWidth="3.6" strokeLinecap="round" />
                  {/* Bottom pins */}
                  <path d="M19 43V50M28 43V50M37 43V50" stroke="#12E86B" strokeWidth="3.6" strokeLinecap="round" />
                  {/* Left pins */}
                  <path d="M6 19H13M6 28H13M6 37H13" stroke="#12E86B" strokeWidth="3.6" strokeLinecap="round" />
                  {/* Right pins */}
                  <path d="M43 19H50M43 28H50M43 37H50" stroke="#12E86B" strokeWidth="3.6" strokeLinecap="round" />
                  {/* Chip Body */}
                  <rect x="13" y="13" width="30" height="30" rx="4" stroke="#12E86B" strokeWidth="3.6" />
                </svg>
              </div>

              {/* Vertical Divider */}
              <div className="h-[clamp(2.2rem,5vw,3.3rem)] w-[1.5px] bg-[#19385E] mx-[4%]" />

              {/* Label & Metric */}
              <div className="flex flex-col pl-[2%]">
                <span className="text-[#85B8E6] font-semibold text-[clamp(0.7rem,1.6vw,1.05rem)] tracking-[0.05em] uppercase leading-tight">
                  CPU
                </span>
                <span className="text-white font-extrabold tabular-nums text-[clamp(1.25rem,3.1vw,2.05rem)] leading-tight mt-0.5">
                  {data.cpuPercent}%
                </span>
              </div>
            </div>

            {/* Bottom Progress Bar */}
            <div className="mt-[4.5%] pl-[18%] pr-[2%]">
              <div className="w-full h-[clamp(6px,1.1vw,10px)] bg-[#1C3554] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${cpuClamped}%`,
                    backgroundColor: '#12E86B',
                    boxShadow: '0 0 8px rgba(18, 232, 107, 0.5)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* CARD 2: TEMP */}
          <div
            onClick={() => onSelectWidget?.('temp')}
            className={`relative rounded-[14px] bg-[#081A33]/90 border-[1.5px] border-[#1A3B63] px-[5.5%] py-[4.5%] flex flex-col justify-center transition-all ${
              onSelectWidget ? 'cursor-pointer hover:border-[#295A94]' : ''
            } ${selectedWidget === 'temp' ? 'ring-1 ring-[#12E86B]/60 border-[#12E86B]/60' : ''}`}
            style={{
              boxShadow: 'inset 0 1px 0 0 rgba(120, 185, 255, 0.08)',
            }}
          >
            <div className="flex items-center my-auto">
              {/* Thermometer Icon */}
              <div className="w-[26%] flex items-center justify-center pr-[4%]">
                <svg viewBox="0 0 56 56" className="w-[clamp(2rem,4.6vw,3.1rem)] h-[clamp(2rem,4.6vw,3.1rem)]" fill="none">
                  <path
                    d="M23 13C23 10.2386 25.2386 8 28 8C30.7614 8 33 10.2386 33 13V31.2C35.9 32.95 37.8 36.15 37.8 39.8C37.8 45.32 33.41 49.8 28 49.8C22.59 49.8 18.2 45.32 18.2 39.8C18.2 36.15 20.1 32.95 23 31.2V13Z"
                    stroke={tempColor}
                    strokeWidth="3.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="28" cy="39.8" r="4.8" fill={tempColor} />
                  <path d="M28 24V36" stroke={tempColor} strokeWidth="3.6" strokeLinecap="round" />
                </svg>
              </div>

              {/* Vertical Divider */}
              <div className="h-[clamp(2.2rem,5vw,3.3rem)] w-[1.5px] bg-[#19385E] mx-[4%]" />

              {/* Label & Metric */}
              <div className="flex flex-col pl-[2%]">
                <span className="text-[#85B8E6] font-semibold text-[clamp(0.7rem,1.6vw,1.05rem)] tracking-[0.05em] uppercase leading-tight">
                  TEMP
                </span>
                <span className="text-white font-extrabold tabular-nums text-[clamp(1.25rem,3.1vw,2.05rem)] leading-tight mt-0.5">
                  {data.tempCelsius}°C
                </span>
              </div>
            </div>
          </div>

          {/* CARD 3: RAM */}
          <div
            onClick={() => onSelectWidget?.('ram')}
            className={`relative rounded-[14px] bg-[#081A33]/90 border-[1.5px] border-[#1A3B63] px-[5.5%] py-[4.5%] flex flex-col justify-between transition-all ${
              onSelectWidget ? 'cursor-pointer hover:border-[#295A94]' : ''
            } ${selectedWidget === 'ram' ? 'ring-1 ring-[#00C8FF]/60 border-[#00C8FF]/60' : ''}`}
            style={{
              boxShadow: 'inset 0 1px 0 0 rgba(120, 185, 255, 0.08)',
            }}
          >
            <div className="flex items-center">
              {/* RAM Stick Icon */}
              <div className="w-[26%] flex items-center justify-center pr-[4%]">
                <svg viewBox="0 0 64 52" className="w-[clamp(2.1rem,4.9vw,3.3rem)] h-[clamp(1.8rem,4.2vw,2.8rem)]" fill="none">
                  {/* RAM Stick Outer Body */}
                  <rect x="5" y="12" width="54" height="24" rx="3.5" stroke="#00C8FF" strokeWidth="3.6" />
                  {/* Internal memory chips */}
                  <path d="M16 19V29M26 19V29M38 19V29M48 19V29" stroke="#00C8FF" strokeWidth="3.4" strokeLinecap="round" />
                  {/* Bottom contact pins */}
                  <path d="M13 36V43M23 36V43M32 36V43M41 36V43M51 36V43" stroke="#00C8FF" strokeWidth="3.6" strokeLinecap="round" />
                </svg>
              </div>

              {/* Vertical Divider */}
              <div className="h-[clamp(2.2rem,5vw,3.3rem)] w-[1.5px] bg-[#19385E] mx-[4%]" />

              {/* Label & Metric */}
              <div className="flex flex-col pl-[2%] min-w-0">
                <span className="text-[#85B8E6] font-semibold text-[clamp(0.7rem,1.6vw,1.05rem)] tracking-[0.05em] uppercase leading-tight">
                  RAM
                </span>
                <span className="text-white font-extrabold tabular-nums text-[clamp(1.05rem,2.6vw,1.75rem)] leading-tight mt-0.5 whitespace-nowrap">
                  {data.ramUsedGb.toFixed(1)} / {data.ramTotalGb.toFixed(1)} GB
                </span>
              </div>
            </div>

            {/* Bottom Progress Bar */}
            <div className="mt-[4.5%] pl-[18%] pr-[2%]">
              <div className="w-full h-[clamp(6px,1.1vw,10px)] bg-[#1C3554] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${ramPercent}%`,
                    backgroundColor: '#00C8FF',
                    boxShadow: '0 0 8px rgba(0, 200, 255, 0.5)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* CARD 4: STORAGE */}
          <div
            onClick={() => onSelectWidget?.('storage')}
            className={`relative rounded-[14px] bg-[#081A33]/90 border-[1.5px] border-[#1A3B63] px-[5.5%] py-[4.5%] flex flex-col justify-between transition-all ${
              onSelectWidget ? 'cursor-pointer hover:border-[#295A94]' : ''
            } ${selectedWidget === 'storage' ? 'ring-1 ring-[#00C8FF]/60 border-[#00C8FF]/60' : ''}`}
            style={{
              boxShadow: 'inset 0 1px 0 0 rgba(120, 185, 255, 0.08)',
            }}
          >
            <div className="flex items-center">
              {/* Storage Cylinder Database Icon */}
              <div className="w-[26%] flex items-center justify-center pr-[4%]">
                <svg viewBox="0 0 56 56" className="w-[clamp(2rem,4.6vw,3.1rem)] h-[clamp(2rem,4.6vw,3.1rem)]" fill="none">
                  <ellipse cx="28" cy="14" rx="15" ry="6.5" stroke="#00C8FF" strokeWidth="3.5" />
                  <path d="M13 14V41C13 44.6 19.7 47.5 28 47.5C36.3 47.5 43 44.6 43 41V14" stroke="#00C8FF" strokeWidth="3.5" />
                  <path d="M13 27.5C13 31.1 19.7 34 28 34C36.3 34 43 31.1 43 27.5" stroke="#00C8FF" strokeWidth="3.5" />
                </svg>
              </div>

              {/* Vertical Divider */}
              <div className="h-[clamp(2.2rem,5vw,3.3rem)] w-[1.5px] bg-[#19385E] mx-[4%]" />

              {/* Label & Metric */}
              <div className="flex flex-col pl-[2%] min-w-0">
                <span className="text-[#85B8E6] font-semibold text-[clamp(0.7rem,1.6vw,1.05rem)] tracking-[0.05em] uppercase leading-tight">
                  STORAGE
                </span>
                <span className="text-white font-extrabold tabular-nums text-[clamp(1.05rem,2.6vw,1.75rem)] leading-tight mt-0.5 whitespace-nowrap">
                  {data.storageUsedGb} / {data.storageTotalGb} GB
                </span>
              </div>
            </div>

            {/* Bottom Progress Bar (Green in reference image) */}
            <div className="mt-[4.5%] pl-[18%] pr-[2%]">
              <div className="w-full h-[clamp(6px,1.1vw,10px)] bg-[#1C3554] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${storagePercent}%`,
                    backgroundColor: '#12E86B',
                    boxShadow: '0 0 8px rgba(18, 232, 107, 0.5)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. CONNECTED USERS PANEL */}
        <div
          onClick={() => onSelectWidget?.('users')}
          className={`rounded-[14px] bg-[#081A33]/90 border-[1.5px] border-[#1A3B63] px-[3.2%] py-[2.2%] flex flex-col justify-between transition-all ${
            onSelectWidget ? 'cursor-pointer hover:border-[#295A94]' : ''
          } ${selectedWidget === 'users' ? 'ring-1 ring-sky-400/60 border-sky-400/60' : ''}`}
          style={{
            boxShadow: 'inset 0 1px 0 0 rgba(120, 185, 255, 0.08)',
          }}
        >
          <div className="pb-[1.2%] border-b border-[#153154]">
            <span className="text-[#85B8E6] font-semibold text-[clamp(0.68rem,1.5vw,0.98rem)] tracking-[0.08em] uppercase">
              CONNECTED USERS
            </span>
          </div>

          <div className="divide-y divide-[#153154]">
            {data.users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between py-[1.4%] text-[clamp(0.82rem,1.85vw,1.2rem)]"
              >
                <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                  {/* User or Phone Icon */}
                  <div className="w-[clamp(1.25rem,2.6vw,1.75rem)] flex items-center justify-center shrink-0">
                    {u.userIconType === 'person' ? (
                      <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
                        <circle cx="16" cy="10" r="5.5" fill="#12E86B" />
                        <path
                          d="M6.5 26.5C6.5 21.8 10.6 18.5 16 18.5C21.4 18.5 25.5 21.8 25.5 26.5"
                          fill="#12E86B"
                        />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
                        <rect x="9" y="4" width="14" height="24" rx="2.5" stroke="#00C8FF" strokeWidth="2.8" />
                        <circle cx="16" cy="23.5" r="1.3" fill="#00C8FF" />
                      </svg>
                    )}
                  </div>

                  {/* User Name */}
                  <span className="font-bold text-white tracking-wide w-[clamp(3.6rem,8vw,5.5rem)] truncate">
                    {u.name}
                  </span>

                  {/* Bullet dot */}
                  <span className="text-[#568EC4] text-lg leading-none select-none">•</span>

                  {/* Activity Icon + Label */}
                  <div className="flex items-center gap-2.5 sm:gap-3.5 pl-1">
                    {u.activityIconType === 'web' ? (
                      <svg
                        viewBox="0 0 32 32"
                        className="w-[clamp(1.15rem,2.4vw,1.6rem)] h-[clamp(1.15rem,2.4vw,1.6rem)] shrink-0"
                        fill="none"
                      >
                        <rect x="4" y="6" width="24" height="16" rx="2" stroke="#63A8EE" strokeWidth="2.6" />
                        <path d="M12 26H20M16 22V26" stroke="#63A8EE" strokeWidth="2.6" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 32 32"
                        className="w-[clamp(1.15rem,2.4vw,1.6rem)] h-[clamp(1.15rem,2.4vw,1.6rem)] shrink-0"
                        fill="none"
                      >
                        <path
                          d="M7 14C7.8 9.8 11.5 6.8 16 6.8C19.6 6.8 22.7 8.8 24.2 11.8M25 18C24.2 22.2 20.5 25.2 16 25.2C12.4 25.2 9.3 23.2 7.8 20.2"
                          stroke="#00C8FF"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                        />
                        <path d="M21 12H25V8" stroke="#00C8FF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M11 20H7V24" stroke="#00C8FF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    <span className="text-[#85B8E6] font-medium">{u.activityLabel}</span>
                  </div>
                </div>

                {/* Right Timestamp */}
                <span className="text-[#85B8E6] font-medium tabular-nums tracking-wider">
                  {u.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 4. BOTTOM NETWORK & TAILSCALE BAR */}
        <div
          onClick={() => onSelectWidget?.('network')}
          className={`flex items-center px-1.5 pt-[0.5%] rounded-lg transition-colors ${
            onSelectWidget ? 'cursor-pointer hover:bg-white/[0.02]' : ''
          } ${selectedWidget === 'network' ? 'ring-1 ring-sky-400/50 bg-sky-500/5' : ''}`}
        >
          {/* Left: LAN IP */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <svg
              viewBox="0 0 32 32"
              className="w-[clamp(1.15rem,2.5vw,1.65rem)] h-[clamp(1.15rem,2.5vw,1.65rem)] shrink-0"
              fill="none"
            >
              <rect x="12" y="4" width="8" height="6" rx="1" stroke="#63A8EE" strokeWidth="2.5" />
              <rect x="5" y="21" width="8" height="6" rx="1" stroke="#63A8EE" strokeWidth="2.5" />
              <rect x="19" y="21" width="8" height="6" rx="1" stroke="#63A8EE" strokeWidth="2.5" />
              <path d="M16 10V16M9 16H23M9 16V21M23 16V21" stroke="#63A8EE" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span className="text-[#85B8E6] font-medium text-[clamp(0.75rem,1.7vw,1.1rem)] tracking-[0.04em] tabular-nums whitespace-nowrap">
              LAN {data.lanIp}
            </span>
          </div>

          {/* Divider */}
          <div className="h-[clamp(1rem,2.1vw,1.4rem)] w-[1.5px] bg-[#19385E] mx-[4.5%]" />

          {/* Right: TAILSCALE OK */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <svg
              viewBox="0 0 32 32"
              className="w-[clamp(1.15rem,2.5vw,1.65rem)] h-[clamp(1.15rem,2.5vw,1.65rem)] shrink-0"
              fill="none"
            >
              <path
                d="M16 4L6 8.2V15.5C6 21.9 10.3 27.6 16 29C21.7 27.6 26 21.9 26 15.5V8.2L16 4Z"
                stroke={data.tailscaleStatus === 'OK' ? '#12E86B' : '#FBBF24'}
                strokeWidth="2.7"
                strokeLinejoin="round"
              />
              <circle
                cx="16"
                cy="16"
                r="2.6"
                fill={data.tailscaleStatus === 'OK' ? '#12E86B' : '#FBBF24'}
              />
            </svg>
            <span className="text-[#85B8E6] font-medium text-[clamp(0.75rem,1.7vw,1.1rem)] tracking-[0.05em] uppercase whitespace-nowrap">
              TAILSCALE{' '}
              <strong
                className="font-bold ml-1"
                style={{ color: data.tailscaleStatus === 'OK' ? '#12E86B' : '#FBBF24' }}
              >
                {data.tailscaleStatus}
              </strong>
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

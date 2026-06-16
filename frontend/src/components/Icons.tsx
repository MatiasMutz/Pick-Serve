// Material Symbols wrapper
function MatIcon({ name, fill = false, size = 20 }: { name: string; fill?: boolean; size?: number }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: size,
        fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0",
        userSelect: 'none',
      }}
    >
      {name}
    </span>
  );
}

interface IconProps { size?: number; className?: string; }

export const IconHome    = ({ size = 20 }: IconProps) => <MatIcon name="home" size={size} />;
export const IconTrophy  = ({ size = 20 }: IconProps) => <MatIcon name="emoji_events" size={size} />;
export const IconBell    = ({ size = 20 }: IconProps) => <MatIcon name="notifications" size={size} />;
export const IconChart   = ({ size = 20 }: IconProps) => <MatIcon name="query_stats" size={size} />;
export const IconLogout  = ({ size = 20 }: IconProps) => <MatIcon name="logout" size={size} />;
export const IconShield  = ({ size = 20 }: IconProps) => <MatIcon name="admin_panel_settings" size={size} />;
export const IconLock    = ({ size = 20 }: IconProps) => <MatIcon name="lock" size={size} />;
export const IconCheck   = ({ size = 20 }: IconProps) => <MatIcon name="check_circle" fill size={size} />;
export const IconRefresh = ({ size = 20 }: IconProps) => <MatIcon name="refresh" size={size} />;
export const IconArrowUp    = ({ size = 20 }: IconProps) => <MatIcon name="arrow_upward" size={size} />;
export const IconArrowDown  = ({ size = 20 }: IconProps) => <MatIcon name="arrow_downward" size={size} />;
export const IconChevronRight = ({ size = 20 }: IconProps) => <MatIcon name="chevron_right" size={size} />;
export const IconUser    = ({ size = 20 }: IconProps) => <MatIcon name="account_circle" size={size} />;
export const IconSettings = ({ size = 20 }: IconProps) => <MatIcon name="settings" size={size} />;
export const IconX       = ({ size = 20 }: IconProps) => <MatIcon name="close" size={size} />;

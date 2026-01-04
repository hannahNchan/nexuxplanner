import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { fontAwesomeIcons } from "./IconPicker";

type IconRendererProps = {
  icon: string | null;
  color?: string | null;
  size?: number;
};

const IconRenderer = ({ icon, color, size = 16 }: IconRendererProps) => {
  if (!icon) return <span>?</span>;

  if (fontAwesomeIcons[icon]) {
    return (
      <FontAwesomeIcon
        icon={fontAwesomeIcons[icon]}
        style={{
          fontSize: size,
          color: color || undefined,
        }}
      />
    );
  }

  return <span style={{ fontSize: size }}>{icon}</span>;
};

export default IconRenderer;
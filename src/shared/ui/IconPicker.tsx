import { useState } from "react";
import {
  Popover,
  Box,
  TextField,
  InputAdornment,
  Grid,
  IconButton,
  Tabs,
  Tab,
  Stack,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBug,
  faCheckCircle,
  faBook,
  faBolt,
  faCircle,
  faSquare,
  faHeart,
  faStar,
  faFire,
  faRocket,
  faFlag,
  faCog,
  faUser,
  faEnvelope,
  faPhone,
  faHome,
  faCalendar,
  faCamera,
  faClock,
  faComment,
  faEdit,
  faTrash,
  faDownload,
  faUpload,
  faPlus,
  faMinus,
  faCheck,
  faTimes,
  faArrowRight,
  faArrowLeft,
  faExclamationTriangle,
  faInfoCircle,
  faQuestionCircle,
  faLightbulb,
  faGift,
  faTrophy,
  faMedal,
  faChartLine,
  faChartBar,
  faChartPie,
  faDatabase,
  faServer,
  faCode,
  faTerminal,
  faFileCode,
  faBriefcase,
  faClipboard,
  faClipboardList,
  faTasks,
  faCheckDouble,
  faSpinner,
  faSync,
  faCloud,
  faCloudUploadAlt,
  faCloudDownloadAlt,
  faBell,
  faBellSlash,
  faEye,
  faEyeSlash,
  faLock,
  faUnlock,
  faKey,
  faShieldAlt,
  faWrench,
  faTools,
  faHammer,
  faScrewdriver,
  faPaintBrush,
  faPalette,
  faImage,
  faFileImage,
  faFilePdf,
  faFileWord,
  faFileExcel,
  faFilePowerpoint,
  faFileAlt,
  faFolder,
  faFolderOpen,
  faSave,
  faCopy,
  faPaste,
  faCut,
  faPrint,
  faSearch,
  faFilter,
  faSort,
  faSortUp,
  faSortDown,
  faList,
  faListUl,
  faListOl,
  faTable,
  faThLarge,
  faTh,
  faGripVertical,
  faGripHorizontal,
  faBars,
  faEllipsisV,
  faEllipsisH,
  faSlidersH,
  faToggleOn,
  faToggleOff,
  faPowerOff,
  faPlay,
  faPause,
  faStop,
  faStepForward,
  faStepBackward,
  faFastForward,
  faFastBackward,
  faVolumeUp,
  faVolumeDown,
  faVolumeMute,
  faMicrophone,
  faMicrophoneSlash,
  faVideo,
  faVideoSlash,
  faDesktop,
  faLaptop,
  faMobile,
  faTablet,
  faKeyboard,
  faMouse,
  faHeadphones,
  faGamepad,
  faPuzzlePiece,
  faCube,
  faCubes,
  faBox,
  faBoxes,
  faArchive,
  faInbox,
  faPaperPlane,
  faShare,
  faShareAlt,
  faReply,
  faRetweet,
  faRandom,
  faExchangeAlt,
  faLink,
  faUnlink,
  faAnchor,
  faPaperclip,
  faMapPin,
  faMapMarkerAlt,
  faLocationArrow,
  faCompass,
  faGlobe,
  faMap,
  faRoute,
  faCar,
  faBus,
  faTruck,
  faPlane,
  faShip,
  faBicycle,
  faMotorcycle,
  faShoppingCart,
  faShoppingBag,
  faCreditCard,
  faMoneyBill,
  faCoins,
  faWallet,
  faReceipt,
  faPercent,
  faTag,
  faTags,
  faBarcode,
  faQrcode,
  faMagic,
  faCrown,
  faGem,
  faSmile,
  faLaugh,
  faGrin,
  faMeh,
  faFrown,
  faSadTear,
  faAngry,
  faDizzy,
  faTired,
  faSurprise,
  faKiss,
  faThumbsUp,
  faThumbsDown,
  faHandPaper,
  faHandRock,
  faHandPeace,
  faHandPointUp,
  faHandPointDown,
  faHandPointLeft,
  faHandPointRight,
} from "@fortawesome/free-solid-svg-icons";

type IconPickerProps = {
  value: string | null;
  color?: string | null;
  onChange: (iconName: string) => void;
};

const fontAwesomeIcons: Record<string, IconDefinition> = {
  bug: faBug,
  "check-circle": faCheckCircle,
  book: faBook,
  bolt: faBolt,
  circle: faCircle,
  square: faSquare,
  heart: faHeart,
  star: faStar,
  fire: faFire,
  rocket: faRocket,
  flag: faFlag,
  cog: faCog,
  user: faUser,
  envelope: faEnvelope,
  phone: faPhone,
  home: faHome,
  calendar: faCalendar,
  camera: faCamera,
  clock: faClock,
  comment: faComment,
  edit: faEdit,
  trash: faTrash,
  download: faDownload,
  upload: faUpload,
  plus: faPlus,
  minus: faMinus,
  check: faCheck,
  times: faTimes,
  "arrow-right": faArrowRight,
  "arrow-left": faArrowLeft,
  "exclamation-triangle": faExclamationTriangle,
  "info-circle": faInfoCircle,
  "question-circle": faQuestionCircle,
  lightbulb: faLightbulb,
  gift: faGift,
  trophy: faTrophy,
  medal: faMedal,
  "chart-line": faChartLine,
  "chart-bar": faChartBar,
  "chart-pie": faChartPie,
  database: faDatabase,
  server: faServer,
  code: faCode,
  terminal: faTerminal,
  "file-code": faFileCode,
  briefcase: faBriefcase,
  clipboard: faClipboard,
  "clipboard-list": faClipboardList,
  tasks: faTasks,
  "check-double": faCheckDouble,
  spinner: faSpinner,
  sync: faSync,
  cloud: faCloud,
  "cloud-upload": faCloudUploadAlt,
  "cloud-download": faCloudDownloadAlt,
  bell: faBell,
  "bell-slash": faBellSlash,
  eye: faEye,
  "eye-slash": faEyeSlash,
  lock: faLock,
  unlock: faUnlock,
  key: faKey,
  shield: faShieldAlt,
  wrench: faWrench,
  tools: faTools,
  hammer: faHammer,
  screwdriver: faScrewdriver,
  "paint-brush": faPaintBrush,
  palette: faPalette,
  image: faImage,
  "file-image": faFileImage,
  "file-pdf": faFilePdf,
  "file-word": faFileWord,
  "file-excel": faFileExcel,
  "file-powerpoint": faFilePowerpoint,
  "file-alt": faFileAlt,
  folder: faFolder,
  "folder-open": faFolderOpen,
  save: faSave,
  copy: faCopy,
  paste: faPaste,
  cut: faCut,
  print: faPrint,
  search: faSearch,
  filter: faFilter,
  sort: faSort,
  "sort-up": faSortUp,
  "sort-down": faSortDown,
  list: faList,
  "list-ul": faListUl,
  "list-ol": faListOl,
  table: faTable,
  "th-large": faThLarge,
  th: faTh,
  "grip-vertical": faGripVertical,
  "grip-horizontal": faGripHorizontal,
  bars: faBars,
  "ellipsis-v": faEllipsisV,
  "ellipsis-h": faEllipsisH,
  sliders: faSlidersH,
  "toggle-on": faToggleOn,
  "toggle-off": faToggleOff,
  "power-off": faPowerOff,
  play: faPlay,
  pause: faPause,
  stop: faStop,
  "step-forward": faStepForward,
  "step-backward": faStepBackward,
  "fast-forward": faFastForward,
  "fast-backward": faFastBackward,
  "volume-up": faVolumeUp,
  "volume-down": faVolumeDown,
  "volume-mute": faVolumeMute,
  microphone: faMicrophone,
  "microphone-slash": faMicrophoneSlash,
  video: faVideo,
  "video-slash": faVideoSlash,
  desktop: faDesktop,
  laptop: faLaptop,
  mobile: faMobile,
  tablet: faTablet,
  keyboard: faKeyboard,
  mouse: faMouse,
  headphones: faHeadphones,
  gamepad: faGamepad,
  "puzzle-piece": faPuzzlePiece,
  cube: faCube,
  cubes: faCubes,
  box: faBox,
  boxes: faBoxes,
  archive: faArchive,
  inbox: faInbox,
  "paper-plane": faPaperPlane,
  share: faShare,
  "share-alt": faShareAlt,
  reply: faReply,
  retweet: faRetweet,
  random: faRandom,
  exchange: faExchangeAlt,
  link: faLink,
  unlink: faUnlink,
  anchor: faAnchor,
  paperclip: faPaperclip,
  "map-pin": faMapPin,
  "map-marker": faMapMarkerAlt,
  "location-arrow": faLocationArrow,
  compass: faCompass,
  globe: faGlobe,
  map: faMap,
  route: faRoute,
  car: faCar,
  bus: faBus,
  truck: faTruck,
  plane: faPlane,
  ship: faShip,
  bicycle: faBicycle,
  motorcycle: faMotorcycle,
  "shopping-cart": faShoppingCart,
  "shopping-bag": faShoppingBag,
  "credit-card": faCreditCard,
  "money-bill": faMoneyBill,
  coins: faCoins,
  wallet: faWallet,
  receipt: faReceipt,
  percent: faPercent,
  tag: faTag,
  tags: faTags,
  barcode: faBarcode,
  qrcode: faQrcode,
  magic: faMagic,
  crown: faCrown,
  gem: faGem,
  smile: faSmile,
  laugh: faLaugh,
  grin: faGrin,
  meh: faMeh,
  frown: faFrown,
  "sad-tear": faSadTear,
  angry: faAngry,
  dizzy: faDizzy,
  tired: faTired,
  surprise: faSurprise,
  kiss: faKiss,
  "thumbs-up": faThumbsUp,
  "thumbs-down": faThumbsDown,
  "hand-paper": faHandPaper,
  "hand-rock": faHandRock,
  "hand-peace": faHandPeace,
  "hand-point-up": faHandPointUp,
  "hand-point-down": faHandPointDown,
  "hand-point-left": faHandPointLeft,
  "hand-point-right": faHandPointRight,
};

const emojis = [
  "🐛", "✅", "📖", "⚡", "🔥", "🚀", "⭐", "💡", "🎯", "🎨",
  "📝", "📊", "💻", "🔧", "🛠️", "📱", "🌟", "💼", "📅", "🔔",
  "❤️", "👍", "🎉", "🏆", "🎁", "📌", "🔍", "⚙️", "🌈", "☀️",
  "🌙", "💫", "✨", "🔆", "🌍", "🌎", "🌏", "🗺️", "🧭",
  "⛰️", "🏔️", "🌋", "🗻", "🏕️", "🏖️", "🏜️", "🏝️", "🏞️", "🏟️",
];

const IconPicker = ({ value, color, onChange }: IconPickerProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"fontawesome" | "emoji">("fontawesome");

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSearch("");
  };

  const handleSelect = (iconName: string) => {
    onChange(iconName);
    handleClose();
  };

  const filteredFontAwesome = Object.keys(fontAwesomeIcons).filter((name) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredEmojis = emojis.filter((emoji) => emoji.includes(search));

  const renderIcon = () => {
    if (!value) return "?";

    if (fontAwesomeIcons[value]) {
      return (
        <FontAwesomeIcon
          icon={fontAwesomeIcons[value]}
          style={{ color: color || undefined }}
        />
      );
    }

    return value;
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        sx={{
          width: 40,
          height: 40,
          border: "2px solid",
          borderColor: "divider",
          fontSize: 18,
        }}
      >
        {renderIcon()}
      </IconButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <Box sx={{ width: 480, p: 2 }}>
          <Stack spacing={2}>
            <TextField
              size="small"
              fullWidth
              placeholder="Buscar icono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <Tabs value={tab} onChange={(_, newTab) => setTab(newTab)}>
              <Tab label="FontAwesome" value="fontawesome" />
              <Tab label="Emoji" value="emoji" />
            </Tabs>

            <Box sx={{ maxHeight: 400, overflow: "auto" }}>
              {tab === "fontawesome" ? (
                <Grid container spacing={1}>
                  {filteredFontAwesome.map((iconName) => (
                    <Grid item key={iconName}>
                      <IconButton
                        onClick={() => handleSelect(iconName)}
                        sx={{
                          width: 40,
                          height: 40,
                          border: value === iconName ? "2px solid" : "1px solid",
                          borderColor: value === iconName ? "primary.main" : "divider",
                          color: color || "inherit",
                        }}
                      >
                        <FontAwesomeIcon icon={fontAwesomeIcons[iconName]} />
                      </IconButton>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Grid container spacing={1}>
                  {filteredEmojis.map((emoji) => (
                    <Grid item key={emoji}>
                      <IconButton
                        onClick={() => handleSelect(emoji)}
                        sx={{
                          width: 40,
                          height: 40,
                          fontSize: 20,
                          border: value === emoji ? "2px solid" : "1px solid",
                          borderColor: value === emoji ? "primary.main" : "divider",
                        }}
                      >
                        {emoji}
                      </IconButton>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </Stack>
        </Box>
      </Popover>
    </>
  );
};

export default IconPicker;
export { fontAwesomeIcons };
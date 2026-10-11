/**
 * Pictogrammes des composants d'architecture. Les génériques viennent de lucide-react ; les pictogrammes de
 * technologies (PostgreSQL, Redis, Kafka…) sont dessinés ici dans le même gabarit (24 px, trait 1,75) : ce sont des
 * évocations originales, pas des logos officiels. La couleur vient de la famille du composant (`currentColor`).
 */
import {
  Activity,
  Archive,
  Boxes,
  Building2,
  Cog,
  Columns3,
  Copy,
  Cpu,
  CreditCard,
  Crown,
  CircleDot,
  Database,
  File,
  FileText,
  Filter,
  Frame,
  Globe,
  Grid3x3,
  Hash,
  HardDrive,
  KeyRound,
  Layers,
  Leaf,
  List,
  ListTree,
  Mail,
  Merge,
  Monitor,
  Network,
  Rabbit,
  Radio,
  Rows3,
  ScrollText,
  Search,
  Server,
  Share2,
  Shuffle,
  Signpost,
  Smartphone,
  Split,
  Vote,
  Waves,
  Zap,
  Clock,
  DoorOpen,
  type LucideIcon,
} from 'lucide-react'
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>
type IconComponent = LucideIcon | ((props: IconProps) => React.JSX.Element)

function Glyph(props: IconProps & { children: React.ReactNode }) {
  const { children, ...rest } = props
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

const Cylinder = () => (
  <>
    <ellipse cx="12" cy="5.5" rx="7" ry="2.8" />
    <path d="M5 5.5v13c0 1.6 3.1 2.8 7 2.8s7-1.2 7-2.8v-13" />
  </>
)

const Postgres = (p: IconProps) => (
  <Glyph {...p}>
    <Cylinder />
    <path d="M5 12c0 1.6 3.1 2.8 7 2.8s7-1.2 7-2.8" />
    <circle cx="15.6" cy="9" r=".6" fill="currentColor" />
  </Glyph>
)
const Mysql = (p: IconProps) => (
  <Glyph {...p}>
    <Cylinder />
    <path d="M9 17.5c2.4-.4 4-2 4.4-4.3.2-1 .7-1.9 1.6-2.5" />
  </Glyph>
)
const BoltDb = (p: IconProps) => (
  <Glyph {...p}>
    <Cylinder />
    <path d="M12.6 10 10 14h3.2l-1.6 3.6" />
  </Glyph>
)
const FileDb = (p: IconProps) => (
  <Glyph {...p}>
    <path d="M6 3h8l4 4v14H6z" />
    <path d="M14 3v4h4" />
    <ellipse cx="12" cy="13" rx="3" ry="1.3" />
    <path d="M9 13v3.2c0 .8 1.3 1.3 3 1.3s3-.5 3-1.3V13" />
  </Glyph>
)
const Redis = (p: IconProps) => (
  <Glyph {...p}>
    <path d="M12 3 20 6.5 12 10 4 6.5z" />
    <path d="m4 11 8 3.5 8-3.5" />
    <path d="m4 15.5 8 3.5 8-3.5" />
  </Glyph>
)
const Kafka = (p: IconProps) => (
  <Glyph {...p}>
    <circle cx="6" cy="12" r="2.2" />
    <circle cx="17.5" cy="5.8" r="2.2" />
    <circle cx="17.5" cy="18.2" r="2.2" />
    <path d="m8 11 7.6-4M8 13l7.6 4M17.5 8v8" />
  </Glyph>
)
const Ring = (p: IconProps) => (
  <Glyph {...p}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3.2" />
    <circle cx="12" cy="4" r=".8" fill="currentColor" />
  </Glyph>
)
const Graph = (p: IconProps) => (
  <Glyph {...p}>
    <circle cx="5.5" cy="6" r="2.2" />
    <circle cx="18.5" cy="8" r="2.2" />
    <circle cx="12" cy="18" r="2.2" />
    <path d="m7.5 6.6 8.9 1M6.7 8 10.6 16M17.4 10l-4.2 6.2" />
  </Glyph>
)
const Topic = (p: IconProps) => (
  <Glyph {...p}>
    <path d="M3 8h12M3 12h18M3 16h12" />
    <path d="m17 6 4 2-4 2" />
  </Glyph>
)
const Tree = (p: IconProps) => (
  <Glyph {...p}>
    <circle cx="12" cy="5" r="2" />
    <circle cx="6" cy="18" r="2" />
    <circle cx="18" cy="18" r="2" />
    <path d="M11 6.8 7 16.2M13 6.8l4 9.4" />
  </Glyph>
)
const Page = (p: IconProps) => (
  <Glyph {...p}>
    <rect x="4" y="4" width="16" height="16" rx="2.5" />
    <path d="M9.3 4v16M14.7 4v16" />
    <path d="M7 8.5h.01M12 8.5h.01M17 8.5h.01" strokeWidth="2.4" />
  </Glyph>
)
const Gate = (p: IconProps) => (
  <Glyph {...p}>
    <path d="M4 20V8l8-4 8 4v12" />
    <path d="M9 20v-6a3 3 0 0 1 6 0v6" />
  </Glyph>
)
const Bolt = (p: IconProps) => (
  <Glyph {...p}>
    <path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" />
  </Glyph>
)
const Bucket = (p: IconProps) => (
  <Glyph {...p}>
    <path d="M4.5 7.5 6.5 20h11l2-12.5" />
    <ellipse cx="12" cy="7" rx="7.5" ry="2.7" />
  </Glyph>
)

export const ICONS: Record<string, IconComponent> = {
  monitor: Monitor,
  browser: Globe,
  phone: Smartphone,
  globe: Network,
  signpost: Signpost,
  split: Split,
  gate: Gate,
  shuffle: Shuffle,
  server: Server,
  cog: Cog,
  clock: Clock,
  bolt: Bolt,
  waves: Waves,
  database: Database,
  postgres: Postgres,
  mysql: Mysql,
  leaf: Leaf,
  ring: Ring,
  'bolt-db': BoltDb,
  'file-db': FileDb,
  graph: Graph,
  search: Search,
  columns: Columns3,
  zap: Zap,
  redis: Redis,
  chip: Cpu,
  layers: Layers,
  kafka: Kafka,
  rabbit: Rabbit,
  topic: Topic,
  bucket: Bucket,
  disk: HardDrive,
  file: File,
  building: Building2,
  key: KeyRound,
  card: CreditCard,
  mail: Mail,
  pulse: Activity,
  scroll: ScrollText,
  log: FileText,
  hash: Hash,
  tree: Tree,
  rows: Rows3,
  merge: Merge,
  filter: Filter,
  page: Page,
  list: List,
  crown: Crown,
  copy: Copy,
  grid: Grid3x3,
  vote: Vote,
  node: CircleDot,
  frame: Frame,
  door: DoorOpen,
  boxes: Boxes,
  archive: Archive,
  radio: Radio,
  share: Share2,
  tree2: ListTree,
}

export function ComponentIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Boxes
  return <Icon className={className} />
}

import type { SVGProps } from 'react';
import {
  BellIcon,
  BoxesIcon,
  CartIcon,
  ChartIcon,
  ClipboardIcon,
  DashboardIcon,
  FileTextIcon,
  GridIcon,
  HistoryIcon,
  MegaphoneIcon,
  ReceiptIcon,
  RotateLeftIcon,
  ShieldCheckIcon,
  SlidersIcon,
  StarOutlineIcon,
  TagIcon,
  TicketIcon,
  TruckIcon,
  UsersIcon,
  WarehouseIcon,
} from '@/components/ui/Icons';

/**
 * Resolves the icon name in the navigation model to a glyph.
 *
 * The model stays serialisable (plain strings), so it can be shared between
 * server and client components without dragging React elements through props.
 */
const ICONS: Record<string, (props: SVGProps<SVGSVGElement>) => React.ReactElement> = {
  dashboard: DashboardIcon,
  receipt: ReceiptIcon,
  card: TagIcon,
  rotate: RotateLeftIcon,
  refund: ClipboardIcon,
  box: BoxesIcon,
  grid: GridIcon,
  warehouse: WarehouseIcon,
  ticket: TicketIcon,
  star: StarOutlineIcon,
  users: UsersIcon,
  file: FileTextIcon,
  bell: BellIcon,
  megaphone: MegaphoneIcon,
  truck: TruckIcon,
  shield: ShieldCheckIcon,
  sliders: SlidersIcon,
  settings: SlidersIcon,
  history: HistoryIcon,
  chart: ChartIcon,
  cart: CartIcon,
};

export function NavIcon({
  name,
  ...props
}: { name: string } & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  const Glyph = ICONS[name] ?? DashboardIcon;
  return <Glyph {...props} />;
}
